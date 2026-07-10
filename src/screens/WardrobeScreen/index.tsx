/**
 * WardrobeScreen - 얇은 조정자
 *
 * 데이터 로딩 → useWardrobe 훅
 * 필터/정렬 → helpers.ts
 * UI 조각 → components/*.tsx
 */
import { useMemo, useState } from 'react';
import {
  View, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { confirm } from '../../lib/confirm';
import type { Clothing } from '../../lib/types';
import { AMBER, CARD_GAP, CARD_PADDING } from './constants';
import { styles } from './styles';
import { useWardrobe } from './useWardrobe';
import { filterAndSortItems, computeSeasonCounts } from './helpers';

import Header from './components/Header';
import SeasonFilter from './components/SeasonFilter';
import SearchAndSort from './components/SearchAndSort';
import ClothingCard from './components/ClothingCard';
import EmptyState from './components/EmptyState';
import EditModal from './components/EditModal';

type Item = Clothing & { signedUrl: string };
type SortKey = 'recent' | 'color' | 'category';

export default function WardrobeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();

  const { items, loading, refreshing, deleting, refresh, deleteItems, saveEdit } = useWardrobe();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [editItem, setEditItem] = useState<Item | null>(null);

  const filteredItems = useMemo(
    () => filterAndSortItems(items, { seasonFilter, searchQuery, sortBy }),
    [items, seasonFilter, searchQuery, sortBy],
  );

  const seasonCounts = useMemo(() => computeSeasonCounts(items), [items]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    confirm(
      '삭제 확인',
      `${count}개의 옷을 삭제하시겠습니까?`,
      async () => {
        await deleteItems(selectedIds);
        exitSelectMode();
      },
      { confirmText: '삭제', destructive: true },
    );
  };

  const onCardPress = (item: Item) => {
    if (selectMode) toggleSelect(item.id);
    else setEditItem(item);
  };

  const onCardLongPress = (item: Item) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([item.id]));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AMBER} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header
        insetsTop={insets.top}
        totalCount={items.length}
        selectMode={selectMode}
        selectedCount={selectedIds.size}
        deleting={deleting}
        onEnterSelectMode={() => setSelectMode(true)}
        onExitSelectMode={exitSelectMode}
        onConfirmDelete={confirmDelete}
      />

      <SeasonFilter active={seasonFilter} counts={seasonCounts} onChange={setSeasonFilter} />
      <SearchAndSort
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        sortBy={sortBy}
        onChangeSort={setSortBy}
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: CARD_GAP }}
        contentContainerStyle={{
          paddingHorizontal: CARD_PADDING,
          paddingTop: 4,
          paddingBottom: insets.bottom + 90,
          gap: CARD_GAP,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={AMBER} />
        }
        initialNumToRender={4}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
        updateCellsBatchingPeriod={100}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <ClothingCard
            item={item}
            selectMode={selectMode}
            selected={selectedIds.has(item.id)}
            onPress={() => onCardPress(item)}
            onLongPress={() => onCardLongPress(item)}
          />
        )}
      />

      {!selectMode && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          onPress={() => nav.navigate('AddClothing')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <EditModal
        item={editItem}
        insetsBottom={insets.bottom}
        onClose={() => setEditItem(null)}
        onSave={saveEdit}
      />
    </View>
  );
}
