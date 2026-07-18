// deno-lint-ignore-file no-explicit-any
/**
 * Shopping Recommendations Edge Function v3.
 *
 * 개선사항:
 * 1. target_date 파라미터 → 날짜별 다른 상품 (같은 날씨여도)
 * 2. 신발 카테고리는 스니커즈만 (뉴발란스·나이키·아디다스 등)
 * 3. 트렌디 브랜드 modifier (유니클로·무신사·커버낫·스파오)
 * 4. refresh_seed로 매번 다른 상품
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
  age_range?: string;      // 10s | 20s | 30s | 40s | 50s+
  weather_condition: string;
  temp_avg: number;
  season: 'summer' | 'winter' | 'spring_fall';
  target_date?: string;    // YYYY-MM-DD
  refresh_seed?: number;
}

// 스니커즈 브랜드 쿼리 (성별 프리픽스는 아래에서 동적 추가)
const SNEAKER_MODELS = [
  '뉴발란스 스니커즈',
  '뉴발란스 530',
  '뉴발란스 574',
  '뉴발란스 992',
  '나이키 에어포스',
  '나이키 덩크',
  '나이키 조던',
  '나이키 스니커즈',
  '아디다스 삼바',
  '아디다스 가젤',
  '아디다스 스탠스미스',
  '컨버스 척테일러',
  '반스 올드스쿨',
  '반스 어센틱',
  '푸마 스웨이드',
  '온러닝 스니커즈',
];

// 나이대별 브랜드 pool (해당 나이대가 선호하는 브랜드)
const AGE_BRANDS: Record<string, string[]> = {
  '10s': ['에잇세컨즈', '무신사', '스파오', '탑텐', '커버낫', 'MLB'],
  '20s': ['무신사스탠다드', '유니클로', '커버낫', '스파오', '지오다노', '탑텐', '무신사'],
  '30s': ['유니클로', '자라', '망고', '무인양품', '코스', '라코스테', '토미힐피거'],
  '40s': ['유니클로', '자라', '폴로', '라코스테', '헤지스', '빈폴', '타미힐피거'],
  '50s+': ['유니클로', '폴로', '헤지스', '빈폴', '올리비아로렌', 'K2', '노스페이스'],
};

// 나이대별 스타일 modifier
const AGE_STYLE_MODIFIERS: Record<string, string[]> = {
  '10s': ['오버핏', '크롭', '스트릿', '유니크', 'Y2K', '루즈핏'],
  '20s': ['오버핏', '와이드', '스트릿', '트렌디', '미니멀', '슬림'],
  '30s': ['슬림', '베이직', '미니멀', '클래식', '레귤러핏', '모던'],
  '40s': ['클래식', '베이직', '레귤러핏', '컴포트', '슬림'],
  '50s+': ['베이직', '편안한', '레귤러핏', '클래식'],
};

// 나이대별 선호 스니커즈
const AGE_SNEAKERS: Record<string, string[]> = {
  '10s': [
    '나이키 덩크', '나이키 조던', '아디다스 삼바', '아디다스 가젤',
    '뉴발란스 530', '반스 올드스쿨', '컨버스 척테일러',
  ],
  '20s': [
    '뉴발란스 530', '뉴발란스 574', '나이키 에어포스', '나이키 덩크',
    '아디다스 삼바', '아디다스 가젤', '아디다스 스탠스미스', '반스 올드스쿨',
  ],
  '30s': [
    '뉴발란스 574', '뉴발란스 992', '나이키 에어포스', '아디다스 스탠스미스',
    '컨버스 척테일러', '온러닝 스니커즈', '푸마 스웨이드',
  ],
  '40s': [
    '뉴발란스 992', '뉴발란스 993', '아디다스 스탠스미스', '나이키 에어맥스',
    '온러닝 스니커즈', '아식스 스니커즈',
  ],
  '50s+': [
    '뉴발란스 워킹화', '나이키 에어맥스', '아식스 스니커즈', '아디다스 워킹화',
    '컴포트 스니커즈',
  ],
};

// 기본 트렌디 브랜드 (나이대 미설정 시)
const DEFAULT_BRANDS = [
  '유니클로', '무신사스탠다드', '커버낫', '스파오', '지오다노',
];

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
    const targetDate = body.target_date ?? today;
    const isToday = targetDate === today;
    const isRefresh = typeof body.refresh_seed === 'number' && body.refresh_seed > 0;

    // 1) 캐시 확인 (오늘 · refresh 아닐 때만)
    if (isToday && !isRefresh) {
      const { data: existing } = await supabase
        .from('daily_shopping')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (existing && Array.isArray(existing.products) && existing.products.length > 0
          && existing.weather_condition === body.weather_condition
          && existing.temp_avg === body.temp_avg) {
        console.log('[shopping-recs] cache hit (today)');
        return json({ cached: true, ...existing });
      }
    }

    // 2) 시드 생성: target_date + userId + weather + refresh_seed
    // target_date가 다르면 시드도 다름 → 같은 날씨여도 다른 상품
    const seed = `${targetDate}-${userId}-${body.weather_condition}_${body.temp_avg}-${body.refresh_seed ?? 0}`;

    // 3) 카테고리 결정 (신발은 스니커즈만, 다른 아이템은 브랜드 modifier)
    const categories = getCategoriesForWeather(body, seed);
    console.log('[shopping-recs] queries:', categories);

    // 4) 각 카테고리별 네이버 쇼핑 API 병렬 호출
    const results = await Promise.all(
      categories.map((cat, i) => fetchNaverShopping(cat, seed + '-' + i)),
    );

    // 5) 병합 + 중복 제거 + 성별 필터 + 셔플
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
    // 성별 반대 상품 제외 (예: 남성이면 여성 카테고리 제거)
    products = filterByGender(products, body.gender);
    products = seededShuffle(products, seed);
    const finalProducts = products.slice(0, 9);
    console.log('[shopping-recs] total products:', finalProducts.length);

    if (finalProducts.length === 0) {
      return json({ error: '상품을 찾지 못했어요' }, 502);
    }

    // 6) DB 캐싱 (오늘만)
    if (isToday) {
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
    }

    // 미래/과거 날짜는 캐싱 안 함
    return json({ cached: false, products: finalProducts, date: targetDate });
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
 * 날씨·성별 → 카테고리 결정.
 * 신발은 항상 스니커즈 (브랜드 랜덤)
 * 나머지는 랜덤 브랜드 modifier로 트렌디하게
 */
