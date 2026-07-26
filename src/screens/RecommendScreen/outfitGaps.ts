/**
 * 코디-연결형 쇼핑을 위한 "gap(부족분)" 분석.
 *
 * 오늘의 추천 코디 + 옷장 구성 + 날씨를 보고,
 * "이 코디를 완성하려면 뭐가 필요한지"를 도출한다.
 * - 쌀쌀한데 아우터가 없음 → outerwear
 * - 매치할 하의/상의가 부족 → bottom/top
 * - 비/눈/더위 등 날씨 특수 → accessory
 * - 신발은 항상 포함 (코디 완성의 핵심 + 전환율 최고)
 *
 * 각 gap엔 사용자에게 보여줄 reason(코디/날씨 연결 문구)이 붙는다.
 */
import type { Clothing, OutfitSuggestion, WeatherSnapshot } from '../../lib/types';

export type GapKey = 'shoes' | 'outerwear' | 'bottom' | 'top' | 'accessory';

export interface OutfitGap {
  key: GapKey;
  reason: string;
}

export function computeOutfitGaps(
  weather: WeatherSnapshot | null,
  clothes: Clothing[] | null,
  primary: OutfitSuggestion | null,
): OutfitGap[] {
  if (!weather) return [];

  const list = clothes ?? [];
  const count = (c: string) => list.filter((x) => x.category === c).length;

  const tMax = weather.temp_max_c;
  const tMin = weather.temp_min_c;
  const cond = weather.condition;
  const isRain = cond === 'Rain' || cond === 'Drizzle' || cond === 'Thunderstorm';
  const isSnow = cond === 'Snow';
  const cool = tMax <= 18;
  const cold = tMax <= 10;
  const hot = tMax >= 27;

  const fillers: OutfitGap[] = [];

  // 1. 아우터 — 쌀쌀한데 오늘 코디(또는 옷장)에 아우터가 없음
  const hasOuter = primary ? !!primary.jacket_id : count('jacket') >= 2;
  if (cool && !hasOuter) {
    fillers.push({
      key: 'outerwear',
      reason: cold
        ? `아침 최저 ${Math.round(tMin)}°, 따뜻한 아우터로 코디를 완성해요`
        : '아침저녁 쌀쌀해요 · 가벼운 아우터 하나면 완벽',
    });
  }

  // 2. 하의 부족
  if (count('bottom') < 2 && count('dress') < 1) {
    fillers.push({ key: 'bottom', reason: '매치할 하의가 부족해요 · 데일리 팬츠 추천' });
  }

  // 3. 상의 부족
  if (count('top') < 2) {
    fillers.push({ key: 'top', reason: '오늘 날씨에 맞는 상의를 채워보세요' });
  }

  // 4. 악세서리 — 날씨 특수 상황
  if (isRain) {
    fillers.push({ key: 'accessory', reason: '오늘 비 소식 · 우산 미리 챙기세요' });
  } else if (isSnow || cold) {
    fillers.push({ key: 'accessory', reason: '추운 날 · 목도리 하나로 체감 +3°' });
  } else if (hot) {
    fillers.push({ key: 'accessory', reason: '햇빛 강한 날 · 캡모자로 마무리' });
  }

  // 5. 신발 — 항상 포함 (코디 완성 앵커)
  const shoeReason =
    isRain ? '비 오는 날 · 젖지 않는 신발로'
    : isSnow ? '눈길 · 미끄럼 방지 신발로'
    : cold ? '발 시린 날 · 따뜻한 신발로 마무리'
    : hot ? '더운 날 · 시원한 신발로 마무리'
    : '이 코디를 완성할 신발';
  const shoe: OutfitGap = { key: 'shoes', reason: shoeReason };

  // 부족분(최대 2개) + 신발 = 최대 3그룹. 신발은 항상 포함.
  return [...fillers.slice(0, 2), shoe];
}
