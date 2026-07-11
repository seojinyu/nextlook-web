/**
 * WardrobeScreen 데이터 훅.
 * - 옷 목록 로드 (배치 signed URL)
 * - 선택 삭제 (Storage + DB)
 * - 편집 저장
 * - 포커스 시 5초 이내 재로드 방지
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, getSignedUrl } from '../../lib/supabase';
import { logMemory } from '../../lib/memoryMonitor';
import type { Clothing } from '../../lib/types';
import { CAT_LABEL } from './constants';

type Item = Clothing & { signedUrl: string };

export function useWardrobe() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    logMemory('Wardrobe.load.start');
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      let query = supabase
        .from('clothes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;

      const clothesList = (data ?? []) as Clothing[];
      const withUrls: Item[] = [];

      // 🚀 batch API - 100번 개별 fetch 대신 1번의 호출로 모든 signedUrl 획득
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
          if (url) withUrls.push({ ...c, signedUrl: url });
        });
      } catch (batchErr) {
        console.warn('[Wardrobe] batch signedUrl 실패, 개별 fallback:', batchErr);
        for (const c of clothesList) {
          try {
            const p = c.processed_image_path || c.image_path;
            withUrls.push({ ...c, signedUrl: await getSignedUrl(p) });
          } catch (e) {
            console.warn('signed URL 실패:', c.id, e);
          }
        }
      }

      setItems(withUrls);
      logMemory('Wardrobe.load.done');
    } catch (e: any) {
      console.error('옷장 로드 실패:', e);
      Alert.alert('불러오기 실패', e.message ?? String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const lastLoadRef = useRef(0);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastLoadRef.current > 5000) {
        lastLoadRef.current = now;
        load();
      }
    }, [load]),
  );

  const deleteItems = useCallback(async (idsToDelete: Set<string>) => {
    setDeleting(true);
    try {
      const selected = items.filter((i) => idsToDelete.has(i.id));
      const paths: string[] = [];
      selected.forEach((s) => {
        paths.push(s.image_path);
        if ((s as any).processed_image_path) paths.push((s as any).processed_image_path);
      });
      if (paths.length > 0) {
        await supabase.storage.from('clothes').remove(paths);
      }
      const { error } = await supabase
        .from('clothes')
        .delete()
        .in('id', selected.map((s) => s.id));
      if (error) throw error;
      await load();
    } catch (e: any) {
      console.error('삭제 실패:', e);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`삭제 실패: ${e.message ?? String(e)}`);
      } else {
        Alert.alert('삭제 실패', e.message ?? String(e));
      }
    } finally {
      setDeleting(false);
    }
  }, [items, load]);

  const saveEdit = useCallback(async (
    id: string,
    payload: { primary_color: string; color_name: string; category: string; season_tags: string[] },
  ) => {
    const { error } = await supabase
      .from('clothes')
      .update({
        primary_color: payload.primary_color,
        color_tags: [payload.color_name],
        category: payload.category,
        season_tags: payload.season_tags,
        description: `${payload.color_name} ${CAT_LABEL[payload.category] ?? '상의'}`,
      })
      .eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const refresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  return { items, loading, refreshing, deleting, load, refresh, deleteItems, saveEdit };
}
