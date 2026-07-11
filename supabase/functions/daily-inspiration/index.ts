// deno-lint-ignore-file no-explicit-any
/**
 * Daily Inspiration Edge Function (v2).
 *
 * 하루에 3가지 다른 쿼리로 각 10장씩 fetch → 총 30장 pool.
 * 클라이언트는 이 pool에서 랜덤 3장 선택 표시.
 * 새로고침으로 pool 안에서 rotation.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

interface InspirationImage {
  url: string;
  thumb: string;
  source: 'unsplash' | 'pexels';
  alt: string;
  photographer: string;
  credit_url: string;
}

interface RequestBody {
  gender?: string;
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const body: RequestBody = await req.json();
    const today = new Date().toISOString().slice(0, 10);

    // 1) 캐시 확인
    const { data: existing } = await supabase
      .from('daily_inspirations')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existing && Array.isArray(existing.images) && existing.images.length >= 10) {
      return json({ cached: true, ...existing });
    }

    // 2) 3개 쿼리 만들기 (매일 다른 조합)
    const dateSeed = `${today}-${userId}`;
    const queries = buildQueries(body, dateSeed);
    console.log('[daily-inspiration] queries:', queries);

    // 3) 각 쿼리에서 병렬로 10장씩 fetch
    const results = await Promise.all(
      queries.map((q, idx) => fetchPoolForQuery(q, 10, dateSeed + `-q${idx}`)),
    );

    // 4) 합쳐서 중복 제거 (같은 URL은 제외)
    const seen = new Set<string>();
    const pool: InspirationImage[] = [];
    for (const imgs of results) {
      for (const img of imgs) {
        if (!seen.has(img.url)) {
          seen.add(img.url);
          pool.push(img);
        }
      }
    }
    console.log('[daily-inspiration] pool size:', pool.length);

    if (pool.length === 0) return json({ error: '이미지를 찾지 못했어요' }, 502);

    // 5) DB 저장 (오늘 캐시 있으면 덮어쓰기)
    const { data: inserted, error: insertErr } = await supabase
      .from('daily_inspirations')
      .upsert(
        {
          user_id: userId,
          date: today,
          gender: body.gender ?? null,
          weather_condition: body.weather_condition,
          temp_avg: body.temp_avg,
          season: body.season,
          images: pool,
        },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single();

    if (insertErr) {
      console.warn('[daily-inspiration] upsert failed:', insertErr);
      return json({ cached: false, images: pool, date: today });
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

/** 성별 · 계절 · 날씨 → 3가지 다양한 쿼리 생성 */
function buildQueries(body: RequestBody, dateSeed: string): string[] {
  const genderPart =
    body.gender === 'male' ? 'men' :
    body.gender === 'female' ? 'women' : 'unisex';

  const seasonPart =
    body.season === 'summer' ? 'summer' :
    body.season === 'winter' ? 'winter' : 'autumn';

  const conditionPart = weatherKeyword(body.weather_condition, body.temp_avg);
  const tempPart = temperatureKeyword(body.temp_avg);

  // 카테고리별 스타일 뱅크 (9개 카테고리, 각 3개 스타일)
  const styleBanks: string[][] = [
    ['casual', 'daily', 'weekend'],
    ['streetwear', 'urban', 'street style'],
    ['smart casual', 'business casual', 'office look'],
    ['minimal', 'clean', 'simple'],
    ['trendy', 'fashion', 'modern'],
    ['chic', 'elegant', 'refined'],
    ['lookbook', 'ootd', 'style'],
    ['vintage', 'retro', 'classic'],
    ['sporty', 'athleisure', 'active'],
  ];

  // 날짜 시드로 3개 서로 다른 카테고리 선택
  const shuffledCategories = seededShuffle([...Array(styleBanks.length).keys()], dateSeed);
  const chosen = shuffledCategories.slice(0, 3);

  return chosen.map((catIdx, i) => {
    const bank = styleBanks[catIdx];
    const styleIdx = hashSeed(dateSeed + `-style-${i}`) % bank.length;
    const style = bank[styleIdx];
    return `${genderPart} ${seasonPart} ${conditionPart} ${tempPart} ${style} outfit fashion`
      .replace(/\s+/g, ' ')
      .trim();
  });
}

function weatherKeyword(condition: string, temp: number): string {
  if (condition === 'Rain' || condition === 'Drizzle') return 'rainy';
  if (condition === 'Snow') return 'snowy winter';
  if (condition === 'Thunderstorm') return 'rainy';
  if (condition === 'Clouds') return 'cloudy';
  if (condition === 'Clear' && temp >= 25) return 'sunny';
  return '';
}

function temperatureKeyword(temp: number): string {
  if (temp >= 30) return 'summer heat lightweight';
  if (temp >= 25) return 'warm sunny';
  if (temp >= 20) return 'mild';
  if (temp >= 15) return 'cool layered';
  if (temp >= 10) return 'chilly jacket';
  if (temp >= 5) return 'cold winter coat';
  return 'freezing puffer';
}

function hashSeed(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let seedNum = hashSeed(seed);
  for (let i = a.length - 1; i > 0; i--) {
    seedNum = (seedNum * 9301 + 49297) % 233280;
    const j = seedNum % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 하나의 쿼리에서 넉넉히 fetch (Unsplash + Pexels 각각 랜덤 페이지) */
async function fetchPoolForQuery(query: string, count: number, seed: string): Promise<InspirationImage[]> {
  const pageU = (hashSeed(seed + '-u') % 4) + 1;
  const pageP = (hashSeed(seed + '-p') % 4) + 1;

  const [unsplash, pexels] = await Promise.all([
    fetchUnsplash(query, Math.ceil(count / 2) + 2, pageU).catch((e) => {
      console.warn('[unsplash] fail:', e);
      return [] as InspirationImage[];
    }),
    fetchPexels(query, Math.ceil(count / 2) + 2, pageP).catch((e) => {
      console.warn('[pexels] fail:', e);
      return [] as InspirationImage[];
    }),
  ]);

  const combined = [...unsplash, ...pexels];
  return seededShuffle(combined, seed).slice(0, count);
}

async function fetchUnsplash(query: string, perPage: number, page: number): Promise<InspirationImage[]> {
  const key = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!key) return [];
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
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

async function fetchPexels(query: string, perPage: number, page: number): Promise<InspirationImage[]> {
  const key = Deno.env.get('PEXELS_API_KEY');
  if (!key) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: key } });
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
