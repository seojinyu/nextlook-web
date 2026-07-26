/**
 * 코디-연결형 쇼핑을 위한 "완성 아이템" 분석.
 *
 * 오늘의 추천 코디 + 옷장 구성 + 날씨를 보고,
 * "이 코디를 완성할 아이템"을 항상 3그룹(신발 + 2개)으로 제안한다.
 * - 실제 부족분(쌀쌀한데 아우터 없음, 하의/상의 부족)이 있으면 개인화 문구 우선
 * - 부족분이 없어도 날씨 소품/믹스매치 제안으로 코디를 연결
 * - 신발은 항상 포함 (코디 완성 앵커 + 전환율 최고)
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
  const hasOuter = primary ? !!primary.jacket_id : count('jacket') >= 2;

  // 우선순위 후보 리스트 (앞쪽일수록 개인화·중요).
  // 같은 key가 여러 번 나오면 가장 앞의 문구가 채택된다.
  const candidates: OutfitGap[] = [];

  // 1) 실제 부족분 — 개인화된 이유 우선
  if (cool && !hasOuter) {
    candidates.push({
      key: 'outerwear',
      reason: cold
        ? `아침 최저 ${Math.round(tMin)}° · 따뜻한 아우터로 코디 완성`
        : '아침저녁 쌀쌀해요 · 가벼운 아우터 하나면 완벽',
    });
  }
  if (count('bottom') < 2 && count('dress') < 1) {
    candidates.push({ key: 'bottom', reason: '매치할 하의가 부족해요 · 데일리 팬츠 추천' });
  }
  if (count('top') < 2) {
    candidates.push({ key: 'top', reason: '오늘 날씨에 맞는 상의를 채워보세요' });
  }

  // 2) 날씨 소품 (우산 등 비의류는 추천하지 않음 — 입는 아이템만)
  if (isSnow || cold) {
    candidates.push({ key: 'accessory', reason: '추운 날 · 목도리 하나로 체감 +3°' });
  } else if (hot) {
    candidates.push({ key: 'accessory', reason: '햇빛 강한 날 · 캡모자로 마무리' });
  }

  // 3) 일반 완성 제안 — 부족분이 없어도 코디를 연결 (항상 후보)
  candidates.push({ key: 'bottom', reason: '오늘 룩에 어울리는 하의로 믹스매치' });
  candidates.push({ key: 'top', reason: '오늘 룩에 더할 상의 한 장' });
  candidates.push({ key: 'accessory', reason: '포인트 소품으로 코디 완성' });
  if (cool) {
    candidates.push({ key: 'outerwear', reason: '가벼운 아우터로 레이어드' });
  }

  // 신발 제외 후보에서 key 중복 제거 → 상위 2개 선택
  const seen = new Set<GapKey>();
  const picked: OutfitGap[] = [];
  for (const g of candidates) {
    if (g.key === 'shoes' || seen.has(g.key)) continue;
    seen.add(g.key);
    picked.push(g);
    if (picked.length >= 2) break;
  }

  // 신발 — 항상 포함 (코디 완성 앵커)
  const shoeReason =
    isRain ? '비 오는 날 · 젖지 않는 신발로'
    : isSnow ? '눈길 · 미끄럼 방지 신발로'
    : cold ? '발 시린 날 · 따뜻한 신발로 마무리'
    : hot ? '더운 날 · 시원한 신발로 마무리'
    : '이 코디를 완성할 신발';

  return [...picked, { key: 'shoes', reason: shoeReason }];
}
