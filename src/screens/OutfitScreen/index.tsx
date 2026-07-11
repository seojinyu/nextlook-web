/**
 * OutfitScreen - 얇은 조정자
 *
 * 크래시 방지 설계:
 * - FlatList 가상화로 화면에 보이는 항목만 마운트 (ScrollView는 전체 마운트)
 * - initialNumToRender=3, windowSize=3 → 최대 ~9개 카드만 메모리 상주
 * - React.memo(OutfitCard)로 재렌더 방지
 * - 이미지 개수: 100개 × 3장 = 300개 → 9개 × 3장 = 27개로 감소
 */
import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAVY, H_PAD } from './constants';
import { styles } from './styles';
import { useOutfitData } from './useOutfitData';
import { computePeriods, computeTop3Items, filterByPeriod } from './helpers';
import type { OutfitEntry } from './types';

import Header from './components/Header';
import PeriodFilter from './components/PeriodFilter';
import TopItemsCard from './components/TopItemsCard';
import OutfitCard from './components/OutfitCard';
import EmptyState from './components/EmptyState';
import NoteEditModal from './components/NoteEditModal';

export default function OutfitScreen() {
  const insets = useSafeAreaInsets();
  const {
    loading, loadingMore, entries, hasMore, loadMore, deleteEntry, saveNote,
  } = useOutfitData();

  const [periodFilter, setPeriodFilter] = useState('all');
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [editInitialNote, setEditInitialNote] = useState('');

  const periods = useMemo(() => computePeriods(entries), [entries]);
  const top3Items = useMemo(() => computeTop3Items(entries), [entries]);
  const filteredEntries = useMemo(
    () => filterByPeriod(entries, periodFilter),
    [entries, periodFilter],
  );

  // useCallback으로 함수 참조 안정화 → OutfitCard의 React.memo가 정상 작동
  const openNoteEditor = useCallback((logId: string, currentNote: string | null) => {
    setEditLogId(logId);
    setEditInitialNote(currentNote ?? '');
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: OutfitEntry }) => (
      <OutfitCard entry={item} onDelete={deleteEntry} onEditNote={openNoteEditor} />
    ),
    [deleteEntry, openNoteEditor],
  );

  const keyExtractor = useCallback((item: OutfitEntry) => item.log.id, []);

  const ListHeader = useMemo(
    () => (
      <>
        <TopItemsCard items={top3Items} />
        {entries.length === 0 && <EmptyState variant="no-entries" />}
        {entries.length > 0 && periodFilter !== 'all' && filteredEntries.length === 0 && (
          <EmptyState variant="no-period-match" />
        )}
      </>
    ),
    [top3Items, entries.length, periodFilter, filteredEntries.length],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header insetsTop={insets.top} entryCount={entries.length} />

      {periods.length > 0 && (
        <PeriodFilter
          periods={periods}
          totalCount={entries.length}
          active={periodFilter}
          onChange={setPeriodFilter}
        />
      )}

      <FlatList
        data={filteredEntries}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{
          paddingHorizontal: H_PAD,
          paddingTop: 8,
          paddingBottom: insets.bottom + 80,
        }}
        // 가상화 튜닝 - 모바일 메모리 보호 (극도로 보수적)
        initialNumToRender={2}
        maxToRenderPerBatch={1}
        windowSize={2}
        removeClippedSubviews
        updateCellsBatchingPeriod={150}
        // 무한 스크롤 - 화면 끝에서 15개씩 추가 로드
        onEndReached={periodFilter === 'all' ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={NAVY} />
            </View>
          ) : !hasMore && entries.length > 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: '#A8A4A0', fontSize: 12 }}>
                모든 기록을 다 봤어요
              </Text>
            </View>
          ) : null
        }
      />

      <NoteEditModal
        visible={editLogId !== null}
        logId={editLogId}
        initialNote={editInitialNote}
        onCancel={() => setEditLogId(null)}
        onSave={saveNote}
      />
    </View>
  );
}
