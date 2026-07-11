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

    // 2) 없으면 API로 fetch (날짜 + user_id를 시드로 사용해 다양성 확보)
    const dateSeed = `${today}-${userId}`;
    const query = buildQuery(body, dateSeed);
    console.log('[daily-inspiration] query:', query, '/ seed:', dateSeed);

    const images = await fetchImages(query, 3, dateSeed);

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

/** 성별 · 계절 · 날씨 → 다양성 있는 검색 쿼리 */
function buildQuery(body: RequestBody, dateSeed: string): string {
  const genderPart =
    body.gender === 'male' ? 'men' :
    body.gender === 'female' ? 'women' : 'unisex';

  const seasonPart =
    body.season === 'summer' ? 'summer' :
    body.season === 'winter' ? 'winter' : 'autumn';

  const conditionPart = weatherKeyword(body.weather_condition, body.temp_avg);
  const tempPart = temperatureKeyword(body.temp_avg);

  // 날짜를 시드로 결정적 랜덤 → 같은 날짜엔 같은 스타일, 다른 날짜엔 다른 스타일
  const styles = [
    'casual', 'street style', 'smart casual', 'minimal',
    'trendy', 'modern', 'chic', 'daily', 'lookbook',
  ];
  const styleIdx = hashSeed(dateSeed + '-style') % styles.length;
  const style = styles[styleIdx];

  const settings = ['ootd', 'fashion', 'style', 'outfit'];
  const settingIdx = hashSeed(dateSeed + '-setting') % settings.length;
  const setting = settings[settingIdx];

  return `${genderPart} ${seasonPart} ${conditionPart} ${tempPart} ${style} ${setting}`
    .replace(/\s+/g, ' ')
    .trim();
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

/** 문자열 → 양수 해시 (결정적 랜덤 시드) */
function hashSeed(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Fisher-Yates 셔플 (시드 기반, 결정적) */
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

/**
 * Unsplash + Pexels에서 넉넉하게 fetch → 시드 기반 셔플 → 3장 선택.
 * 같은 검색어라도 매일 다른 페이지·다른 순서로 뽑아서 결과에 다양성.
 */
async function fetchImages(query: string, count: number, dateSeed: string): Promise<InspirationImage[]> {
  // 날짜별로 다른 페이지 (1~4) 요청 → 매일 다른 사진 pool
  const page = (hashSeed(dateSeed + '-page') % 4) + 1;

  const [unsplash, pexels] = await Promise.all([
    fetchUnsplash(query, 15, page).catch((e) => {
      console.warn('[unsplash] fail:', e);
      return [] as InspirationImage[];
    }),
    fetchPexels(query, 15, page).catch((e) => {
      console.warn('[pexels] fail:', e);
      return [] as InspirationImage[];
    }),
  ]);

  // 두 소스 합쳐서 시드 셔플 후 count 개 선택
  const combined = [...unsplash, ...pexels];
  const shuffled = seededShuffle(combined, dateSeed);
  return shuffled.slice(0, count);
}

async function fetchUnsplash(query: string, perPage: number, page: number): Promise<InspirationImage[]> {
  const key = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!key) {
    console.warn('[unsplash] no key');
    return [];
  }
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait`;
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

async function fetchPexels(query: string, perPage: number, page: number): Promise<InspirationImage[]> {
  const key = Deno.env.get('PEXELS_API_KEY');
  if (!key) {
    console.warn('[pexels] no key');
    return [];
  }
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait`;
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
