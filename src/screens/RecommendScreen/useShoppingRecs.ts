/**
 * 오늘의 쇼핑 추천 훅 (v2).
 * - refresh 시 랜덤 시드 생성 → 매번 다른 상품
 * - weather 변경 시 자동 새 fetch (다른 날짜 예보 → 다른 상품)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
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

  // 마지막 로드한 weather 조건 (동일 조건이면 재로드 안 함)
  const lastWeatherKeyRef = useRef<string>('');

  const load = useCallback(async (refreshSeed = 0) => {
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
      }

      const season = getWeatherSeason(weather);
      const tempAvg = Math.round((weather.temp_min_c + weather.temp_max_c) / 2);

      const res = await invokeEdge<Result>('shopping-recs', {
        gender,
        weather_condition: weather.condition,
        temp_avg: tempAvg,
        season,
        refresh_seed: refreshSeed,  // 0이면 캐시 사용, >0이면 새로 fetch
      });
      console.log('[useShoppingRecs] 상품:', res.products?.length ?? 0, 'refresh_seed:', refreshSeed);
      setResult(res);
    } catch (e: any) {
      console.warn('[useShoppingRecs] fail:', e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [weather]);

  // weather 변경 감지 → 다른 조건이면 새 fetch
  useEffect(() => {
    if (!weather) return;
    const currentKey = `${weather.condition}_${weather.temp_min_c}_${weather.temp_max_c}`;
    if (currentKey !== lastWeatherKeyRef.current) {
      lastWeatherKeyRef.current = currentKey;
      load(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather?.condition, weather?.temp_min_c, weather?.temp_max_c]);

  /** 새로 찾기: 랜덤 시드 생성 → 캐시 우회 → 완전 다른 상품 */
  const refresh = useCallback(() => {
    const randomSeed = Date.now() + Math.floor(Math.random() * 10000);
    load(randomSeed);
  }, [load]);

  return {
    loading,
    error,
    products: result?.products ?? [],
    refresh,
  };
}
