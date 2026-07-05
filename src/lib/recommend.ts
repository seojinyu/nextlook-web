import type { Clothing, OutfitSuggestion, WeatherSnapshot } from './types';

// 색상 그룹 — 같은 그룹끼리 또는 뉴트럴과 조합 시 매칭됨
const COLOR_GROUPS: Record<string, string[]> = {
  // 모든 색과 잘 어울리는 뉴트럴 (블랙/화이트/그레이/베이지/크림)
  neutral: ['#000000', '#FFFFFF', '#888888', '#D7C9AA', '#CCCCCC', '#444444', '#FFFDD0'],
  // 차가운 톤 (네이비/블루/퍼플/민트)
  cool: ['#1B2A4A', '#2962FF', '#82B1FF', '#7B1FA2', '#98FF98'],
  // 따뜻한 톤 (레드/오렌지/옐로우/핑크/와인)
  warm: ['#D32F2F', '#EF6C00', '#FDD835', '#F48FB1', '#722F37'],
  // 어스 톤 (브라운/카키/그린/베이지)
  earth: ['#5D4037', '#6B7B3A', '#2E7D32'],
};

function getColorGroup(hex: string): string {
  for (const [group, colors] of Object.entries(COLOR_GROUPS)) {
    if (colors.includes(hex)) return group;
  }
  return 'neutral';
}

function colorsMatch(a: string, b: string): boolean {
  const ga = getColorGroup(a);
  const gb = getColorGroup(b);
  if (ga === 'neutral' || gb === 'neutral') return true;
  return ga === gb;
}

function fitsWeather(item: Clothing, weather: WeatherSnapshot): boolean {
  if (item.min_temp_c == null || item.max_temp_c == null) return true;
  // 평균 온도가 옷의 적정 범위 안에 있어야 함
  const avgTemp = (weather.temp_min_c + weather.temp_max_c) / 2;
  return item.min_temp_c <= avgTemp && item.max_temp_c >= avgTemp;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateRecommendations(
  clothes: Clothing[],
  weather: WeatherSnapshot,
  recentIds: Set<string>
): OutfitSuggestion[] {
  const available = clothes.filter((c) => !recentIds.has(c.id));
  const tops = shuffle(available.filter((c) => c.category === 'top' && fitsWeather(c, weather)));
  const bottoms = shuffle(available.filter((c) => c.category === 'bottom' && fitsWeather(c, weather)));
  const jackets = shuffle(available.filter((c) => c.category === 'jacket' && fitsWeather(c, weather)));

  const tempDiff = weather.temp_max_c - weather.temp_min_c;
  const needJacket = weather.temp_min_c < 15 || tempDiff >= 10; // 최저 15°C 미만 또는 일교차 10°C 이상
  const isRainy = weather.precipitation_mm >= 1;
  const isWindy = weather.wind_mps >= 7;

  const suggestions: OutfitSuggestion[] = [];
  const usedPairs = new Set<string>();
  const usedJackets = new Set<string>();

  function buildReason(top: Clothing, bottom: Clothing, jacket: Clothing | null): string {
    const avgTemp = Math.round((weather.temp_min_c + weather.temp_max_c) / 2);
    const parts: string[] = [];

    // 온도 설명
    parts.push(`평균 ${avgTemp}°C (${weather.temp_min_c}°~${weather.temp_max_c}°C)에 적합`);

    // 색상 배색 분석
    if (top.primary_color && bottom.primary_color) {
      const tg = getColorGroup(top.primary_color);
      const bg = getColorGroup(bottom.primary_color);
      if (tg === 'neutral' && bg === 'neutral') parts.push('뉴트럴 배색');
      else if (tg === 'neutral' || bg === 'neutral') parts.push('뉴트럴 매치');
      else if (tg === bg) parts.push(`${groupName(tg)} 톤온톤 배색`);
    }

    // 자켓 이유
    if (jacket) {
      if (tempDiff >= 10) parts.push(`일교차 ${Math.round(tempDiff)}°C로 자켓 권장`);
      else parts.push('아침/저녁 쌀쌀해 자켓 추가');
    }

    // 날씨 특이사항
    if (isRainy) parts.push('비 예보 — 방수/얇은 자켓 추천');
    if (isWindy) parts.push('바람 강함');

    return parts.join(' · ');
  }

  function groupName(group: string): string {
    const names: Record<string, string> = {
      neutral: '뉴트럴', cool: '쿨톤', warm: '웜톤', earth: '어스톤',
    };
    return names[group] ?? group;
  }

  /** 상의·하의·자켓 색상 매칭 확인 */
  function jacketMatchesBoth(j: Clothing, top: Clothing, bottom: Clothing): boolean {
    if (!j.primary_color) return true;
    return (!top.primary_color || colorsMatch(j.primary_color, top.primary_color)) &&
           (!bottom.primary_color || colorsMatch(j.primary_color, bottom.primary_color));
  }

  /** 자켓 찾기 (색상 매칭 → 재사용 → 아무 자켓) */
  function findBestJacket(top: Clothing, bottom: Clothing): Clothing | null {
    if (jackets.length === 0) return null;
    // 1순위: 미사용 + 색상 매칭
    let j = jackets.find((jk) => !usedJackets.has(jk.id) && jacketMatchesBoth(jk, top, bottom));
    if (j) return j;
    // 2순위: 사용 여부 무관 + 색상 매칭
    j = jackets.find((jk) => jacketMatchesBoth(jk, top, bottom));
    if (j) return j;
    // 3순위 (needJacket일 때만): 매칭 안돼도 아무 자켓 (미사용 우선)
    if (needJacket) {
      return jackets.find((jk) => !usedJackets.has(jk.id)) ?? jackets[0];
    }
    return null;
  }

  /** 상의+하의+자켓 조합 추가 */
  function tryAdd(top: Clothing, bottom: Clothing): boolean {
    const key = `${top.id}_${bottom.id}`;
    if (usedPairs.has(key)) return false;

    // 상의-하의 색상 매칭
    if (top.primary_color && bottom.primary_color && !colorsMatch(top.primary_color, bottom.primary_color)) return false;

    // 자켓: 날씨상 필요할 때만 포함
    const jacket: Clothing | null = needJacket ? findBestJacket(top, bottom) : null;

    usedPairs.add(key);
    if (jacket) usedJackets.add(jacket.id);
    suggestions.push({
      top_id: top.id,
      bottom_id: bottom.id,
      jacket_id: jacket?.id ?? null,
      reason: buildReason(top, bottom, jacket),
    });
    return true;
  }

  // Pass 1: 상의·하의 모두 유니크
  const usedTops = new Set<string>();
  const usedBottoms = new Set<string>();
  for (const top of tops) {
    if (suggestions.length >= 3) break;
    if (usedTops.has(top.id)) continue;
    for (const bottom of bottoms) {
      if (suggestions.length >= 3) break;
      if (usedBottoms.has(bottom.id)) continue;
      if (tryAdd(top, bottom)) {
        usedTops.add(top.id);
        usedBottoms.add(bottom.id);
        break;
      }
    }
  }

  // Pass 2: 상의 또는 하의 1회 재사용 허용
  if (suggestions.length < 3) {
    for (const top of tops) {
      if (suggestions.length >= 3) break;
      for (const bottom of bottoms) {
        if (suggestions.length >= 3) break;
        tryAdd(top, bottom);
      }
    }
  }

  return suggestions;
}
