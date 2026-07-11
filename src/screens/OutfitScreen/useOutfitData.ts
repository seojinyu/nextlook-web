/**
 * OutfitScreen 데이터 훅.
 * - 페이지네이션 (초기 15개, 스크롤 시 15개씩 추가 로드) — 메모리 안전
 * - Supabase batch signedUrl API 사용
 * - 항목 삭제
 * - 메모 수정
 * - blur 시 entries 클리어 (이미지 메모리 즉시 해제)
 */
import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, getSignedUrl } from '../../lib/supabase';
import { confirm } from '../../lib/confirm';
import { logMemory } from '../../lib/memoryMonitor';
import type { Clothing, WearLog } from '../../lib/types';
import type { OutfitEntry } from './types';

const PAGE_SIZE = 15;

export function useOutfitData() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [entries, setEntries] = useState<OutfitEntry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (offset: number, limit: number): Promise<OutfitEntry[]> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data: logs, error } = await supabase
      .from('wear_log')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('worn_on', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const logsList = (logs ?? []) as WearLog[];
    if (logsList.length === 0) return [];

    const allIds = new Set<string>();
    logsList.forEach((log) => log.clothing_ids.forEach((id) => allIds.add(id)));

    const clothesMap = new Map<string, Clothing & { signedUrl: string }>();
    if (allIds.size > 0) {
      const { data: clothes } = await supabase
        .from('clothes')
        .select('*')
        .in('id', [...allIds]);
      const clothesList = (clothes ?? []) as Clothing[];
      const paths = clothesList.map((c) => c.processed_image_path || c.image_path);
      try {
        const { data: urlData } = await supabase.storage
          .from('clothes')
          .createSignedUrls(paths, 3600);
        const urlByPath = new Map<string, string>();
        (urlData ?? []).forEach((u: any) => {
          if (u.signedUrl && u.path) urlByPath.set(u.path, u.signedUrl);
        });
        clothesList.forEach((c) => {
          const p = c.processed_image_path || c.image_path;
          const url = urlByPath.get(p);
          if (url) clothesMap.set(c.id, { ...c, signedUrl: url });
        });
      } catch (batchErr) {
        console.warn('[Outfit] batch fail, fallback:', batchErr);
        for (const c of clothesList) {
          try {
            const p = c.processed_image_path || c.image_path;
            clothesMap.set(c.id, { ...c, signedUrl: await getSignedUrl(p) });
          } catch {}
        }
      }
    }

    return logsList.map((log) => ({
      log,
      items: log.clothing_ids
        .map((id) => clothesMap.get(id))
        .filter((x): x is Clothing & { signedUrl: string } => !!x),
    }));
  }, []);

  const load = useCallback(async () => {
    logMemory('Outfit.load.start');
    setLoading(true);
    try {
      const first = await fetchPage(0, PAGE_SIZE);
      setEntries(first);
      offsetRef.current = first.length;
      setHasMore(first.length === PAGE_SIZE);
      logMemory('Outfit.load.done');
    } catch (e: any) {
      console.error('Outfit Memory 로드 실패:', e);
      Alert.alert('불러오기 실패', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchPage(offsetRef.current, PAGE_SIZE);
      if (next.length === 0) {
        setHasMore(false);
      } else {
        setEntries((prev) => [...prev, ...next]);
        offsetRef.current += next.length;
        setHasMore(next.length === PAGE_SIZE);
      }
      logMemory('Outfit.loadMore.done');
    } catch (e: any) {
      console.error('추가 로드 실패:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchPage]);

  // useFocusEffect: 진입 시 로드 (5초 debounce) + blur 시 정리
  const lastLoadRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastLoadRef.current > 5000) {
        lastLoadRef.current = now;
        offsetRef.current = 0;
        setHasMore(true);
        load();
      }
      return () => {
        console.log('[Outfit] blur - entries clear (메모리 해제)');
        setEntries([]);
        offsetRef.current = 0;
        lastLoadRef.current = 0;
      };
    }, [load]),
  );

  const deleteEntry = useCallback((logId: string) => {
    confirm(
      '코디 기록 삭제',
      '이 아웃핏 기록을 삭제하시겠습니까?',
      async () => {
        try {
          const { error } = await supabase.from('wear_log').delete().eq('id', logId);
          if (error) throw error;
          setEntries((prev) => prev.filter((e) => e.log.id !== logId));
        } catch (e: any) {
          console.error('삭제 실패:', e);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(`삭제 실패: ${e.message ?? String(e)}`);
          } else {
            Alert.alert('삭제 실패', e.message ?? String(e));
          }
        }
      },
      { confirmText: '삭제', destructive: true },
    );
  }, []);

  const saveNote = useCallback(async (logId: string, note: string | null) => {
    const { error } = await supabase.from('wear_log').update({ note }).eq('id', logId);
    if (error) throw error;
    setEntries((prev) =>
      prev.map((e) => (e.log.id === logId ? { ...e, log: { ...e.log, note } } : e)),
    );
  }, []);

  return { loading, loadingMore, entries, hasMore, loadMore, deleteEntry, saveNote };
}