function getCategoriesForWeather(body: RequestBody, seed: string): string[] {
  const isFemale = body.gender === 'female';
  const isMale = body.gender === 'male';
  const prefix = isFemale ? '여성 ' : isMale ? '남성 ' : '';

  const isRainy = body.weather_condition === 'Rain' || body.weather_condition === 'Drizzle';
  const isSnowy = body.weather_condition === 'Snow';

  // 계절별 옷 카테고리 pool (신발 제외)
  let clothingPool: string[];

  if (body.season === 'summer' || body.temp_avg >= 25) {
    clothingPool = [
      `${prefix}반팔티`,
      `${prefix}반팔셔츠`,
      `${prefix}린넨셔츠`,
      `${prefix}반바지`,
      `${prefix}린넨팬츠`,
      `${prefix}민소매`,
      isFemale ? '여성 원피스' : `${prefix}반팔 셔츠`,
      `${prefix}썸머 니트`,
      `${prefix}오버핏 티셔츠`,
      `${prefix}크롭 티셔츠`,
      `${prefix}베이직 티셔츠`,
      `${prefix}폴로셔츠`,
    ];
  } else if (body.season === 'winter' || body.temp_avg < 10) {
    clothingPool = [
      `${prefix}패딩`,
      `${prefix}롱패딩`,
      `${prefix}롱코트`,
      `${prefix}울코트`,
      `${prefix}니트`,
      `${prefix}오버핏 니트`,
      `${prefix}기모팬츠`,
      `${prefix}머플러`,
      `${prefix}후드집업`,
      `${prefix}터틀넥`,
      `${prefix}플리스`,
      `${prefix}가디건 니트`,
    ];
  } else {
    // spring_fall
    clothingPool = [
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
      `${prefix}셔츠`,
      `${prefix}치노팬츠`,
    ];
  }

  // 날씨 modifier (신발 아닌 것만)
  if (isRainy) {
    clothingPool.push(`${prefix}방수자켓`);
  }
  if (isSnowy) {
    clothingPool.push(`${prefix}털장갑`, `${prefix}비니`);
  }

  // 시드 셔플 후 옷 3개 선택
  const shuffledClothing = seededShuffle(clothingPool, seed);
  const selectedClothing = shuffledClothing.slice(0, 3);

  // 나이대별 브랜드/스타일 선택 (미설정이면 기본)
  const ageKey = body.age_range && AGE_BRANDS[body.age_range] ? body.age_range : null;
  const brandPool = ageKey ? AGE_BRANDS[ageKey] : DEFAULT_BRANDS;
  const styleModifiers = ageKey ? AGE_STYLE_MODIFIERS[ageKey] : ['오버핏', '베이직', '슬림'];

  // 옷 카테고리에 나이대 브랜드/스타일 modifier 랜덤 추가
  const withBrands = selectedClothing.map((cat, i) => {
    const modType = hashSeed(seed + `-modtype-${i}`) % 3;
    // 0: 브랜드 추가 (33%)
    // 1: 스타일 modifier (33%)
    // 2: 인기/베스트 modifier (33%)
    if (modType === 0) {
      const brandIdx = hashSeed(seed + `-brand-${i}`) % brandPool.length;
      return `${brandPool[brandIdx]} ${cat}`;
    } else if (modType === 1) {
      const styleIdx = hashSeed(seed + `-style-${i}`) % styleModifiers.length;
      return `${styleModifiers[styleIdx]} ${cat}`;
    } else {
      const modifiers = ['인기', '베스트', '신상'];
      const modIdx = hashSeed(seed + `-trend-${i}`) % modifiers.length;
      return `${cat} ${modifiers[modIdx]}`;
    }
  });

  // 신발: 나이대별 선호 스니커즈에서 선택 (없으면 기본 pool)
  const sneakerPool = ageKey ? AGE_SNEAKERS[ageKey] : SNEAKER_MODELS;
  const shoeIdx = hashSeed(seed + '-shoe') % sneakerPool.length;
  const sneakerModel = sneakerPool[shoeIdx];
  const sneakerQuery = prefix ? `${prefix.trim()} ${sneakerModel}` : sneakerModel;

  return [...withBrands, sneakerQuery];
}

