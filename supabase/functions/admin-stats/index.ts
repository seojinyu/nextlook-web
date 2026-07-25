// deno-lint-ignore-file no-explicit-any
/**
 * 관리자 대시보드 통계 Edge Function.
 *
 * 오직 지정된 관리자 이메일만 접근 가능.
 * service_role 키로 RLS 우회하여 전체 데이터 집계.
 *
 * 환경 변수:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_EMAILS - 콤마로 구분된 관리자 이메일 목록 (예: "seojinyu89@gmail.com")
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminEmails = (Deno.env.get('ADMIN_EMAILS') ?? 'seojinyu89@gmail.com')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // 1. 사용자 인증
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const userEmail = (userData.user.email ?? '').toLowerCase();
    if (!adminEmails.includes(userEmail)) {
      console.warn(`[admin-stats] 접근 거부: ${userEmail}`);
      return json({ error: 'Forbidden' }, 403);
    }

    // 2. service_role로 전체 데이터 조회
    const admin = createClient(supabaseUrl, serviceKey);

    // 날짜 유틸
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30);
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

    // 병렬 조회
    const [
      profilesRes,
      clothesRes,
      wearLogRes,
      shoppingRes,
      dailyActiveRes,
    ] = await Promise.all([
      admin.from('profiles').select('id, email, gender, age_range, signup_source, profile_completed_at, created_at'),
      admin.from('clothes').select('id, user_id, category, primary_color, season_tags, created_at'),
      admin.from('wear_log').select('id, user_id, worn_on, created_at'),
      admin.from('daily_shopping').select('id, user_id, date, created_at'),
      admin.from('wear_log').select('user_id, created_at').gte('created_at', weekAgo.toISOString()),
    ]);

    const profiles = profilesRes.data ?? [];
    const clothes = clothesRes.data ?? [];
    const wearLogs = wearLogRes.data ?? [];
    const shopping = shoppingRes.data ?? [];

    // ── 사용자 통계 ──
    const totalUsers = profiles.length;
    const newToday = profiles.filter((p) => (p.created_at ?? '').startsWith(today)).length;
    const newWeek = profiles.filter((p) => new Date(p.created_at ?? 0) >= weekAgo).length;
    const newMonth = profiles.filter((p) => new Date(p.created_at ?? 0) >= monthAgo).length;

    // 가입 경로
    const bySource: Record<string, number> = { email: 0, google: 0, kakao: 0, unknown: 0 };
    for (const p of profiles) {
      const src = p.signup_source ?? 'unknown';
      bySource[src] = (bySource[src] ?? 0) + 1;
    }

    // 성별
    const byGender: Record<string, number> = { male: 0, female: 0, other: 0, prefer_not_to_say: 0, unset: 0 };
    for (const p of profiles) {
      const g = p.gender ?? 'unset';
      byGender[g] = (byGender[g] ?? 0) + 1;
    }

    // 나이대
    const byAge: Record<string, number> = { '10s': 0, '20s': 0, '30s': 0, '40s': 0, '50s+': 0, unset: 0 };
    for (const p of profiles) {
      const a = p.age_range ?? 'unset';
      byAge[a] = (byAge[a] ?? 0) + 1;
    }

    // ── 활동 통계 ──
    // DAU: 오늘 wear_log 저장한 유니크 사용자
    const dauSet = new Set<string>();
    for (const w of wearLogs) {
      if ((w.created_at ?? '').startsWith(today)) dauSet.add(w.user_id);
    }
    const dau = dauSet.size;

    // WAU: 최근 7일 활동한 유니크 사용자
    const wauSet = new Set<string>();
    for (const w of wearLogs) {
      if (new Date(w.created_at ?? 0) >= weekAgo) wauSet.add(w.user_id);
    }
    const wau = wauSet.size;

    // MAU: 최근 30일
    const mauSet = new Set<string>();
    for (const w of wearLogs) {
      if (new Date(w.created_at ?? 0) >= monthAgo) mauSet.add(w.user_id);
    }
    const mau = mauSet.size;

    // ── 콘텐츠 통계 ──
    const totalClothes = clothes.length;
    const totalWearLogs = wearLogs.length;
    const totalShoppingViews = shopping.length;

    // 카테고리별 옷 개수
    const byCategory: Record<string, number> = { top: 0, bottom: 0, jacket: 0, other: 0 };
    for (const c of clothes) {
      byCategory[c.category ?? 'other'] = (byCategory[c.category ?? 'other'] ?? 0) + 1;
    }

    // 계절별 옷 개수
    const bySeason: Record<string, number> = { spring_fall: 0, summer: 0, winter: 0, unset: 0 };
    for (const c of clothes) {
      const tags = c.season_tags ?? [];
      if (tags.length === 0) bySeason.unset++;
      else {
        for (const t of tags) {
          bySeason[t] = (bySeason[t] ?? 0) + 1;
        }
      }
    }

    // ── 최근 신규 가입자 (10명) ──
    const recentSignups = [...profiles]
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 10)
      .map((p) => ({
        email: p.email ?? '(no email)',
        signup_source: p.signup_source ?? 'unknown',
        gender: p.gender ?? null,
        age_range: p.age_range ?? null,
        created_at: p.created_at,
      }));

    // ── 최근 7일 일별 가입자 ──
    const dailySignups: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const ymd = d.toISOString().slice(0, 10);
      const count = profiles.filter((p) => (p.created_at ?? '').startsWith(ymd)).length;
      dailySignups.push({ date: ymd, count });
    }

    // ── 최근 7일 일별 DAU ──
    const dailyActive: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const ymd = d.toISOString().slice(0, 10);
      const activeSet = new Set<string>();
      for (const w of wearLogs) {
        if ((w.created_at ?? '').startsWith(ymd)) activeSet.add(w.user_id);
      }
      dailyActive.push({ date: ymd, count: activeSet.size });
    }

    // 활성률 (DAU / 전체 * 100)
    const activityRate = totalUsers > 0 ? Math.round((dau / totalUsers) * 100) : 0;

    // 평균 옷장 크기
    const avgClosetSize = totalUsers > 0 ? Math.round((totalClothes / totalUsers) * 10) / 10 : 0;

    return json({
      generated_at: now.toISOString(),
      users: {
        total: totalUsers,
        new_today: newToday,
        new_week: newWeek,
        new_month: newMonth,
        by_source: bySource,
        by_gender: byGender,
        by_age: byAge,
      },
      activity: {
        dau,
        wau,
        mau,
        activity_rate: activityRate,
      },
      content: {
        total_clothes: totalClothes,
        avg_closet_size: avgClosetSize,
        total_wear_logs: totalWearLogs,
        total_shopping_views: totalShoppingViews,
        by_category: byCategory,
        by_season: bySeason,
      },
      recent_signups: recentSignups,
      daily_signups: dailySignups,
      daily_active: dailyActive,
    });
  } catch (e: any) {
    console.error('[admin-stats] error:', e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
