// deno-lint-ignore-file no-explicit-any
/**
 * Shopping Recommendations Edge Function v2.
 *
 * 개선사항:
 * 1. refresh_seed로 매번 다른 상품 (새로 찾기 버튼)
 * 2. 캐시 키에 weather 포함 (날짜별 다른 상품)
 * 3. 트렌디 키워드 자동 추가 (인기·베스트·신상)
 * 4. 네이버 API 랜덤 페이지네이션
 * 5. 큰 pool에서 랜덤 3~9개 선택
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

interface Product {
  id: string;
  title: string;
  image: string;
  price: number;
  mall: string;
  category: string;
  brand?: string;
  productUrl: string;
  originalUrl: string;
}

interface RequestBody {
  gender?: string;
  weather_condition: string;
  temp_avg: number;
  season: 'summer' | 'winter' | 'spring_fall';
  refresh_seed?: number;  // 클라이언트에서 보내는 랜덤값 (새로 찾기용)
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

    // 캐시 키에 weather + refresh_seed 반영
    // refresh_seed가 있으면 캐시 skip (매번 새로 fetch)
    const isRefresh = typeof body.refresh_seed === 'number' && body.refresh_seed > 0;
    const weatherKey = `${body.weather_condition}_${body.temp_avg}`;

    // 1) 캐시 확인 (refresh 아닐 때만)
    if (!isRefresh) {
      const { data: existing } = await supabase
        .from('daily_shopping')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      // 캐시 있고 같은 날씨 조건이면 반환
      if (existing && Array.isArray(existing.products) && existing.products.length > 0
          && existing.weather_condition === body.weather_condition
          && existing.temp_avg === body.temp_avg) {
        console.log('[shopping-recs] cache hit');
        return json({ cached: true, ...existing });
      }
      // 캐시 있지만 날씨 다름 → 삭제하고 새로 fetch
      if (existing) {
        console.log('[shopping-recs] cache invalid (weather changed), regenerating');
      }
    } else {
      console.log('[shopping-recs] refresh requested, bypassing cache');
    }

    // 2) 시드 생성: 날짜 + userId + weather + refresh_seed
    const seed = `${today}-${userId}-${weatherKey}-${body.refresh_seed ?? 0}`;

    // 3) 카테고리 결정 + 트렌디 키워드 추가
    const categories = getCategoriesForWeather(body, seed);
    console.log('[shopping-recs] queries:', categories);

    // 4) 각 카테고리별 네이버 쇼핑 API 병렬 호출
    const results = await Promise.all(
      categories.map((cat, i) => fetchNaverShopping(cat, seed + '-' + i)),
    );

    // 5) 병합 + 중복 제거 + 셔플
    const seen = new Set<string>();
    let products: Product[] = [];
    for (const items of results) {
      for (const p of items) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          products.push(p);
        }
      }
    }
    products = seededShuffle(products, seed);
    const finalProducts = products.slice(0, 9);
    console.log('[shopping-recs] total products:', finalProducts.length);

    if (finalProducts.length === 0) {
      return json({ error: '상품을 찾지 못했어요' }, 502);
    }

    // 6) DB 캐싱 (기존 것 덮어쓰기)
    const { data: inserted, error: insertErr } = await supabase
      .from('daily_shopping')
      .upsert(
        {
          user_id: userId,
          date: today,
          gender: body.gender ?? null,
          weather_condition: body.weather_condition,
          temp_avg: body.temp_avg,
          season: body.season,
          products: finalProducts,
        },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single();

    if (insertErr) {
      console.warn('[shopping-recs] upsert failed:', insertErr);
      return json({ cached: false, products: finalProducts, date: today });
    }

    return json({ cached: false, ...inserted });
  } catch (e: any) {
    console.error('[shopping-recs] error:', e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/**
 * 날씨·성별 → 트렌디 검색 카테고리 결정.
 * 인기·베스트·신상 modifier 랜덤 추가.
 */
