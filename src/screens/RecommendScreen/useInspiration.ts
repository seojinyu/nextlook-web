/**
 * 오늘의 스타일 영감 훅.
 * - 사용자 프로필의 성별을 읽음
 * - 오늘 날짜 + 날씨로 daily-inspiration edge function 호출
 * - 결과는 서버에서 자동 캐시 (하루 1회 API 호출)
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase, invokeEdge } from '../../lib/supabase';
import { getWeatherSeason } from '../../lib/recommend/weatherFit';
import type { WeatherSnapshot } from '../../lib/types';

export interface InspirationImage {
  url: string;
  thumb: string;
  source: 'unsplash' | 'pexels';
  alt: string;
  photographer: string;
  credit_url: string;
}

interface Result {
  images: InspirationImage[];
  cached: boolean;
  date: string;
  gender?: string;
}

export function useInspiration(weather: WeatherSnapshot | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    if (!weather) return;
    setLoading(true);
    setError(null);
    try {
      // 사용자 성별 조회 (없으면 unisex)
      const { data: userData } = await supabase.auth.getUser();
      let gender: string | undefined;
      if (userData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender')
          .eq('id', userData.user.id)
          .maybeSingle();
        gender = profile?.gender ?? undefined;

        // 강제 새로고침: 오늘 캐시 삭제
        if (forceRefresh) {
          const today = new Date().toISOString().slice(0, 10);
          await supabase
            .from('daily_inspirations')
            .delete()
            .eq('user_id', userData.user.id)
            .eq('date', today);
          console.log('[useInspiration] 오늘 캐시 삭제 완료');
        }
      }

      const season = getWeatherSeason(weather);
      const tempAvg = Math.round((weather.temp_min_c + weather.temp_max_c) / 2);

      const res = await invokeEdge<Result>('daily-inspiration', {
        gender,
        weather_condition: weather.condition,
        temp_avg: tempAvg,
        season,
      });
      setResult(res);
    } catch (e: any) {
      console.warn('[useInspiration] fail:', e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [weather]);

  const refreshWithNewImages = useCallback(() => load(true), [load]);

  // 날씨 변경 시 자동 로드 (같은 날은 서버가 캐시 반환)
  useEffect(() => {
    if (weather) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather?.condition, weather?.temp_min_c, weather?.temp_max_c]);

  return { loading, error, result, reload: () => load(false), refresh: refreshWithNewImages };
}