/**
 * 성별 반대 카테고리 상품 필터링.
 * 예: 남성 사용자 → 여성/여자 키워드 있는 상품 제외
 */
function filterByGender(products: Product[], gender?: string): Product[] {
  if (!gender || gender === 'other' || gender === 'prefer_not_to_say') {
    return products; // 성별 미설정 시 필터링 안 함
  }

  const oppositeKeywords = gender === 'female'
    ? ['남성', '남자', '남아', '보이즈', "men's", 'mens', 'male', ' 남 ']
    : ['여성', '여자', '여아', '걸즈', "women's", 'womens', 'female', ' 여 '];

  const oppositeCategories = gender === 'female'
    ? ['남성의류', '남성패션', '남자패션']
    : ['여성의류', '여성패션', '여자패션'];

  return products.filter((p) => {
    const titleLower = p.title.toLowerCase();
    const categoryLower = (p.category || '').toLowerCase();

    // 제목에 반대 성별 키워드 있으면 제외
    for (const kw of oppositeKeywords) {
      if (titleLower.includes(kw.toLowerCase())) return false;
    }

    // 카테고리가 반대 성별이면 제외
    for (const cat of oppositeCategories) {
      if (categoryLower.includes(cat.toLowerCase())) return false;
    }

    return true;
  });
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

async function fetchNaverShopping(query: string, seed: string): Promise<Product[]> {
  const clientId = Deno.env.get('NAVER_CLIENT_ID');
  const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    console.warn('[naver] API keys not configured');
    return [];
  }

  const start = ((hashSeed(seed) % 4) * 10) + 1;
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
