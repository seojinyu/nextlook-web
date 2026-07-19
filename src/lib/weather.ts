import { invokeEdge } from './supabase';
import type { WeatherSnapshot } from './types';

/** WMO Weather Code → condition string (Open-Meteo fallback용) */
const WMO_MAP: Record<number, string> = {
  0: 'Clear', 1: 'Clear', 2: 'Clouds', 3: 'Clouds',
  45: 'Fog', 48: 'Fog',
  51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 56: 'Drizzle', 57: 'Drizzle',
  61: 'Rain', 63: 'Rain', 65: 'Rain', 66: 'Rain', 67: 'Rain',
  71: 'Snow', 73: 'Snow', 75: 'Snow', 77: 'Snow',
  80: 'Rain', 81: 'Rain', 82: 'Rain',
  85: 'Snow', 86: 'Snow',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

interface OpenMeteoDailyResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
  };
}

interface OpenMeteoCurrentResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
  };
}

interface KmaResponse {
  current: { temp_c: number; condition: string } | null;
  daily: {
    date: string;
    temp_min_c: number;
    temp_max_c: number;
    condition: string;
    precipitation_mm: number;
    wind_mps: number;
  }[];
  location: { nx: number; ny: number };
}

// ── Bulk forecast cache ──
let _forecastCache: Map<string, WeatherSnapshot> | null = null;
let _forecastCacheKey = '';
let _currentTempCache: number | null = null;

function buildCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}_${new Date().toISOString().slice(0, 10)}`;
}

/**
 * 기상청 API 우선, 실패 시 Open-Meteo JMA fallback.
 */
async function ensureForecastCache(lat: number, lon: number): Promise<Map<string, WeatherSnapshot>> {
  const key = buildCacheKey(lat, lon);
  if (_forecastCache && _forecastCacheKey === key) return _forecastCache;

  // 1. 기상청 API 시도
  try {
    console.log('[weather] 기상청 API 호출');
    const kma = await invokeEdge<KmaResponse>('weather-kma', { lat, lon });
    if (kma.daily && kma.daily.length > 0) {
      const map = new Map<string, WeatherSnapshot>();
      for (const d of kma.daily) {
        map.set(d.date, {
          temp_min_c: d.temp_min_c,
          temp_max_c: d.temp_max_c,
          condition: d.condition,
          precipitation_mm: d.precipitation_mm,
          wind_mps: d.wind_mps,
        });
        console.log(`[weather:KMA] ${d.date}: 최고 ${d.temp_max_c}° / 최저 ${d.temp_min_c}° / ${d.condition}`);
      }
      // 현재 온도도 캐시
      if (kma.current) {
        _currentTempCache = kma.current.temp_c;
        console.log(`[weather:KMA] 현재: ${kma.current.temp_c}°C, ${kma.current.condition}`);
      }
      _forecastCache = map;
      _forecastCacheKey = key;
      return map;
    }
  } catch (e) {
    console.warn('[weather] 기상청 실패, Open-Meteo로 fallback:', e);
  }

  // 2. Open-Meteo JMA fallback (기존 로직)
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code` +
    `&timezone=Asia/Seoul&forecast_days=16&models=jma_seamless`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API ${res.status}`);
  const json = (await res.json()) as OpenMeteoDailyResponse;

  const map = new Map<string, WeatherSnapshot>();
  for (let i = 0; i < json.daily.time.length; i++) {
    const code = json.daily.weather_code[i];
    const snapshot = {
      temp_min_c: Math.round(json.daily.temperature_2m_min[i]),
      temp_max_c: Math.round(json.daily.temperature_2m_max[i]),
      condition: WMO_MAP[code] ?? 'Clouds',
      precipitation_mm: Math.round(json.daily.precipitation_sum[i] * 10) / 10,
      wind_mps: Math.round((json.daily.wind_speed_10m_max[i] / 3.6) * 10) / 10,
    };
    map.set(json.daily.time[i], snapshot);
    console.log(`[weather:JMA-fallback] ${json.daily.time[i]}: 최고 ${snapshot.temp_max_c}° / 최저 ${snapshot.temp_min_c}°`);
  }
  _forecastCache = map;
  _forecastCacheKey = key;
  return map;
}

export async function prefetchForecast(lat: number, lon: number): Promise<void> {
  await ensureForecastCache(lat, lon);
}

export async function fetchTomorrowWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  return fetchWeatherForDate(lat, lon, 1);
}

export async function fetchWeatherForDate(lat: number, lon: number, daysFromToday: number): Promise<WeatherSnapshot> {
  const cache = await ensureForecastCache(lat, lon);
  const target = new Date();
  target.setDate(target.getDate() + daysFromToday);
  const ymd = target.toISOString().slice(0, 10);
  const snapshot = cache.get(ymd);
  if (!snapshot) throw new Error('해당 날짜의 날씨 정보가 없습니다.');
  return snapshot;
}

export function getWeatherFromCache(daysFromToday: number): WeatherSnapshot | null {
  if (!_forecastCache) return null;
  const target = new Date();
  target.setDate(target.getDate() + daysFromToday);
  const ymd = target.toISOString().slice(0, 10);
  return _forecastCache.get(ymd) ?? null;
}

/**
 * 현재 실시간 기온 조회 (기상청 우선, 실패 시 Open-Meteo).
 * ensureForecastCache에서 이미 KMA current 값을 캐시해두므로 재활용.
 */
export async function fetchCurrentWeather(
  lat: number,
  lon: number
): Promise<{ temp_c: number; condition: string }> {
  // 캐시된 KMA current가 있으면 즉시 반환
  if (_currentTempCache !== null) {
    return { temp_c: _currentTempCache, condition: 'Clear' };
  }

  // Open-Meteo fallback (JMA)
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code&timezone=Asia/Seoul&models=jma_seamless`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API ${res.status}`);
  const json = (await res.json()) as OpenMeteoCurrentResponse;
  return {
    temp_c: Math.round(json.current.temperature_2m),
    condition: WMO_MAP[json.current.weather_code] ?? 'Clouds',
  };
}

/** Returns forecast dates (today through +14 days) */
export function getForecastDates(): { date: string; daysFromToday: number; label: string; day: number; weekday: string }[] {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const results: { date: string; daysFromToday: number; label: string; day: number; weekday: string }[] = [];
  for (let d = 0; d <= 14; d++) {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    const ymd = dt.toISOString().slice(0, 10);
    const day = dt.getDate();
    const w = weekdays[dt.getDay()];
    let label: string;
    let weekday: string;
    if (d === 0) {
      label = '오늘';
      weekday = '오늘';
    } else if (d === 1) {
      label = '내일';
      weekday = '내일';
    } else {
      label = `${dt.getMonth() + 1}/${day}`;
      weekday = w;
    }
    results.push({
      date: ymd,
      daysFromToday: d,
      label,
      day,
      weekday,
    });
  }
  return results;
}
