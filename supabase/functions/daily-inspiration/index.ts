// deno-lint-ignore-file no-explicit-any
/**
 * Daily Inspiration Edge Function.
 *
 * 사용자의 오늘 날짜 · 성별 · 날씨에 맞는 코디 이미지 3장을
 * Unsplash + Pexels에서 fetch해 daily_inspirations에 캐싱 후 반환.
 *
 * 같은 날 재호출 시 캐시된 결과 반환 (API 재호출 안 함).
 *
 * 환경 변수 필요:
 *   UNSPLASH_ACCESS_KEY
 *   PEXELS_API_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

interface InspirationImage {
  url: string;         // 큰 이미지 URL
  thumb: string;       // 썸네일 URL
  source: 'unsplash' | 'pexels';
  alt: string;
  photographer: string;
  credit_url: string;  // 원본 페이지 링크
}

interface RequestBody {
  gender?: string;       // 'male' | 'female' | 'other' | 'prefer_not_to_say'
  weather_condition: string;
  temp_avg: number;
  season: 'summer' | 'winter' | 'spring_fall';
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = userData.user.id;

    const body: RequestBody = await req.json();
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    // 1) 오늘 캐시 있는지 확인
    const { data: existing } = await supabase
      .from('daily_inspirations')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      return json({ cached: true, ...existing });
    }

    // 2) 없으면 API로 fetch
    const query = buildQuery(body);
    console.log('[daily-inspiration] query:', query);

    const images = await fetchImages(query, 3);

    if (images.length === 0) {
      return json({ error: '이미지를 찾지 못했어요' }, 502);
    }

    // 3) DB에 캐시
    const { data: inserted, error: insertErr } = await supabase
      .from('daily_inspirations')
      .insert({
        user_id: userId,
        date: today,
        gender: body.gender ?? null,
        weather_condition: body.weather_condition,
        temp_avg: body.temp_avg,
        season: body.season,
        images,
      })
      .select()
      .single();

    if (insertErr) {
      console.warn('[daily-inspiration] insert failed:', insertErr);
      return json({ cached: false, images, date: today });
    }

    return json({ cached: false, ...inserted });
  } catch (e: any) {
    console.error('[daily-inspiration] error:', e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/** 성별 · 계절 · 날씨 → 검색 쿼리 */
function buildQuery(body: RequestBody): string {
  const genderPart =
    body.gender === 'male' ? 'men' :
    body.gender === 'female' ? 'women' : 'unisex';

  const seasonPart =
    body.season === 'summer' ? 'summer' :
    body.season === 'winter' ? 'winter' : 'autumn';

  const conditionPart = weatherKeyword(body.weather_condition, body.temp_avg);

  // 스타일 다양성을 위한 랜덤 요소
  const styles = ['casual', 'street', 'smart casual', 'minimal'];
  const style = styles[Math.floor(Math.random() * styles.length)];

  return `${genderPart} ${seasonPart} ${conditionPart} ${style} outfit fashion`.trim();
}

function weatherKeyword(condition: string, temp: number): string {
  if (condition === 'Rain' || condition === 'Drizzle') return 'rainy day';
  if (condition === 'Snow') return 'snowy';
  if (condition === 'Thunderstorm') return 'rainy';
  if (temp >= 28) return 'hot weather';
  if (temp <= 5) return 'cold weather';
  return '';
}

/** Unsplash + Pexels에서 각각 fetch해 병합 */
async function fetchImages(query: string, count: number): Promise<InspirationImage[]> {
  const [unsplash, pexels] = await Promise.all([
    fetchUnsplash(query, Math.ceil(count / 2)).catch((e) => {
      console.warn('[unsplash] fail:', e);
      return [] as InspirationImage[];
    }),
    fetchPexels(query, Math.ceil(count / 2) + 1).catch((e) => {
      console.warn('[pexels] fail:', e);
      return [] as InspirationImage[];
    }),
  ]);

  // 두 소스 결과 교차 배치
  const merged: InspirationImage[] = [];
  const maxLen = Math.max(unsplash.length, pexels.length);
  for (let i = 0; i < maxLen; i++) {
    if (unsplash[i]) merged.push(unsplash[i]);
    if (pexels[i]) merged.push(pexels[i]);
  }
  return merged.slice(0, count);
}

async function fetchUnsplash(query: string, perPage: number): Promise<InspirationImage[]> {
  const key = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!key) {
    console.warn('[unsplash] no key');
    return [];
  }
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
  });
  if (!res.ok) throw new Error(`Unsplash ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r: any): InspirationImage => ({
    url: r.urls?.regular ?? r.urls?.small,
    thumb: r.urls?.small ?? r.urls?.thumb,
    source: 'unsplash',
    alt: r.alt_description ?? r.description ?? '',
    photographer: r.user?.name ?? 'Unknown',
    credit_url: r.links?.html ?? 'https://unsplash.com',
  }));
}

async function fetchPexels(query: string, perPage: number): Promise<InspirationImage[]> {
  const key = Deno.env.get('PEXELS_API_KEY');
  if (!key) {
    console.warn('[pexels] no key');
    return [];
  }
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`;
  const res = await fetch(url, {
    headers: { Authorization: key },
  });
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  const data = await res.json();
  return (data.photos || []).map((p: any): InspirationImage => ({
    url: p.src?.large ?? p.src?.medium,
    thumb: p.src?.medium ?? p.src?.small,
    source: 'pexels',
    alt: p.alt ?? '',
    photographer: p.photographer ?? 'Unknown',
    credit_url: p.url ?? 'https://www.pexels.com',
  }));
}
