// deno-lint-ignore-file no-explicit-any
/**
 * Shopping Recommendations Edge Function v4.
 *
 * - target_date로 날짜별 다른 상품
 * - 성별 엄격 필터링
 * - 스니커즈는 인기 브랜드 다양하게 랜덤
 * - 트렌디 브랜드 modifier
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
  target_date?: string;
  refresh_seed?: number;
}

// 인기 스니커즈 (다양한 브랜드 · 다양한 모델)
const SNEAKER_MODELS = [
  // 나이키
  '나이키 에어포스',
  '나이키 덩크 로우',
  '나이키 조던1',
  '나이키 에어맥스',
  '나이키 코르테즈',
  '나이키 페가수스',
  // 아디다스
  '아디다스 삼바',
  '아디다스 가젤',
  '아디다스 스탠스미스',
  '아디다스 슈퍼스타',
  '아디다스 캠퍼스',
  '아디다스 오존위브',
  // 뉴발란스
  '뉴발란스 530',
  '뉴발란스 574',
  '뉴발란스 992',
  '뉴발란스 993',
  '뉴발란스 2002R',
  // 컨버스
  '컨버스 척테일러',
  '컨버스 원스타',
  '컨버스 잭퍼셀',
  // 반스
  '반스 올드스쿨',
  '반스 어센틱',
  '반스 슬립온',
  '반스 에라',
  // 푸마
  '푸마 스웨이드',
  '푸마 팜므',
  '푸마 클라이드',
  // 온러닝 (프리미엄)
  '온러닝 클라우드',
  '온러닝 스니커즈',
  // 아식스 (트렌디 리바이벌)
  '아식스 젤카야노',
  '아식스 젤라이트3',
  '아식스 젤퀀텀',
  // 호카 (요즘 인기)
  '호카 본디',
  '호카 클리프톤',
  '호카 스니커즈',
  // 리복 (레트로 트렌드)
  '리복 클럽씨',
  '리복 클래식',
  // 살로몬 (테크 스니커즈)
  '살로몬 XT-6',
  '살로몬 스니커즈',
  // MLB
  'MLB 청키러너',
  'MLB 스니커즈',
];

// 트렌디 브랜드 modifier
const TRENDY_BRANDS = [
  '유니클로',
  '무신사스탠다드',
  '커버낫',
  '스파오',
  '지오다노',
  '탑텐',
  '에잇세컨즈',
  '무신사',
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

    // 캐시 확인 (오늘 · refresh 아닐 때만)
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
        console.log('[shopping-recs] cache hit');
        return json({ cached: true, ...existing });
      }
    }

    // 시드: target_date + userId + weather + refresh_seed
    const seed = `${targetDate}-${userId}-${body.weather_condition}_${body.temp_avg}-${body.refresh_seed ?? 0}`;

    const categories = getCategoriesForWeather(body, seed);
    console.log('[shopping-recs] queries:', categories);

    const results = await Promise.all(
      categories.map((cat, i) => fetchNaverShopping(cat, seed + '-' + i)),
    );

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
    products = filterByGender(products, body.gender);
    products = seededShuffle(products, seed);
    const finalProducts = products.slice(0, 9);
    console.log('[shopping-recs] total products:', finalProducts.length);

    if (finalProducts.length === 0) {
      return json({ error: '상품을 찾지 못했어요' }, 502);
    }

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
 * 성별·날씨 → 카테고리 결정.
 * 신발은 SNEAKER_MODELS(41개 브랜드/모델)에서 시드 랜덤 선택.
 */
function getCategoriesForWeather(body: RequestBody, seed: string): string[] {
  const isFemale = body.gender === 'female';
  const isMale = body.gender === 'male';
  const prefix = isFemale ? '여성 ' : isMale ? '남성 ' : '';

  const isRainy = body.weather_condition === 'Rain' || body.weather_condition === 'Drizzle';
  const isSnowy = body.weather_condition === 'Snow';

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

  if (isRainy) clothingPool.push(`${prefix}방수자켓`);
  if (isSnowy) clothingPool.push(`${prefix}털장갑`, `${prefix}비니`);

  // 옷 3개 선택
  const shuffledClothing = seededShuffle(clothingPool, seed);
  const selectedClothing = shuffledClothing.slice(0, 3);

  // 옷 modifier: 트렌디 브랜드 or 인기/베스트/신상 (랜덤)
  const withMods = selectedClothing.map((cat, i) => {
    const useBrand = (hashSeed(seed + `-brand-${i}`) % 2) === 0; // 50% 브랜드
    if (useBrand) {
      const brandIdx = hashSeed(seed + `-brand-sel-${i}`) % TRENDY_BRANDS.length;
      return `${TRENDY_BRANDS[brandIdx]} ${cat}`;
    }
    const modifiers = ['인기', '베스트', '신상'];
    const modIdx = hashSeed(seed + `-trend-${i}`) % modifiers.length;
    return `${cat} ${modifiers[modIdx]}`;
  });

  // 신발: SNEAKER_MODELS 41개에서 시드 랜덤 선택 (다양한 브랜드)
  const shoeIdx = hashSeed(seed + '-shoe') % SNEAKER_MODELS.length;
  const sneakerModel = SNEAKER_MODELS[shoeIdx];
  const sneakerQuery = prefix ? `${prefix.trim()} ${sneakerModel}` : sneakerModel;

  return [...withMods, sneakerQuery];
}

function filterByGender(products: Product[], gender?: string): Product[] {
  if (!gender || gender === 'other' || gender === 'prefer_not_to_say') {
    return products;
  }
  const oppositeKeywords = gender === 'female'
    ? ['남성', '남자', '남아', '보이즈', "men's", 'mens', 'male']
    : ['여성', '여자', '여아', '걸즈', "women's", 'womens', 'female'];
  const oppositeCategories = gender === 'female'
    ? ['남성의류', '남성패션', '남자패션']
    : ['여성의류', '여성패션', '여자패션'];

  return products.filter((p) => {
    const titleLower = p.title.toLowerCase();
    const categoryLower = (p.category || '').toLowerCase();
    for (const kw of oppositeKeywords) {
      if (titleLower.includes(kw.toLowerCase())) return false;
    }
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
