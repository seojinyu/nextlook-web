import type { Clothing, WeatherSnapshot } from '../types';

export type Season = 'summer' | 'spring_fall' | 'winter';

/**
 * 평균 온도로 오늘의 계절 판정.
 * 여름 ≥ 22°C · 겨울 < 10°C · 그 외 봄가을
 */
export function getWeatherSeason(weather: WeatherSnapshot): Season {
  const avg = (weather.temp_min_c + weather.temp_max_c) / 2;
  if (avg >= 22) return 'summer';
  if (avg < 10) return 'winter';
  return 'spring_fall';
}

/**
 * 계절 태그 기반 필터 (최우선).
 *
 * 규칙:
 * - 태그가 없으면: 온도 범위로 판단
 * - 여름엔 자켓 카테고리 자체 배제 (아우터 안 입음)
 * - 여름 하의는 관대하게: '여름' + '봄/가을' 모두 허용
 *   (청바지·슬랙스·린넨팬츠 같은 긴 바지는 여름에도 실사용)
 * - 여름 상의는 엄격하게: '여름' 태그만 (긴팔은 더위)
 * - 봄/가을은 별칭(spring, fall) 인정
 */
export function fitsSeason(item: Clothing, weather: WeatherSnapshot): boolean {
  const season = getWeatherSeason(weather);

  if (season === 'summer' && item.category === 'jacket') return false;

  const tags = item.season_tags ?? [];
  if (tags.length === 0) return fitsWeather(item, weather);

  if (season === 'summer' && item.category === 'bottom') {
    // 여름 하의는 봄/가을 태그도 허용
    return (
      tags.includes('summer') ||
      tags.includes('spring_fall') ||
      tags.includes('spring') ||
      tags.includes('fall')
    );
  }

  if (season === 'spring_fall') {
    return tags.includes('spring_fall') || tags.includes('spring') || tags.includes('fall');
  }
  return tags.includes(season);
}

/** 옷의 적정 온도 범위와 오늘 평균 온도가 겹치는지 (계절 태그 없는 옷 fallback) */
export function fitsWeather(item: Clothing, weather: WeatherSnapshot): boolean {
  if (item.min_temp_c == null || item.max_temp_c == null) return true;
  const avgTemp = (weather.temp_min_c + weather.temp_max_c) / 2;
  return item.min_temp_c <= avgTemp && item.max_temp_c >= avgTemp;
}

/**
 * 자켓 필요 여부.
 * - 여름 (avg ≥ 22°C): 무조건 false — 아무리 일교차 커도 자켓 X
 * - 겨울: 필수
 * - 봄/가을: 최저 15°C 미만 또는 일교차 10°C 이상
 */
export function needsJacket(weather: WeatherSnapshot): boolean {
  const season = getWeatherSeason(weather);
  if (season === 'summer') return false;
  if (season === 'winter') return true;
  const tempDiff = weather.temp_max_c - weather.temp_min_c;
  return weather.temp_min_c < 15 || tempDiff >= 10;
}

export function isRainy(weather: WeatherSnapshot): boolean {
  return weather.precipitation_mm >= 1;
}

export function isWindy(weather: WeatherSnapshot): boolean {
  return weather.wind_mps >= 7;
}
