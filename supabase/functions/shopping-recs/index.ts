// deno-lint-ignore-file no-explicit-any
/**
 * Shopping Recommendations Edge Function v5.
 *
 * - 신발 카테고리 다양화 (계절별 스니커즈/슬리퍼/쪼리/샌들/부츠/로퍼 등)
 * - 성별 필터 강화 (유니섹스 허용 + 반대 성별 키워드 확장)
 * - 날씨 특수 상황 반영 (비/눈)
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

// 여름/더운 날 신발 pool
const SUMMER_SHOES = [
  // 스니커즈 (여름에도 인기)
  '뉴발란스 530', '뉴발란스 574', '나이키 에어포스', '아디다스 삼바',
  '컨버스 척테일러', '반스 올드스쿨', '반스 슬립온', 'MLB 청키러너',
  // 슬리퍼
  '슬리퍼', '나이키 슬리퍼', '아디다스 슬리퍼', '크록스 슬리퍼',
  '어그 슬리퍼', '버켄스탁 슬리퍼', '뉴발란스 슬리퍼',
  // 쪼리 (플립플롭)
  '쪼리', '하바이아나스 쪼리', '나이키 쪼리', '아디다스 쪼리',
  '오소프레쉬 쪼리',
  // 샌들
  '샌들', '버켄스탁 아리조나', '버켄스탁 보스턴', '테바 샌들',
  '스포츠 샌들', '킨 샌들',
];

// 겨울/추운 날 신발 pool
const WINTER_SHOES = [
  // 스니커즈 (겨울에도)
  '뉴발란스 992', '뉴발란스 993', '나이키 에어맥스', '온러닝 클라우드',
  // 부츠
  '첼시부츠', '워커', '앵클부츠', '롱부츠',
  '팀버랜드 워커', '닥터마틴 1460', '닥터마틴 첼시부츠',
  // 방한부츠
  'ugg 부츠', '어그 클래식', '방한부츠', '스노우부츠',
  '무톤부츠', '레더부츠',
];

// 봄/가을 신발 pool
const SPRING_FALL_SHOES = [
  // 스니커즈 다양
  '뉴발란스 530', '뉴발란스 574', '뉴발란스 993', '나이키 에어포스',
  '나이키 덩크 로우', '나이키 조던1', '나이키 코르테즈',
  '아디다스 삼바', '아디다스 가젤', '아디다스 스탠스미스', '아디다스 슈퍼스타',
  '컨버스 척테일러', '컨버스 원스타',
  '반스 올드스쿨', '반스 어센틱',
  '푸마 스웨이드', '푸마 클라이드',
  '온러닝 클라우드', '아식스 젤라이트3',
  '호카 클리프톤', '살로몬 XT-6',
  // 로퍼
  '로퍼', '페니로퍼', '로우퍼',
  // 얇은 부츠
  '첼시부츠', '앵클부츠', '워커',
];

// 비 오는 날 신발
const RAINY_SHOES = [
  '레인부츠', '레인샌들', '방수 스니커즈', '고무 부츠',
  '어그 방수부츠', '크록스 슬리퍼',
];

// 눈 오는 날 신발
const SNOWY_SHOES = [
  '방한부츠', '스노우부츠', '어그 클래식', '방수 부츠',
  '무톤부츠', '방한 워커',
];

// 트렌디 브랜드 (옷 modifier용)
const TRENDY_BRANDS = [
  '유니클로', '무신사스탠다드', '커버낫', '스파오',
  '지오다노', '탑텐', '에잇세컨즈', '무신사',
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

    if (isToday && !isRefresh) {
      const { data: existing } = await supabase
        .from('daily_shopping')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (existing && Array.isArray(existing.products) && existing.products.length > 0
          && existing.weather_condition === body.weather_condition
          && existing.temp_avg === body.temp_avg
          && existing.gender === (body.gender ?? null)) {
        console.log('[shopping-recs] cache hit');
        return json({ cached: true, ...existing });
      }
    }

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
    // 쿠팡 상품만 필터링 (파트너 커미션 최적화)
    products = products.filter((p) => p.mall === '쿠팡');
    products = filterByGender(products, body.gender);
    products = filterBySeason(products, body);
    products = seededShuffle(products, seed);
    // 12개로 확대
    const finalProducts = products.slice(0, 12);
    console.log('[shopping-recs] total products (Coupang only + filtered):', finalProducts.length);

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
 * 신발은 계절/날씨별 다양한 종류 (스니커즈/슬리퍼/쪼리/부츠 등)
 */
