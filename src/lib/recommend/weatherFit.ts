import type { Clothing, WeatherSnapshot } from '../types';

/** 옷의 적정 온도 범위와 오늘 평균 온도가 겹치는지 */
export function fitsWeather(item: Clothing, weather: WeatherSnapshot): boolean {
  if (item.min_temp_c == null || item.max_temp_c == null) return true;
  const avgTemp = (weather.temp_min_c + weather.temp_max_c) / 2;
  return item.min_temp_c <= avgTemp && item.max_temp_c >= avgTemp;
}

/** 자켓이 필요한 날씨인지: 최저 15°C 미만 또는 일교차 10°C 이상 */
export function needsJacket(weather: WeatherSnapshot): boolean {
  const tempDiff = weather.temp_max_c - weather.temp_min_c;
  return weather.temp_min_c < 15 || tempDiff >= 10;
}

export function isRainy(weather: WeatherSnapshot): boolean {
  return weather.precipitation_mm >= 1;
}

export function isWindy(weather: WeatherSnapshot): boolean {
  return weather.wind_mps >= 7;
}