function getCategoriesForWeather(body: RequestBody, seed: string): string[] {
  const isFemale = body.gender === 'female';
  const isMale = body.gender === 'male';
  const prefix = isFemale ? '여성 ' : isMale ? '남성 ' : '';

  const isRainy = body.weather_condition === 'Rain' || body.weather_condition === 'Drizzle';
  const isSnowy = body.weather_condition === 'Snow';

  // 계절별 카테고리 pool
  let pool: string[];

  if (body.season === 'summer' || body.temp_avg >= 25) {
    pool = [
      `${prefix}반팔티`,
      `${prefix}반팔셔츠`,
      `${prefix}린넨셔츠`,
      `${prefix}반바지`,
      `${prefix}린넨팬츠`,
      `${prefix}슬리퍼`,
      `${prefix}샌들`,
      `${prefix}민소매`,
      isFemale ? '여성 원피스' : `${prefix}스니커즈`,
      `${prefix}썸머니트`,
      `${prefix}오버핏 티셔츠`,
      `${prefix}크롭 티셔츠`,
    ];
  } else if (body.season === 'winter' || body.temp_avg < 10) {
    pool = [
      `${prefix}패딩`,
      `${prefix}롱패딩`,
      `${prefix}롱코트`,
      `${prefix}울코트`,
      `${prefix}니트`,
      `${prefix}오버핏 니트`,
      `${prefix}기모팬츠`,
      `${prefix}머플러`,
      `${prefix}부츠`,
      `${prefix}첼시부츠`,
      `${prefix}후드집업`,
      `${prefix}터틀넥`,
    ];
  } else {
    // spring_fall
    pool = [
      `${prefix}가디건`,
      `${prefix}오버핏 가디건`,
      `${prefix}자켓`,
      `${prefix}블레이저`,
      `${prefix}트렌치코트`,
      `${prefix}맨투맨`,
      `${prefix}후드티`,
      `${prefix}청바지`,
      `${prefix}와이드 팬츠`,
      `${prefix}슬랙스`,
      `${prefix}블라우스`,
      `${prefix}긴팔티`,
      `${prefix}스니커즈`,
      `${prefix}로퍼`,
    ];
  }

  // 날씨 modifier
  if (isRainy) {
    pool.push(`${prefix}레인부츠`, '3단 우산', `${prefix}방수자켓`);
  }
  if (isSnowy) {
    pool.push(`${prefix}방한부츠`, `${prefix}털장갑`, `${prefix}비니`);
  }

  // 시드 기반 셔플 (매번 다른 카테고리)
  const shuffled = seededShuffle(pool, seed);
  const selected = shuffled.slice(0, 4);

  // 트렌디 키워드 자동 추가 (일부 카테고리에만)
  // 랜덤하게 '인기', '베스트', '신상' 추가
  const trendModifiers = ['인기', '베스트', '신상', ''];
  return selected.map((cat, i) => {
    const modIdx = hashSeed(seed + `-trend-${i}`) % trendModifiers.length;
    const mod = trendModifiers[modIdx];
    return mod ? `${cat} ${mod}` : cat;
  });
}

/** 문자열 → 양수 해시 */
function hashSeed(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 시드 기반 Fisher-Yates 셔플 */
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
 * 네이버 쇼핑 API 호출.
 * 시드 기반 랜덤 페이지네이션 + 정렬 다양화.
 */
async function fetchNaverShopping(query: string, seed: string): Promise<Product[]> {
  const clientId = Deno.env.get('NAVER_CLIENT_ID');
  const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    console.warn('[naver] API keys not configured');
    return [];
  }

  // 시드 기반 랜덤 페이지 (1~4)
  const start = ((hashSeed(seed) % 4) * 10) + 1;
  // 정렬 랜덤: sim(유사도) 또는 date(최신)
  const sort = (hashSeed(seed + '-sort') % 2 === 0) ? 'sim' : 'date';

  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=20&start=${start}&sort=${sort}`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });
    if (!res.ok) {
      console.warn('[naver] failed:', res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const items = (data.items || []) as any[];

    // 시드 셔플 후 3개 선택
    const shuffled = seededShuffle(items, seed);
    return shuffled.slice(0, 3).map((item): Product => {
      const productUrl = buildAffiliateLink(item);
      return {
        id: String(item.productId ?? item.link),
        title: stripHtml(item.title ?? ''),
        image: item.image ?? '',
        price: parseInt(item.lprice ?? '0', 10),
        mall: item.mallName ?? '기타',
        category: item.category3 ?? item.category2 ?? item.category1 ?? '',
        brand: item.brand || undefined,
        productUrl,
        originalUrl: item.link ?? '',
      };
    });
  } catch (e) {
    console.warn('[naver] error:', e);
    return [];
  }
}

function buildAffiliateLink(item: any): string {
  const originalUrl = item.link ?? '';
  const mall = item.mallName ?? '';
  const title = stripHtml(item.title ?? '');
  const coupangPartnerId = Deno.env.get('COUPANG_PARTNER_ID');

  if (mall === '쿠팡' && coupangPartnerId) {
    const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(title)}`;
    return `https://link.coupang.com/re/AFFSDP?lptag=${coupangPartnerId}&pageKey=${encodeURIComponent(searchUrl)}&subId=nextlook`;
  }

  return originalUrl;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, '').trim();
}