function getCategoriesForWeather(body: RequestBody, seed: string): string[] {
  const isFemale = body.gender === 'female';
  const isMale = body.gender === 'male';
  const prefix = isFemale ? '여성 ' : isMale ? '남성 ' : '';

  const isRainy = body.weather_condition === 'Rain' || body.weather_condition === 'Drizzle';
  const isSnowy = body.weather_condition === 'Snow';

  let clothingPool: string[];

  if (body.season === 'summer' || body.temp_avg >= 25) {
    // 여름 pool - 겨울 아이템(니트·가디건) 완전 제거
    clothingPool = [
      `${prefix}반팔티`,
      `${prefix}반팔셔츠`,
      `${prefix}린넨셔츠`,
      `${prefix}반바지`,
      `${prefix}린넨팬츠`,
      `${prefix}민소매`,
      isFemale ? '여성 원피스' : `${prefix}반팔 셔츠`,
      `${prefix}오버핏 반팔`,
      `${prefix}크롭 티셔츠`,
      `${prefix}베이직 반팔티`,
      `${prefix}폴로셔츠`,
      `${prefix}쿨링 반팔`,
      `${prefix}썸머 반팔`,
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

  const shuffledClothing = seededShuffle(clothingPool, seed);
  // 3 → 5개로 확대 (쿠팡 필터 후에도 충분히 남기 위해)
  const selectedClothing = shuffledClothing.slice(0, 5);

  // 쿠팡 상품 확률 UP + 인기 순위 우선
  const withMods = selectedClothing.map((cat, i) => {
    const modType = hashSeed(seed + `-modtype-${i}`) % 4;
    // 0: '쿠팡 베스트 카테고리' - 쿠팡 인기 상품
    // 1: '쿠팡 랭킹 카테고리' - 쿠팡 판매 순위
    // 2: '쿠팡 브랜드 카테고리' - 쿠팡 트렌디 브랜드
    // 3: '카테고리 판매순위' - 일반 인기
    if (modType === 0) {
      return `쿠팡 베스트 ${cat}`;
    } else if (modType === 1) {
      return `쿠팡 랭킹 ${cat}`;
    } else if (modType === 2) {
      const brandIdx = hashSeed(seed + `-brand-${i}`) % TRENDY_BRANDS.length;
      return `쿠팡 ${TRENDY_BRANDS[brandIdx]} ${cat}`;
    } else {
      return `쿠팡 ${cat} 판매순위`;
    }
  });

  // 신발 pool 선택 (날씨/계절별)
  let shoePool: string[];
  if (isSnowy) {
    shoePool = SNOWY_SHOES;
  } else if (isRainy) {
    shoePool = RAINY_SHOES;
  } else if (body.season === 'summer' || body.temp_avg >= 25) {
    shoePool = SUMMER_SHOES;
  } else if (body.season === 'winter' || body.temp_avg < 10) {
    shoePool = WINTER_SHOES;
  } else {
    shoePool = SPRING_FALL_SHOES;
  }

  const shoeIdx = hashSeed(seed + '-shoe') % shoePool.length;
  const shoe = shoePool[shoeIdx];
  // 신발도 쿠팡 상품 우선 (베스트/인기 modifier)
  const shoeModType = hashSeed(seed + '-shoe-mod') % 3;
  let sneakerQuery: string;
  if (shoeModType === 0) {
    sneakerQuery = prefix ? `쿠팡 ${prefix.trim()} ${shoe}` : `쿠팡 ${shoe}`;
  } else if (shoeModType === 1) {
    sneakerQuery = prefix ? `쿠팡 베스트 ${prefix.trim()} ${shoe}` : `쿠팡 베스트 ${shoe}`;
  } else {
    sneakerQuery = prefix ? `쿠팡 인기 ${prefix.trim()} ${shoe}` : `쿠팡 인기 ${shoe}`;
  }

  return [...withMods, sneakerQuery];
}

/**
 * 성별 필터링 강화 v2.
 * - 반대 성별 명시 키워드 확장 (레이디스, 우먼, 옴므, 신사 등)
 * - 유니섹스/남녀공용은 항상 통과
 * - title + category + brand 모두 검사
 */
function filterByGender(products: Product[], gender?: string): Product[] {
  if (!gender || gender === 'other' || gender === 'prefer_not_to_say') {
    return products;
  }

  const oppositeKeywords = gender === 'female'
    ? [
        // 남성 명시 키워드
        '남성', '남자', '남아', '보이즈', '신사', '옴므', '남성용',
        "men's", 'mens', ' men ', ' men,', 'men ', ' man ',
        'male', '남성 ',
      ]
    : [
        // 여성 명시 키워드
        '여성', '여자', '여아', '걸즈', '레이디', '레이디스', '우먼', '여성용',
        "women's", 'womens', ' women', 'women ', 'woman',
        'female', '여성 ', '레이디 ',
      ];

  return products.filter((p) => {
    const combined = `${p.title} ${p.category || ''} ${p.brand || ''}`.toLowerCase();

    // 유니섹스는 항상 통과 (남녀공용 · 유니섹스 · unisex)
    if (
      combined.includes('남녀공용') ||
      combined.includes('유니섹스') ||
      combined.includes('unisex') ||
      combined.includes('공용')
    ) {
      return true;
    }

    // 반대 성별 키워드 하나라도 있으면 제외
    for (const kw of oppositeKeywords) {
      if (combined.includes(kw.toLowerCase())) return false;
    }
    return true;
  });
}

/**
 * 계절/온도에 맞지 않는 상품 필터링.
 * 여름에 기모/후디/패딩 뜨거나 겨울에 반팔/린넨 뜨는 것 방지.
 */
function filterBySeason(products: Product[], body: RequestBody): Product[] {
  const tempAvg = body.temp_avg;
  const isSummer = body.season === 'summer' || tempAvg >= 22;
  const isVerySummer = tempAvg >= 27;
  const isWinter = body.season === 'winter' || tempAvg < 12;
  const isVeryWinter = tempAvg < 5;

  const excludes: string[] = [];

  if (isSummer) {
    // 여름에 절대 안 되는 것들
    excludes.push(
      '기모', '후디', '후드티', '후드집업',
      '패딩', '롱패딩', '숏패딩', '다운',
      '롱코트', '울코트', '트렌치코트', '더플코트',
      '터틀넥', '두꺼운', '헤비 니트',
      '방한', '털', '무톤', '퍼',
      '캐시미어', '울 스웨터', '기모팬츠', '기모 팬츠',
      '겨울', 'winter', '스노우',
    );
    if (isVerySummer) {
      // 27도+ 진짜 더움: 긴팔·니트·자켓도 제외
      excludes.push(
        '긴팔', '긴 팔', '롱슬리브', 'long sleeve',
        '가디건', '자켓', '재킷', '블레이저',
        '니트', '스웨터', '카디건',
        '집업',
      );
    }
  }

  if (isWinter) {
    // 겨울에 절대 안 되는 것들
    excludes.push(
      '반팔', '민소매', '나시', '탱크탑', '슬리브리스',
      '반바지', '숏팬츠', '핫팬츠', '쇼츠',
      '린넨', '쿨링', '아이스', '냉감',
      '샌들', '슬리퍼', '쪼리', '플립플롭',
      '여름', 'summer', '썸머',
    );
    if (isVeryWinter) {
      excludes.push('얇은', '얇은 니트');
    }
  }

  if (excludes.length === 0) return products;

  return products.filter((p) => {
    const text = `${p.title} ${p.category || ''}`.toLowerCase();
    for (const kw of excludes) {
      if (text.includes(kw.toLowerCase())) return false;
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

  // 인기·판매 순위 반영을 위해 sim(유사도) 정렬 우선
  // display 50 (최대) → 쿠팡 필터 후에도 충분히 확보
  const start = ((hashSeed(seed) % 3) * 20) + 1;
  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=50&start=${start}&sort=sim`;

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

    // 쿠팡 상품 우선 정렬 → 쿠팡 없으면 그 다음
    const coupangItems = items.filter((it: any) => it.mallName === '쿠팡');
    const otherItems = items.filter((it: any) => it.mallName !== '쿠팡');
    const sorted = [...coupangItems, ...otherItems];

    const shuffled = seededShuffle(sorted, seed);
    // 쿠팡 필터 손실 대비 15개 반환
    return shuffled.slice(0, 15).map((item): Product => {
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
 *
 * 쿠팡 파트너 링크 규격:
 *   https://link.coupang.com/re/AFFSDP?lptag=<파트너ID>&pageKey=<상품ID>
 *
 * pageKey는 반드시 숫자 상품 ID여야 함 (URL 넣으면 오류).
 * Naver가 반환한 링크가 www.coupang.com/vp/products/{ID} 형식이면
 * 정규식으로 ID 추출 후 파트너 링크 생성.
 *
 * 그 외 (다른 쇼핑몰 or 쿠팡 ID 추출 실패)는 원본 링크 사용.
 */
function buildAffiliateLink(item: any): string {
  const originalUrl = item.link ?? '';
  const mall = item.mallName ?? '';
  const coupangPartnerId = Deno.env.get('COUPANG_PARTNER_ID');

  if (mall === '쿠팡' && coupangPartnerId) {
    // 쿠팡 URL에서 상품 ID 추출
    // https://www.coupang.com/vp/products/1234567890?... → "1234567890"
    const match = originalUrl.match(/coupang\.com\/vp\/products\/(\d+)/);
    if (match && match[1]) {
      const productId = match[1];
      return `https://link.coupang.com/re/AFFSDP?lptag=${coupangPartnerId}&pageKey=${productId}&subId=nextlook`;
    }
    // ID 추출 실패 시 원본 링크 사용 (안전 fallback)
    console.log('[coupang] product ID not found in URL, using original:', originalUrl.substring(0, 80));
  }

  return originalUrl;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, '').trim();
}
