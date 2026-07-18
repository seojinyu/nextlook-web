/**
 * 오늘의 쇼핑 추천 훅 (v3).
 * - target_date 전달 → 같은 날씨여도 다른 날짜면 다른 상품
 * - refresh 시 랜덤 시드 생성
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

export function useShoppingRecs(weather: WeatherSnapshot | null, targetDate?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [userAgeRange, setUserAgeRange] = useState<string | null>(null);

  const lastKeyRef = useRef<string>('');

  const load = useCallback(async (refreshSeed = 0) => {
    if (!weather) return;
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      let gender: string | undefined;
      let ageRange: string | undefined;
      if (userData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender, age_range')
          .eq('id', userData.user.id)
          .maybeSingle();
        gender = profile?.gender ?? undefined;
        ageRange = profile?.age_range ?? undefined;
        setUserGender(gender ?? null);
        setUserAgeRange(ageRange ?? null);
      }

      const season = getWeatherSeason(weather);
      const tempAvg = Math.round((weather.temp_min_c + weather.temp_max_c) / 2);

      const res = await invokeEdge<Result>('shopping-recs', {
        gender,
        age_range: ageRange,
        weather_condition: weather.condition,
        temp_avg: tempAvg,
        season,
        target_date: targetDate,
        refresh_seed: refreshSeed,
      });
      console.log('[useShoppingRecs] 상품:', res.products?.length ?? 0,
                  'date:', targetDate, 'refresh:', refreshSeed);
      setResult(res);
    } catch (e: any) {
      console.warn('[useShoppingRecs] fail:', e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [weather, targetDate]);

  // weather 또는 target_date 변경 감지 → 새 fetch
  useEffect(() => {
    if (!weather) return;
    // 키에 date 포함 → 같은 날씨여도 다른 날짜면 재로드
    const currentKey = `${targetDate}_${weather.condition}_${weather.temp_min_c}_${weather.temp_max_c}`;
    if (currentKey !== lastKeyRef.current) {
      lastKeyRef.current = currentKey;
      load(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate, weather?.condition, weather?.temp_min_c, weather?.temp_max_c]);

  const refresh = useCallback(() => {
    const randomSeed = Date.now() + Math.floor(Math.random() * 10000);
    load(randomSeed);
  }, [load]);

  return {
    loading,
    error,
    products: result?.products ?? [],
    userGender,   // 'male' | 'female' | 'other' | null
    userAgeRange, // '10s' | '20s' | '30s' | '40s' | '50s+' | null
    refresh,
  };
}
