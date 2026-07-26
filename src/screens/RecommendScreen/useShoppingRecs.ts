/**
 * 오늘의 쇼핑 추천 훅.
 * - target_date로 날짜별 다른 상품
 * - 성별 엄격 필터링
 * - refresh로 완전 새 상품
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, invokeEdge } from '../../lib/supabase';
import { getWeatherSeason } from '../../lib/recommend/weatherFit';
import type { Clothing, OutfitSuggestion, WeatherSnapshot } from '../../lib/types';
import { computeOutfitGaps } from './outfitGaps';

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
  gapKey?: string;
  gapReason?: string;
}

interface Result {
  products: ShoppingProduct[];
  cached: boolean;
  date: string;
  gender?: string;
}

export function useShoppingRecs(
  weather: WeatherSnapshot | null,
  targetDate?: string,
  primary?: OutfitSuggestion | null,
  clothes?: Clothing[] | null,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);

  const lastKeyRef = useRef<string>('');

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
        setUserGender(gender ?? null);
      }

      const season = getWeatherSeason(weather);
      const tempAvg = Math.round((weather.temp_min_c + weather.temp_max_c) / 2);
      const gaps = computeOutfitGaps(weather, clothes ?? null, primary ?? null);

      const res = await invokeEdge<Result>('shopping-recs', {
        gender,
        weather_condition: weather.condition,
        temp_avg: tempAvg,
        season,
        target_date: targetDate,
        refresh_seed: refreshSeed,
        gaps,
      });
      console.log('[useShoppingRecs] 상품:', res.products?.length ?? 0,
                  'gaps:', gaps.map((g) => g.key).join(','),
                  'date:', targetDate, 'refresh:', refreshSeed);
      setResult(res);
    } catch (e: any) {
      console.warn('[useShoppingRecs] fail:', e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [weather, targetDate, primary, clothes]);

  useEffect(() => {
    if (!weather) return;
    // gap 집합이 바뀔 때(예: 아우터 없음→있음)도 재조회하도록 시그니처에 포함.
    // primary 객체 identity가 매번 바뀌어도 gap 키가 같으면 재조회하지 않음.
    const gapSig = computeOutfitGaps(weather, clothes ?? null, primary ?? null)
      .map((g) => g.key)
      .join(',');
    const currentKey = `${targetDate}_${weather.condition}_${weather.temp_min_c}_${weather.temp_max_c}_${gapSig}`;
    if (currentKey !== lastKeyRef.current) {
      lastKeyRef.current = currentKey;
      load(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate, weather?.condition, weather?.temp_min_c, weather?.temp_max_c, primary, clothes]);

  const refresh = useCallback(() => {
    const randomSeed = Date.now() + Math.floor(Math.random() * 10000);
    load(randomSeed);
  }, [load]);

  return {
    loading,
    error,
    products: result?.products ?? [],
    userGender,
    refresh,
  };
}
