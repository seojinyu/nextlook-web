/**
 * RecommendScreen 데이터 로딩 훅.
 * - 위치 권한 요청 및 좌표 획득
 * - 옷장 + 최근 착용 + 14일 날씨 프리페치
 * - 캐시로 재방문 시 즉시 반응
 */
import { useState, useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { supabase, getSignedUrl } from '../../lib/supabase';
import { prefetchForecast, getWeatherFromCache } from '../../lib/weather';
import { generateRecommendations } from '../../lib/recommend';
import type { Clothing, OutfitSuggestion, WeatherSnapshot } from '../../lib/types';
import {
  cachedCoords, setCachedCoords,
  cachedClothes, setCachedClothes,
  cachedRecentIds, setCachedRecentIds,
  cachedClothesUrlMap, setCachedClothesUrlMap,
  dataReady, setDataReady,
  signedUrlCache, setCachedSignedUrl, clearAllCaches,
} from './cache';

export function useRecommendData() {
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [date, setDate] = useState<string>('');
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [clothesMap, setClothesMap] = useState<
    Map<string, Clothing & { signedUrl: string }>
  >(new Map());

  const getLocation = useCallback(async () => {
    if (cachedCoords) return cachedCoords;
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) throw new Error('위치 권한이 필요합니다.');
    const last = await Location.getLastKnownPositionAsync();
    if (last) {
      setCachedCoords(last.coords);
      return last.coords;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    setCachedCoords(loc.coords);
    return loc.coords;
  }, []);

  const getCachedSignedUrl = useCallback(async (path: string) => {
    const cached = signedUrlCache.get(path);
    if (cached) return cached;
    const url = await getSignedUrl(path);
    setCachedSignedUrl(path, url);
    return url;
  }, []);

  /** 특정 일자에 대해 추천을 생성 (API 호출 없이 캐시로 즉시 반영) */
  const generateForDay = useCallback((days: number) => {
    const w = getWeatherFromCache(days);
    if (!w || !cachedClothes || !cachedRecentIds) {
      console.log('[RecommendScreen] 데이터 준비 안 됨', {
        hasWeather: !!w,
        cachedClothes: cachedClothes?.length,
        cachedRecentIds: cachedRecentIds?.size,
      });
      return;
    }

    const target = new Date();
    target.setDate(target.getDate() + days);
    setDate(target.toISOString().slice(0, 10));
    setWeather(w);

    console.log('[RecommendScreen] 옷장 개수:', cachedClothes.length);
    const recs = generateRecommendations(cachedClothes, w, cachedRecentIds);
    console.log('[RecommendScreen] 추천 개수:', recs.length);
    setSuggestions(recs);

    const m = new Map<string, Clothing & { signedUrl: string }>();
    recs.forEach((s) => {
      [s.top_id, s.bottom_id, s.jacket_id].forEach((id) => {
        if (id) {
          const item = cachedClothesUrlMap.get(id);
          if (item) m.set(id, item);
        }
      });
    });
    setClothesMap(m);
  }, []);

  /** 첫 로드: 위치 · 옷장 · 최근 · 날씨 전부 프리페치 */
  const initialLoad = useCallback(async () => {
    setLoading(true);
    try {
      const [coords, userData] = await Promise.all([
        getLocation(),
        supabase.auth.getUser(),
      ]);
      if (!userData.data.user) throw new Error('로그인이 필요합니다.');
      const userId = userData.data.user.id;

      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const [, clothesRes, recentRes] = await Promise.all([
        prefetchForecast(coords.latitude, coords.longitude),
        supabase.from('clothes').select('*').eq('user_id', userId),
        supabase.from('wear_log')
          .select('clothing_ids')
          .eq('user_id', userId)
          .gte('worn_on', fourDaysAgo.toISOString().slice(0, 10)),
      ]);

      const clothes = (clothesRes.data ?? []) as Clothing[];
      setCachedClothes(clothes);

      const recentSet = new Set<string>();
      (recentRes.data ?? []).forEach((r: any) =>
        (r.clothing_ids as string[]).forEach((id: string) => recentSet.add(id))
      );
      setCachedRecentIds(recentSet);

      // 모든 옷의 signedUrl 프리캐시 (웹에선 processed_image_path 우선)
      const urlMap = new Map<string, Clothing & { signedUrl: string }>();
      await Promise.all(
        clothes.map(async (c) => {
          const preferProcessed = Platform.OS === 'web' && c.processed_image_path;
          const path = preferProcessed ? c.processed_image_path! : c.image_path;
          const url = await getCachedSignedUrl(path);
          urlMap.set(c.id, { ...c, signedUrl: url });
        })
      );
      setCachedClothesUrlMap(urlMap);
      setDataReady(true);

      generateForDay(1);
    } catch (e: any) {
      Alert.alert('추천 실패', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [getLocation, getCachedSignedUrl, generateForDay]);

  const selectDate = useCallback(
    (days: number) => {
      if (dataReady) generateForDay(days);
      else initialLoad();
    },
    [initialLoad, generateForDay]
  );

  const refresh = useCallback(async () => {
    clearAllCaches();
    await initialLoad();
  }, [initialLoad]);

  useEffect(() => {
    initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loading,
    weather,
    date,
    suggestions,
    clothesMap,
    selectDate,
    refresh,
    /** 옷장이 비어있는지 등의 판단을 UI에서 하기 위한 원본 참조 */
    getCachedClothes: () => cachedClothes,
  };
}
