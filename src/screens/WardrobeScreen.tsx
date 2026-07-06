import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase, getSignedUrl } from '../lib/supabase';
import { confirm } from '../lib/confirm';
import type { Clothing } from '../lib/types';

const COLORS = [
  { name: '블랙', hex: '#000000' },
  { name: '화이트', hex: '#FFFFFF' },
  { name: '그레이', hex: '#888888' },
  { name: '라이트그레이', hex: '#CCCCCC' },
  { name: '다크그레이', hex: '#444444' },
  { name: '네이비', hex: '#1B2A4A' },
  { name: '블루', hex: '#2962FF' },
  { name: '라이트블루', hex: '#82B1FF' },
  { name: '레드', hex: '#D32F2F' },
  { name: '와인', hex: '#722F37' },
  { name: '핑크', hex: '#F48FB1' },
  { name: '베이지', hex: '#D7C9AA' },
  { name: '크림', hex: '#FFFDD0' },
  { name: '브라운', hex: '#5D4037' },
  { name: '카키', hex: '#6B7B3A' },
  { name: '그린', hex: '#2E7D32' },
  { name: '민트', hex: '#98FF98' },
  { name: '옐로우', hex: '#FDD835' },
  { name: '오렌지', hex: '#EF6C00' },
  { name: '퍼플', hex: '#7B1FA2' },
];

const SEASON_FILTERS = [
  { key: 'all', label: '전체', icon: 'apps-outline' },
  { key: 'spring_fall', label: '봄/가을', icon: 'leaf-outline' },
  { key: 'summer', label: '여름', icon: 'sunny-outline' },
  { key: 'winter', label: '겨울', icon: 'snow-outline' },
];

const AMBER = '#C49A3C';
const AMBER_LIGHT = '#F5EFE0';
const AMBER_SELECTED = '#F0E8D6';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_PADDING = 16;
const CARD_W = (SCREEN_W - CARD_PADDING * 2 - CARD_GAP) / 2;

const COLOR_COLUMNS = 5;
const COLOR_GAP = 8;
const MODAL_PAD = 20;
const COLOR_BTN_W = (SCREEN_W - MODAL_PAD * 2 - COLOR_GAP * (COLOR_COLUMNS - 1)) / COLOR_COLUMNS;
const LIGHT_COLORS = ['#FFFFFF', '#FDD835', '#FFFDD0', '#98FF98', '#CCCCCC'];

const CAT_LABEL: Record<string, string> = { top: '상의', bottom: '하의', jacket: '자켓' };
const SEASON_LABEL: Record<string, string> = {
  spring_fall: '봄/가을', summer: '여름', winter: '겨울',
  spring: '봄/가을', fall: '봄/가을',
};
const SEASON_ICON: Record<string, string> = {
  spring_fall: 'leaf-outline', summer: 'sunny-outline', winter: 'snow-outline',
  spring: 'leaf-outline', fall: 'leaf-outline',
};

