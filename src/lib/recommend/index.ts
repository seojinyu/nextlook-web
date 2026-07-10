/**
 * 코디 추천 알고리즘 (얇은 조정자).
 *
 * 색상 매칭 → colorGroups.ts
 * 날씨 판단 → weatherFit.ts
 * 이유 문자열 → reasonBuilder.ts
 *
 * 알고리즘 개요:
 *   Pass 1: 상의·하의 유니크 조합 (엄격 색상 매칭)
 *   Pass 2: 재사용 허용 (엄격 색상 매칭)
 *   Pass 3: 관대한 색상 매칭 (인접 톤 허용) — 그래도 색상 매칭은 필수
 *   최대 3개까지 추천.
 */
import type { Clothing, OutfitSuggestion, WeatherSnapshot } from '../types';
import { colorsMatch } from './colorGroups';
import { fitsWeather, needsJacket } from './weatherFit';
import { buildReason } from './reasonBuilder';
import { shuffle } from './shuffle';

const MAX_SUGGESTIONS = 3;

export function generateRecommendations(
  clothes: Clothing[],
  weather: WeatherSnapshot,
  recentIds: Set<string>,
): OutfitSuggestion[] {
  console.log('[Recommend] input:', {
    totalClothes: clothes.length,
    tops: clothes.filter((c) => c.category === 'top').length,
    bottoms: clothes.filter((c) => c.category === 'bottom').length,
    jackets: clothes.filter((c) => c.category === 'jacket').length,
    recentIds: recentIds.size,
    weather,
  });

  const allTops = clothes.filter((c) => c.category === 'top');
  const allBottoms = clothes.filter((c) => c.category === 'bottom');
  if (allTops.length === 0 || allBottoms.length === 0) {
    console.warn('[Recommend] 상의 또는 하의가 없어서 추천 불가');
    return [];
  }

  const { tops, bottoms, jackets } = selectCandidates(clothes, weather, recentIds, allTops, allBottoms);
  console.log('[Recommend] available:', {
    tops: tops.length, bottoms: bottoms.length, jackets: jackets.length,
  });

  const needJacket = needsJacket(weather);
  const suggestions: OutfitSuggestion[] = [];
  const usedPairs = new Set<string>();
  const usedJackets = new Set<string>();

  function jacketMatchesBoth(j: Clothing, top: Clothing, bottom: Clothing, strict: boolean): boolean {
    if (!j.primary_color) return true;
    return (!top.primary_color || colorsMatch(j.primary_color, top.primary_color, strict)) &&
           (!bottom.primary_color || colorsMatch(j.primary_color, bottom.primary_color, strict));
  }

  function findBestJacket(top: Clothing, bottom: Clothing, strict: boolean): Clothing | null {
    if (jackets.length === 0) return null;
    const unused = jackets.find((jk) => !usedJackets.has(jk.id) && jacketMatchesBoth(jk, top, bottom, strict));
    if (unused) return unused;
    const any = jackets.find((jk) => jacketMatchesBoth(jk, top, bottom, strict));
    return any ?? null;
  }

  function tryAdd(top: Clothing, bottom: Clothing, strictColor: boolean): boolean {
    const key = `${top.id}_${bottom.id}`;
    if (usedPairs.has(key)) return false;
    if (top.primary_color && bottom.primary_color &&
        !colorsMatch(top.primary_color, bottom.primary_color, strictColor)) return false;

    const jacket = needJacket ? findBestJacket(top, bottom, strictColor) : null;
    usedPairs.add(key);
    if (jacket) usedJackets.add(jacket.id);

    suggestions.push({
      top_id: top.id,
      bottom_id: bottom.id,
      jacket_id: jacket?.id ?? null,
      reason: buildReason(top, bottom, jacket, weather),
    });
    return true;
  }

  // Pass 1: 상의·하의 유니크 + 엄격 색상 매칭
  runPass(tops, bottoms, suggestions, MAX_SUGGESTIONS, true, tryAdd, /* uniqueOnly */ true);
  // Pass 2: 재사용 허용, 여전히 엄격
  if (suggestions.length < MAX_SUGGESTIONS) {
    runPass(tops, bottoms, suggestions, MAX_SUGGESTIONS, true, tryAdd, false);
  }
  // Pass 3: 관대한 색상 매칭
  if (suggestions.length < MAX_SUGGESTIONS) {
    runPass(tops, bottoms, suggestions, MAX_SUGGESTIONS, false, tryAdd, false);
  }

  console.log('[Recommend] 결과:', suggestions.length, '개 추천');
  return suggestions;
}

/** 3단계 폴백으로 후보 셋을 결정 (recent 필터 → 날씨 필터 → 전체) */
function selectCandidates(
  clothes: Clothing[],
  weather: WeatherSnapshot,
  recentIds: Set<string>,
  allTops: Clothing[],
  allBottoms: Clothing[],
) {
  let tops = shuffle(clothes.filter((c) => c.category === 'top' && !recentIds.has(c.id) && fitsWeather(c, weather)));
  let bottoms = shuffle(clothes.filter((c) => c.category === 'bottom' && !recentIds.has(c.id) && fitsWeather(c, weather)));
  let jackets = shuffle(clothes.filter((c) => c.category === 'jacket' && !recentIds.has(c.id) && fitsWeather(c, weather)));

  if (tops.length === 0 || bottoms.length === 0) {
    console.log('[Recommend] recent 필터 해제');
    tops = shuffle(clothes.filter((c) => c.category === 'top' && fitsWeather(c, weather)));
    bottoms = shuffle(clothes.filter((c) => c.category === 'bottom' && fitsWeather(c, weather)));
    jackets = shuffle(clothes.filter((c) => c.category === 'jacket' && fitsWeather(c, weather)));
  }

  if (tops.length === 0 || bottoms.length === 0) {
    console.log('[Recommend] 날씨 필터 해제 - 전체 사용');
    tops = shuffle(allTops);
    bottoms = shuffle(allBottoms);
    jackets = shuffle(clothes.filter((c) => c.category === 'jacket'));
  }

  return { tops, bottoms, jackets };
}

/** 하나의 pass — 상의·하의를 조합해 tryAdd를 호출 */
function runPass(
  tops: Clothing[],
  bottoms: Clothing[],
  suggestions: OutfitSuggestion[],
  maxSuggestions: number,
  strictColor: boolean,
  tryAdd: (top: Clothing, bottom: Clothing, strict: boolean) => boolean,
  uniqueOnly: boolean,
) {
  const usedTops = new Set<string>();
  const usedBottoms = new Set<string>();
  for (const top of tops) {
    if (suggestions.length >= maxSuggestions) break;
    if (uniqueOnly && usedTops.has(top.id)) continue;
    for (const bottom of bottoms) {
      if (suggestions.length >= maxSuggestions) break;
      if (uniqueOnly && usedBottoms.has(bottom.id)) continue;
      if (tryAdd(top, bottom, strictColor)) {
        if (uniqueOnly) {
          usedTops.add(top.id);
          usedBottoms.add(bottom.id);
          break;
        }
      }
    }
  }
}
