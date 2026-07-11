/**
 * OutfitScreen 데이터 훅.
 * - wear_log + 관련 옷 로드 (배치 signed URL)
 * - 항목 삭제
 * - 메모 수정
 */
import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, getSignedUrl } from '../../lib/supabase';
import { confirm } from '../../lib/confirm';
import { logMemory } from '../../lib/memoryMonitor';
import type { Clothing, WearLog } from '../../lib/types';
import type { OutfitEntry } from './types';

export function useOutfitData() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<OutfitEntry[]>([]);

  const load = useCallback(async () => {
    logMemory('Outfit.load.start');
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // 100 → 50개로 축소 (메모리 보호)
      const { data: logs, error } = await supabase
        .from('wear_log')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('worn_on', { ascending: false })
        .limit(50);
      if (error) throw error;

      const allIds = new Set<string>();
      (logs ?? []).forEach((log: WearLog) =>
        log.clothing_ids.forEach((id) => allIds.add(id)),
      );

      const clothesMap = new Map<string, Clothing & { signedUrl: string }>();
      if (allIds.size > 0) {
        const { data: clothes } = await supabase
          .from('clothes')
          .select('*')
          .in('id', [...allIds]);

        const clothesList = (clothes ?? []) as Clothing[];

        // 🚀 개별 fetch(100+ 네트워크 왕복) 대신 batch API로 한 번에 처리.
        // 이전: 100개 옷 → 100번 createSignedUrl 호출 → 로딩 중 메모리 스파이크
        // 개선: createSignedUrls 한 번 호출 → 네트워크·메모리 부담 90% 감소
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
          console.warn('[Outfit] batch signedUrl 실패, 개별 fetch로 fallback:', batchErr);
          // fallback: 하나씩 (원래 로직)
          for (const c of clothesList) {
            try {
              const p = c.processed_image_path || c.image_path;
              clothesMap.set(c.id, { ...c, signedUrl: await getSignedUrl(p) });
            } catch (e) {
              console.warn('signed URL 실패:', c.id, e);
            }
          }
        }
      }

      const result: OutfitEntry[] = (logs ?? []).map((log: WearLog) => ({
        log,
        items: log.clothing_ids
          .map((id) => clothesMap.get(id))
          .filter((x): x is Clothing & { signedUrl: string } => !!x),
      }));

      setEntries(result);
      logMemory('Outfit.load.done');
    } catch (e: any) {
      console.error('Outfit Memory 로드 실패:', e);
      Alert.alert('불러오기 실패', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // 5초 이내 재방문은 스킵 + blur 시 entries 클리어 (React Navigation v7에서
  // unmountOnBlur 옵션 제거되어 여기서 수동으로 이미지 메모리 해제)
  const lastLoadRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastLoadRef.current > 5000) {
        lastLoadRef.current = now;
        load();
      }
      // cleanup: 탭 벗어날 때 entries 비워서 Image 컴포넌트 언마운트 → GPU 텍스처 해제
      return () => {
        console.log('[Outfit] blur - entries clear (메모리 해제)');
        setEntries([]);
        lastLoadRef.current = 0; // 재방문 시 즉시 재로드하도록
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

  return { loading, entries, deleteEntry, saveNote };
}
