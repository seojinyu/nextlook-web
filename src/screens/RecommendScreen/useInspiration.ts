/**
 * 오늘의 스타일 영감 훅 (v2).
 * - Edge Function이 30장 pool을 반환
 * - 클라이언트는 이 pool에서 랜덤 3장 선택 표시
 * - refresh 버튼: pool에서 다른 3장으로 rotation (API 호출 없이)
 * - 진짜 새로운 이미지가 필요하면 hardReload (오늘 캐시 삭제 + Edge fetch)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  images: InspirationImage[]; // 최대 30장 pool
  cached: boolean;
  date: string;
  gender?: string;
}

const DISPLAY_COUNT = 3;

/** Fisher-Yates 셔플 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useInspiration(weather: WeatherSnapshot | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [rotationSeed, setRotationSeed] = useState(0);

  // 이미 표시한 사진 인덱스 추적 → 최대한 안 겹치게
  const shownIndicesRef = useRef<Set<number>>(new Set());

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
            .from('daily_inspirations')
            .delete()
            .eq('user_id', userData.user.id)
            .eq('date', today);
          console.log('[useInspiration] 캐시 삭제 - 완전 새 pool 요청');
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
      console.log('[useInspiration] pool 크기:', res.images?.length ?? 0);
      setResult(res);
      shownIndicesRef.current = new Set(); // 새 pool → 이력 리셋
    } catch (e: any) {
      console.warn('[useInspiration] fail:', e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [weather]);

  useEffect(() => {
    if (weather) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather?.condition, weather?.temp_min_c, weather?.temp_max_c]);

  /** 새로고침: pool에서 다른 3장 (API 재호출 없음, 즉시 반응) */
  const rotate = useCallback(() => {
    setRotationSeed((n) => n + 1);
  }, []);

  /** 표시할 3장: rotationSeed 바뀔 때마다 재계산, 이미 본 것 피함 */
  const displayImages = useMemo<InspirationImage[]>(() => {
    const pool = result?.images ?? [];
    if (pool.length === 0) return [];
    if (pool.length <= DISPLAY_COUNT) return pool;

    // 아직 안 본 인덱스 목록에서 랜덤 3개 선택
    let candidates: number[] = [];
    for (let i = 0; i < pool.length; i++) {
      if (!shownIndicesRef.current.has(i)) candidates.push(i);
    }
    // 다 봤으면 이력 초기화 후 처음부터
    if (candidates.length < DISPLAY_COUNT) {
      shownIndicesRef.current = new Set();
      candidates = pool.map((_, i) => i);
    }
    const picked = shuffle(candidates).slice(0, DISPLAY_COUNT);
    picked.forEach((i) => shownIndicesRef.current.add(i));

    return picked.map((i) => pool[i]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.images, rotationSeed]);

  return {
    loading,
    error,
    images: displayImages,
    poolSize: result?.images?.length ?? 0,
    /** pool에서 다른 3장으로 로테이션 (즉시, 무료) */
    rotate,
    /** 완전 새로운 pool을 서버에서 받아옴 (API 호출) */
    hardReload: () => load(true),
  };
}
