import type { Clothing, WeatherSnapshot } from '../types';
import { getColorGroup, groupName } from './colorGroups';
import { isRainy, isWindy } from './weatherFit';

/** 사용자에게 보여줄 "추천 이유" 문자열 조립 */
export function buildReason(
  top: Clothing,
  bottom: Clothing,
  jacket: Clothing | null,
  weather: WeatherSnapshot,
): string {
  const avgTemp = Math.round((weather.temp_min_c + weather.temp_max_c) / 2);
  const tempDiff = weather.temp_max_c - weather.temp_min_c;
  const parts: string[] = [];

  parts.push(`평균 ${avgTemp}°C (${weather.temp_min_c}°~${weather.temp_max_c}°C)에 적합`);

  // 색상 배색 설명
  if (top.primary_color && bottom.primary_color) {
    const tg = getColorGroup(top.primary_color);
    const bg = getColorGroup(bottom.primary_color);
    if (tg === 'neutral' && bg === 'neutral') parts.push('뉴트럴 배색');
    else if (tg === 'neutral' || bg === 'neutral') parts.push('뉴트럴 매치');
    else if (tg === bg) parts.push(`${groupName(tg)} 톤온톤 배색`);
    else if ((tg === 'warm' && bg === 'earth') || (tg === 'earth' && bg === 'warm')) parts.push('웜톤 조화');
    else if ((tg === 'cool' && bg === 'earth') || (tg === 'earth' && bg === 'cool')) parts.push('쿨어스 조화');
  }

  if (jacket) {
    if (tempDiff >= 10) parts.push(`일교차 ${Math.round(tempDiff)}°C로 자켓 권장`);
    else parts.push('아침/저녁 쌀쌀해 자켓 추가');
  }

  if (isRainy(weather)) parts.push('비 예보 — 방수/얇은 자켓 추천');
  if (isWindy(weather)) parts.push('바람 강함');

  return parts.join(' · ');
}