export default function WardrobeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [items, setItems] = useState<(Clothing & { signedUrl: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'color' | 'category'>('recent');

  const [editItem, setEditItem] = useState<(Clothing & { signedUrl: string }) | null>(null);
  const [editColor, setEditColor] = useState<typeof COLORS[0] | null>(null);
  const [editCategory, setEditCategory] = useState<string>('top');
  const [editSeasonTags, setEditSeasonTags] = useState<string[]>(['spring_fall']);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      let query = supabase
        .from('clothes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // 최근 100개만 (모바일 메모리 보호)

      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;

      // Signed URL을 배치로 처리 (동시 요청 수 제한)
      const clothesList = data ?? [];
      const withUrls: (Clothing & { signedUrl: string })[] = [];
      const BATCH_SIZE = 10;
      for (let i = 0; i < clothesList.length; i += BATCH_SIZE) {
        const batch = clothesList.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (c: any) => {
            try {
              // 배경 제거된 이미지가 있으면 우선 사용
              const path = c.processed_image_path || c.image_path;
              return {
                ...(c as Clothing),
                signedUrl: await getSignedUrl(path),
              };
            } catch (e) {
              console.warn('signed URL 실패:', c.id, e);
              return null;
            }
          })
        );
        results.forEach((r) => r && withUrls.push(r));
      }

      setItems(withUrls);
    } catch (e: any) {
      console.error('옷장 로드 실패:', e);
      Alert.alert('불러오기 실패', e.message ?? String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 첫 마운트 시 로드 + 포커스 시 5초 이내 재로드 방지
  const lastLoadRef = useRef(0);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastLoadRef.current > 5000) {
        lastLoadRef.current = now;
        load();
      }
    }, [load])
  );

  const filteredItems = useMemo(() => items
    .filter((item) => {
      // 계절 필터
      if (seasonFilter !== 'all') {
        const tags = item.season_tags ?? [];
        if (seasonFilter === 'spring_fall') {
          if (!(tags.includes('spring_fall') || tags.includes('spring') || tags.includes('fall'))) return false;
        } else if (!tags.includes(seasonFilter)) return false;
      }
      // 검색 필터
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const haystack = [
          ...(item.color_tags ?? []),
          CAT_LABEL[item.category] ?? item.category,
          item.description ?? '',
          ...(item.season_tags ?? []).map((s) => SEASON_LABEL[s] ?? ''),
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'color') {
        return (a.primary_color ?? '').localeCompare(b.primary_color ?? '');
      }
      // category
      const order: Record<string, number> = { top: 0, bottom: 1, jacket: 2 };
      return (order[a.category] ?? 99) - (order[b.category] ?? 99);
    }), [items, seasonFilter, searchQuery, sortBy]);

  // 계절 필터 카운트 (한 번만 계산)
  const seasonCounts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const f of SEASON_FILTERS) {
      if (f.key === 'all') continue;
      map[f.key] = items.filter((i) => {
        const tags = i.season_tags ?? [];
        if (f.key === 'spring_fall') return tags.includes('spring_fall') || tags.includes('spring') || tags.includes('fall');
        return tags.includes(f.key);
      }).length;
    }
    return map;
  }, [items]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const confirmDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    confirm(
      '삭제 확인',
      `${count}개의 옷을 삭제하시겠습니까?`,
      deleteSelected,
      { confirmText: '삭제', destructive: true }
    );
  };

  const deleteSelected = async () => {
    setDeleting(true);
    try {
      const selected = items.filter((i) => selectedIds.has(i.id));
      // Storage 삭제 (원본 + 배경 제거 이미지)
      const pathsToDelete: string[] = [];
      selected.forEach((s) => {
        pathsToDelete.push(s.image_path);
        if ((s as any).processed_image_path) pathsToDelete.push((s as any).processed_image_path);
      });
      if (pathsToDelete.length > 0) {
        await supabase.storage.from('clothes').remove(pathsToDelete);
      }
      const { error } = await supabase.from('clothes').delete().in('id', selected.map((s) => s.id));
      if (error) throw error;
      exitSelectMode();
      load();
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
  };

  const openEdit = (item: Clothing & { signedUrl: string }) => {
    const current = COLORS.find((c) => c.hex === item.primary_color) ?? COLORS[0];
    setEditItem(item);
    setEditColor(current);
    setEditCategory(item.category);
    setEditSeasonTags(item.season_tags?.length ? [...item.season_tags] : ['spring_fall']);
  };

  const saveEdit = async () => {
    if (!editItem || !editColor) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('clothes')
        .update({
          primary_color: editColor.hex,
          color_tags: [editColor.name],
          category: editCategory,
          season_tags: editSeasonTags,
          description: `${editColor.name} ${CAT_LABEL[editCategory] ?? '상의'}`,
        })
        .eq('id', editItem.id);
      if (error) throw error;
      setEditItem(null);
      load();
    } catch (e: any) {
      Alert.alert('수정 실패', e.message ?? String(e));
    } finally {
      setSavingEdit(false);
    }
  };

  const onCardPress = (item: Clothing & { signedUrl: string }) => {
    if (selectMode) toggleSelect(item.id);
    else openEdit(item);
  };

  const onCardLongPress = (item: Clothing) => {
    if (!selectMode) { setSelectMode(true); setSelectedIds(new Set([item.id])); }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={AMBER} /></View>;
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {selectMode ? (
          <>
            <TouchableOpacity onPress={exitSelectMode}>
              <Text style={styles.headerAction}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedIds.size}개 선택됨</Text>
            <TouchableOpacity onPress={confirmDelete} disabled={deleting || selectedIds.size === 0}>
              {deleting ? <ActivityIndicator size="small" color="#FF3B30" /> : (
                <Text style={[styles.headerDelete, selectedIds.size === 0 && { color: '#CCC' }]}>삭제</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>My Closet</Text>
              <Text style={styles.headerCount}>{items.length}벌</Text>
            </View>
            <View style={styles.headerRight}>
              {items.length > 0 && (
                <TouchableOpacity onPress={() => setSelectMode(true)} style={styles.headerIconBtn}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={AMBER} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  confirm(
                    '로그아웃',
                    '정말 로그아웃 하시겠습니까?',
                    () => { supabase.auth.signOut(); },
                    { confirmText: '로그아웃', destructive: true }
                  );
                }}
                style={styles.logoutBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <Text style={styles.logoutBtnText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Season Filter */}
      <View style={styles.filterRow}>
        {SEASON_FILTERS.map((f) => {
          const active = seasonFilter === f.key;
          const count = seasonCounts[f.key] ?? 0;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSeasonFilter(f.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={f.icon as any} size={14} color={active ? '#fff' : '#7A7570'} style={{ marginRight: 4 }} />
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label} {count > 0 ? count : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search + Sort */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#9A9590" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="색상·종류·메모 검색"
            placeholderTextColor="#B5B0AB"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#B5B0AB" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => {
            const order: ('recent' | 'color' | 'category')[] = ['recent', 'category', 'color'];
            const i = order.indexOf(sortBy);
            setSortBy(order[(i + 1) % order.length]);
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={sortBy === 'recent' ? 'time-outline' : sortBy === 'color' ? 'color-palette-outline' : 'apps-outline'}
            size={14}
            color={AMBER}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.sortBtnText}>
            {sortBy === 'recent' ? '최근순' : sortBy === 'color' ? '색상순' : '종류순'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: CARD_GAP }}
        contentContainerStyle={{ paddingHorizontal: CARD_PADDING, paddingTop: 4, paddingBottom: insets.bottom + 90, gap: CARD_GAP }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={AMBER} />}
        // 성능 최적화 - 모바일 크래시 방지 (더 aggressive)
        initialNumToRender={4}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={100}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="shirt-outline" size={40} color="#C0BDB8" />
            </View>
            <Text style={styles.emptyTitle}>옷장이 비어있어요</Text>
            <Text style={styles.emptyDesc}>아래 버튼을 눌러 옷을 추가해 보세요.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { width: CARD_W }]}
            activeOpacity={0.8}
            onPress={() => onCardPress(item)}
            onLongPress={() => onCardLongPress(item)}
          >
            <View>
              <Image source={{ uri: item.signedUrl }} style={[styles.cardImage, { width: CARD_W, height: CARD_W }]} />
              <View style={styles.cardSeasonBadge}>
                {(item.season_tags ?? ['spring_fall']).map((st, idx) => (
                  <View key={st} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {idx > 0 && <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, marginHorizontal: 1 }}>·</Text>}
                    <Ionicons name={(SEASON_ICON[st] ?? 'leaf-outline') as any} size={10} color="#fff" />
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.cardInfo}>
                {item.primary_color && <View style={[styles.cardDot, { backgroundColor: item.primary_color }]} />}
                <Text style={styles.cardColor} numberOfLines={1}>{item.color_tags?.[0] ?? ''}</Text>
              </View>
            </View>
            {selectMode && (
              <View style={[styles.checkCircle, selectedIds.has(item.id) && styles.checkCircleActive]}>
                {selectedIds.has(item.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      {!selectMode && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          onPress={() => nav.navigate('AddClothing')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Edit Modal */}
      <Modal visible={!!editItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>옷 정보 수정</Text>

              {editItem && (
                <Image
                  source={{ uri: editItem.signedUrl }}
                  style={[styles.modalImage, { width: SCREEN_W - MODAL_PAD * 2, height: (SCREEN_W - MODAL_PAD * 2) * 0.7 }]}
                />
              )}

              {/* 계절 수정 (복수 선택) */}
              <Text style={styles.modalSectionTitle}>계절 (복수 선택 가능)</Text>
              <View style={styles.catRow}>
                {(['spring_fall', 'summer', 'winter'] as const).map((szn) => {
                  const active = editSeasonTags.includes(szn);
                  const icons: Record<string, string> = { spring_fall: 'leaf-outline', summer: 'sunny-outline', winter: 'snow-outline' };
                  const labels: Record<string, string> = { spring_fall: '봄/가을', summer: '여름', winter: '겨울' };
                  return (
                    <TouchableOpacity
                      key={szn}
                      style={[styles.catChip, active && styles.catChipActive]}
                      onPress={() => {
                        setEditSeasonTags((prev) => {
                          if (prev.includes(szn)) {
                            const next = prev.filter((s) => s !== szn);
                            return next.length > 0 ? next : [szn]; // 최소 1개
                          }
                          return [...prev, szn];
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={icons[szn] as any} size={15} color={active ? '#fff' : '#7A7570'} style={{ marginRight: 6 }} />
                      <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                        {labels[szn]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 카테고리 수정 */}
              <Text style={styles.modalSectionTitle}>카테고리</Text>
              <View style={styles.catRow}>
                {(['top', 'bottom', 'jacket'] as const).map((cat) => {
                  const active = editCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catChip, active && styles.catChipActive]}
                      onPress={() => setEditCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                        {CAT_LABEL[cat]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 색상 수정 */}
              <Text style={styles.modalSectionTitle}>색상</Text>
              {editColor && (
                <View style={styles.currentColorRow}>
                  <View style={[styles.currentSwatch, { backgroundColor: editColor.hex }]} />
                  <Text style={styles.currentColorText}>{editColor.name}</Text>
                </View>
              )}

              <View style={styles.colorGrid}>
                {COLORS.map((c) => {
                  const sel = editColor?.hex === c.hex;
                  return (
                    <TouchableOpacity
                      key={c.hex}
                      style={[styles.colorBtn, { width: COLOR_BTN_W }, sel && styles.colorBtnActive]}
                      onPress={() => setEditColor(c)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.colorSwatch, { backgroundColor: c.hex }]}>
                        {sel && <Ionicons name="checkmark" size={14} color={LIGHT_COLORS.includes(c.hex) ? '#000' : '#fff'} />}
                      </View>
                      <Text style={[styles.colorBtnLabel, sel && styles.colorBtnLabelActive]} numberOfLines={1}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.modalSave} onPress={saveEdit} disabled={savingEdit} activeOpacity={0.85}>
                {savingEdit ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>저장</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditItem(null)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  headerCount: { fontSize: 12, color: '#7A7570', marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: AMBER_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  headerAction: { color: AMBER, fontWeight: '700', fontSize: 15 },
  headerDelete: { color: '#FF3B30', fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, height: 36, borderRadius: 12,
    backgroundColor: AMBER,
  },
  logoutBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#EDEAE6',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: AMBER_LIGHT,
  },
  filterChipActive: { backgroundColor: AMBER },
  filterText: { fontSize: 13, fontWeight: '600', color: '#7A7570' },
  filterTextActive: { color: '#fff' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#EDEAE6',
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F4F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1A1A', padding: 0 },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    backgroundColor: AMBER_LIGHT,
  },
  sortBtnText: { fontSize: 12, fontWeight: '700', color: AMBER },

  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12,
  },
  cardImage: { backgroundColor: '#F5F4F2' },
  cardSeasonBadge: {
    position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  cardSeasonText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardBottom: { paddingHorizontal: 10, paddingVertical: 10 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)' },
  cardColor: { color: '#1A1A1A', fontSize: 13, fontWeight: '600', flex: 1 },
  checkCircle: {
    position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleActive: { backgroundColor: AMBER },

  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: AMBER_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  emptyDesc: { fontSize: 13, color: '#7A7570', marginTop: 6 },

  fab: {
    position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: MODAL_PAD, maxHeight: '85%',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 14 },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  modalImage: { borderRadius: 14, backgroundColor: '#F5F4F2', marginBottom: 14, resizeMode: 'cover' },
  catRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  catChip: {
    flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, backgroundColor: '#F5F4F2',
    alignItems: 'center', justifyContent: 'center',
  },
  catChipActive: { backgroundColor: '#1A1A1A' },
  catChipText: { fontSize: 14, fontWeight: '700', color: '#7A7570' },
  catChipTextActive: { color: '#fff' },
  currentColorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, backgroundColor: '#FAFAF8', padding: 12, borderRadius: 12 },
  currentSwatch: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  currentColorText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: COLOR_GAP, marginBottom: 20 },
  colorBtn: { alignItems: 'center', paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent' },
  colorBtnActive: { borderColor: AMBER, backgroundColor: AMBER_SELECTED },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  colorBtnLabel: { fontSize: 9, color: '#7A7570', marginTop: 3 },
  colorBtnLabelActive: { color: AMBER, fontWeight: '600' },

  modalSave: {
    backgroundColor: '#1A1A1A', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 8,
  },
  modalSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalCancel: { backgroundColor: AMBER_LIGHT, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalCancelText: { color: '#6C6C80', fontSize: 15, fontWeight: '600' },
});
