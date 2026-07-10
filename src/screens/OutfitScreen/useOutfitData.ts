/**
 * OutfitScreen 데이터 훅.
 * - wear_log + 관련 옷 로드 (배치 signed URL)
 * - 항목 삭제
 * - 메모 수정
 */
import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, getSignedUrl } from '../../lib/supabase';
import { confirm } from '../../lib/confirm';
import type { Clothing, WearLog } from '../../lib/types';
import type { OutfitEntry } from './types';

export function useOutfitData() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<OutfitEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: logs, error } = await supabase
        .from('wear_log')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('worn_on', { ascending: false })
        .limit(100);
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

        const clothesList = clothes ?? [];
        const BATCH_SIZE = 10;
        for (let i = 0; i < clothesList.length; i += BATCH_SIZE) {
          const batch = clothesList.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (c: any) => {
              try {
                const path = c.processed_image_path || c.image_path;
                clothesMap.set(c.id, {
                  ...(c as Clothing),
                  signedUrl: await getSignedUrl(path),
                });
              } catch (e) {
                console.warn('signed URL 실패:', c.id, e);
              }
            }),
          );
        }
      }

      const result: OutfitEntry[] = (logs ?? []).map((log: WearLog) => ({
        log,
        items: log.clothing_ids
          .map((id) => clothesMap.get(id))
          .filter((x): x is Clothing & { signedUrl: string } => !!x),
      }));

      setEntries(result);
    } catch (e: any) {
      console.error('Outfit Memory 로드 실패:', e);
      Alert.alert('불러오기 실패', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
