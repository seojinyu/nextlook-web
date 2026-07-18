/**
 * 오늘의 쇼핑 추천 훅.
 * - 사용자 프로필의 성별 · 오늘 날씨 → 네이버 쇼핑 API 상품
 * - 하루 캐싱 (서버측)
 * - 완전 새 pool 요청은 hardReload로 (오늘 캐시 삭제)
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase, invokeEdge } from '../../lib/supabase';
import { getWeatherSeason } from '../../lib/recommend/weatherFit';
import type { WeatherSnapshot } from '../../lib/types';

export interface ShoppingProduct {
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

interface Result {
  products: ShoppingProduct[];
  cached: boolean;
  date: string;
  gender?: string;
}

export function useShoppingRecs(weather: WeatherSnapshot | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const load = useCallback(async (hardReload = false) => {
    if (!weather) return;
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      let gender: string | undefined;
      if (userData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender')
          .eq('id', userData.user.id)
          .maybeSingle();
        gender = profile?.gender ?? undefined;

        if (hardReload) {
          const today = new Date().toISOString().slice(0, 10);
          await supabase
            .from('daily_shopping')
            .delete()
            .eq('user_id', userData.user.id)
            .eq('date', today);
          console.log('[useShoppingRecs] 캐시 삭제');
        }
      }

      const season = getWeatherSeason(weather);
      const tempAvg = Math.round((weather.temp_min_c + weather.temp_max_c) / 2);

      const res = await invokeEdge<Result>('shopping-recs', {
        gender,
        weather_condition: weather.condition,
        temp_avg: tempAvg,
        season,
      });
      console.log('[useShoppingRecs] 상품:', res.products?.length ?? 0);
      setResult(res);
    } catch (e: any) {
      console.warn('[useShoppingRecs] fail:', e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [weather]);

  useEffect(() => {
    if (weather) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather?.condition, weather?.temp_min_c, weather?.temp_max_c]);

  return {
    loading,
    error,
    products: result?.products ?? [],
    /** 오늘 캐시 삭제 후 새로 fetch (다른 상품 pool) */
    refresh: () => load(true),
  };
}
