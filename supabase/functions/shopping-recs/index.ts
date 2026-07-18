// deno-lint-ignore-file no-explicit-any
/**
 * Shopping Recommendations Edge Function.
 *
 * 성별·날씨·계절 기반으로 네이버 쇼핑에서 오늘의 아이템 추천.
 * 하루 1회 API 호출 후 daily_shopping 테이블에 캐싱.
 *
 * 환경 변수:
 *   NAVER_CLIENT_ID
 *   NAVER_CLIENT_SECRET
 *   COUPANG_PARTNER_ID  (승인 후 등록, 없으면 네이버 링크만)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

interface Product {
  id: string;           // productId
  title: string;        // 상품명 (HTML 태그 제거됨)
  image: string;        // 이미지 URL
  price: number;        // 가격
  mall: string;         // 쇼핑몰 이름 (쿠팡, 지마켓 등)
  category: string;     // 카테고리
  brand?: string;
  productUrl: string;   // 실제 이동 URL (파트너 링크 or 네이버)
  originalUrl: string;  // 원본 상품 URL (네이버)
}

interface RequestBody {
  gender?: string;              // male | female | other | prefer_not_to_say
  weather_condition: string;    // Clear, Clouds, Rain, ...
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

    // 1) 오늘 캐시 확인
    const { data: existing } = await supabase
      .from('daily_shopping')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existing && Array.isArray(existing.products) && existing.products.length > 0) {
      return json({ cached: true, ...existing });
    }

    // 2) 날씨 → 카테고리 결정
    const categories = getCategoriesForWeather(body);
    console.log('[shopping-recs] categories:', categories);

    // 3) 각 카테고리별 네이버 쇼핑 API 호출 (병렬)
    const results = await Promise.all(
      categories.map((cat) => fetchNaverShopping(cat, body.gender)),
    );

    // 4) 결과 병합 + 중복 제거
    const seen = new Set<string>();
    const products: Product[] = [];
    for (const items of results) {
      for (const p of items) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          products.push(p);
        }
      }
    }

    // 최대 9개
    const finalProducts = products.slice(0, 9);
    console.log('[shopping-recs] total products:', finalProducts.length);

    if (finalProducts.length === 0) {
      return json({ error: '상품을 찾지 못했어요' }, 502);
    }

    // 5) DB 캐싱
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
 * 날씨·성별 → 검색 카테고리 목록 결정.
 * 매일 다른 상품이 나오도록 카테고리 pool에서 랜덤 선택.
 */
function getCategoriesForWeather(body: RequestBody): string[] {
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
      `${prefix}린넨셔츠`,
      `${prefix}반바지`,
      `${prefix}린넨팬츠`,
      `${prefix}슬리퍼`,
      `${prefix}샌들`,
      `${prefix}민소매`,
      isFemale ? '여성 원피스' : `${prefix}스니커즈`,
      `${prefix}썸머니트`,
    ];
  } else if (body.season === 'winter' || body.temp_avg < 10) {
    pool = [
      `${prefix}패딩`,
      `${prefix}롱코트`,
      `${prefix}니트`,
      `${prefix}기모팬츠`,
      `${prefix}머플러`,
      `${prefix}부츠`,
      `${prefix}장갑`,
      `${prefix}후드집업`,
      `${prefix}터틀넥`,
    ];
  } else {
    // spring_fall
    pool = [
      `${prefix}가디건`,
      `${prefix}자켓`,
      `${prefix}트렌치코트`,
      `${prefix}맨투맨`,
      `${prefix}청바지`,
      `${prefix}슬랙스`,
      `${prefix}블라우스`,
      `${prefix}긴팔티`,
      `${prefix}스니커즈`,
    ];
  }

  // 날씨 modifier
  if (isRainy) {
    pool.push(`${prefix}레인부츠`, '우산', `${prefix}방수자켓`);
  }
  if (isSnowy) {
    pool.push(`${prefix}방한부츠`, `${prefix}털장갑`, `${prefix}비니`);
  }

  // 매일 다른 카테고리 나오게 시드 셔플
  const dateSeed = new Date().toISOString().slice(0, 10);
  const shuffled = seededShuffle(pool, dateSeed);

  // 3~4개 선택
  return shuffled.slice(0, 4);
}

/** 시드 기반 셔플 (매일 다른 카테고리) */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  let seedNum = Math.abs(hash);
  for (let i = a.length - 1; i > 0; i--) {
    seedNum = (seedNum * 9301 + 49297) % 233280;
    const j = seedNum % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 네이버 쇼핑 API 호출.
 * https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
 */
async function fetchNaverShopping(query: string, _gender?: string): Promise<Product[]> {
  const clientId = Deno.env.get('NAVER_CLIENT_ID');
  const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    console.warn('[naver] API keys not configured');
    return [];
  }

  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=15&sort=sim`;

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

    return items.slice(0, 3).map((item): Product => {
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

/**
 * 어필리에이트 링크 생성.
 * - 쿠팡 상품이면 쿠팡 파트너 검색 링크 (승인 후 활성화)
 * - 그 외는 네이버 상품 페이지 링크 (기본)
 */
function buildAffiliateLink(item: any): string {
  const originalUrl = item.link ?? '';
  const mall = item.mallName ?? '';
  const title = stripHtml(item.title ?? '');
  const coupangPartnerId = Deno.env.get('COUPANG_PARTNER_ID');

  // 쿠팡 상품이고 파트너 ID 있으면 파트너 링크 사용
  if (mall === '쿠팡' && coupangPartnerId) {
    const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(title)}`;
    return `https://link.coupang.com/re/AFFSDP?lptag=${coupangPartnerId}&pageKey=${encodeURIComponent(searchUrl)}&subId=nextlook`;
  }

  // 그 외는 네이버 원본 링크
  return originalUrl;
}

/** HTML 태그 제거 (네이버 API 결과의 <b> 태그) */
function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, '').trim();
}
