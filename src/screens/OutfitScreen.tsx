import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, getSignedUrl } from '../lib/supabase';
import type { Clothing, WearLog } from '../lib/types';

const WEATHER_ICON: Record<string, string> = {
  Clear: 'sunny', Clouds: 'cloudy', Rain: 'rainy', Drizzle: 'rainy-outline',
  Thunderstorm: 'thunderstorm', Snow: 'snow', Mist: 'water-outline',
  Fog: 'water-outline', Haze: 'water-outline',
};

const CONDITION_KR: Record<string, string> = {
  Clear: '맑음', Clouds: '흐림', Rain: '비', Drizzle: '이슬비',
  Thunderstorm: '뇌우', Snow: '눈', Mist: '안개', Fog: '안개', Haze: '연무',
};

const NAVY = '#3D5A80';
const NAVY_LIGHT = '#E8EDF2';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 20;

interface OutfitEntry {
  log: WearLog;
  items: (Clothing & { signedUrl: string })[];
}

export default function OutfitScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<OutfitEntry[]>([]);
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: logs, error } = await supabase
        .from('wear_log')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('worn_on', { ascending: false });
      if (error) throw error;

      const allIds = new Set<string>();
      (logs ?? []).forEach((log: WearLog) =>
        log.clothing_ids.forEach((id) => allIds.add(id))
      );

      const clothesMap = new Map<string, Clothing & { signedUrl: string }>();
      if (allIds.size > 0) {
        const { data: clothes } = await supabase
          .from('clothes')
          .select('*')
          .in('id', [...allIds]);
        await Promise.all(
          (clothes ?? []).map(async (c) => {
            clothesMap.set(c.id, {
              ...(c as Clothing),
              signedUrl: await getSignedUrl(c.image_path),
            });
          })
        );
      }

      const result: OutfitEntry[] = (logs ?? []).map((log: WearLog) => ({
        log,
        items: log.clothing_ids
          .map((id) => clothesMap.get(id))
          .filter((x): x is Clothing & { signedUrl: string } => !!x),
      }));

      setEntries(result);
    } catch (e: any) {
      Alert.alert('불러오기 실패', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const deleteEntry = (logId: string) => {
    Alert.alert('삭제', '이 아웃핏 기록을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.from('wear_log').delete().eq('id', logId);
            if (error) throw error;
            setEntries((prev) => prev.filter((e) => e.log.id !== logId));
          } catch (e: any) {
            Alert.alert('삭제 실패', e.message ?? String(e));
          }
        },
      },
    ]);
  };

  const openNoteEditor = (logId: string, currentNote: string | null) => {
    setEditLogId(logId);
    setEditNoteText(currentNote ?? '');
  };

  const saveNoteEdit = async () => {
    if (!editLogId) return;
    setSavingNote(true);
    try {
      const newNote = editNoteText.trim() || null;
      const { error } = await supabase
        .from('wear_log')
        .update({ note: newNote })
        .eq('id', editLogId);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => e.log.id === editLogId ? { ...e, log: { ...e.log, note: newNote } } : e)
      );
      setEditLogId(null);
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? String(e));
    } finally {
      setSavingNote(false);
    }
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    const weekday = ['일', '월', '화', '수', '목', '금', '토'];
    const dt = new Date(d);
    return `${y}.${m}.${day} (${weekday[dt.getDay()]})`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Outfit Memory</Text>
          <Text style={styles.subtitle}>기록한 코디를 날씨와 함께 확인하세요</Text>
        </View>
        {entries.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{entries.length}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: H_PAD,
          paddingTop: 8,
          paddingBottom: insets.bottom + 80,
        }}
      >
        {entries.length >= 3 && (() => {
          // 자주 입는 옷 통계
          const counts = new Map<string, { item: typeof entries[0]['items'][0]; count: number }>();
          entries.forEach((e) =>
            e.items.forEach((it) => {
              const cur = counts.get(it.id);
              if (cur) cur.count += 1;
              else counts.set(it.id, { item: it, count: 1 });
            })
          );
          const top3 = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
          if (top3.length === 0 || top3[0].count < 2) return null;
          return (
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Ionicons name="trending-up" size={16} color={NAVY} />
                <Text style={styles.statsTitle}>자주 입는 옷 TOP {top3.length}</Text>
              </View>
              <View style={styles.statsRow}>
                {top3.map((t, idx) => (
                  <View key={t.item.id} style={styles.statsItem}>
                    <View style={styles.statsRankBadge}>
                      <Text style={styles.statsRankText}>{idx + 1}</Text>
                    </View>
                    <Image source={{ uri: t.item.signedUrl }} style={styles.statsImage} />
                    <Text style={styles.statsCount}>{t.count}회</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {entries.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="albums-outline" size={40} color="#C0BDB8" />
            </View>
            <Text style={styles.emptyTitle}>아웃핏 기록이 없어요</Text>
            <Text style={styles.emptyDesc}>
              추천 탭에서 조합을 선택하면{'\n'}여기에 기록됩니다.
            </Text>
          </View>
        )}

        {entries.map((entry) => {
          const w = entry.log.weather;
          const weatherIcon = w ? (WEATHER_ICON[w.condition] ?? 'partly-sunny') : 'partly-sunny';

          const topItem = entry.items.find((i) => i.category === 'top') ?? null;
          const bottomItem = entry.items.find((i) => i.category === 'bottom') ?? null;
          const jacketItem = entry.items.find((i) => i.category === 'jacket') ?? null;

          return (
            <View key={entry.log.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.dateBadge}>
                  <Ionicons name="calendar-outline" size={13} color={NAVY} />
                  <Text style={styles.dateText}>{formatDate(entry.log.worn_on)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteEntry(entry.log.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={15} color="#C0BDB8" />
                </TouchableOpacity>
              </View>

              {w && (
                <View style={styles.weatherRow}>
                  <View style={styles.weatherIconWrap}>
                    <Ionicons name={weatherIcon as any} size={16} color={NAVY} />
                  </View>
                  <Text style={styles.weatherTemp}>
                    {w.temp_min_c}° / {w.temp_max_c}°C
                  </Text>
                  <Text style={styles.weatherCondition}>
                    {CONDITION_KR[w.condition] ?? w.condition}
                  </Text>
                </View>
              )}

              <MannequinView topItem={topItem} bottomItem={bottomItem} jacketItem={jacketItem} />

              {/* Note (편집 가능) */}
              <TouchableOpacity
                style={styles.noteBox}
                onPress={() => openNoteEditor(entry.log.id, entry.log.note)}
                activeOpacity={0.7}
              >
                <Ionicons name="bookmark-outline" size={13} color={NAVY} style={{ marginTop: 1 }} />
                <Text style={[styles.noteText, !entry.log.note && styles.notePlaceholder]} numberOfLines={3}>
                  {entry.log.note || '메모를 추가하려면 탭하세요'}
                </Text>
                <Ionicons name="pencil" size={12} color="#A8A4A0" />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Note Edit Modal */}
      <Modal
        visible={editLogId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditLogId(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="create-outline" size={20} color={NAVY} />
              <Text style={styles.modalTitle}>메모 수정</Text>
            </View>
            <TextInput
              style={styles.noteInput}
              value={editNoteText}
              onChangeText={setEditNoteText}
              placeholder="예: 데이트룩, 회의용, 출근복…"
              placeholderTextColor="#B5B0AB"
              multiline
              maxLength={200}
              autoFocus
            />
            <Text style={styles.charCount}>{editNoteText.length}/200</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setEditLogId(null)}
                disabled={savingNote}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={saveNoteEdit}
                disabled={savingNote}
                activeOpacity={0.8}
              >
                {savingNote ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnSaveText}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/** 마네킹 미리보기 — 비율 유지 (resizeMode: 'contain') */
function MannequinView({
  topItem, bottomItem, jacketItem,
}: {
  topItem: (Clothing & { signedUrl: string }) | null;
  bottomItem: (Clothing & { signedUrl: string }) | null;
  jacketItem: (Clothing & { signedUrl: string }) | null;
}) {
  const TOP_W = 150;
  const TOP_H = 150;
  const BOTTOM_W = 140;
  const BOTTOM_H = 190;
  const JACKET_W = 130;
  const JACKET_H = 130;
  return (
    <View style={mannequinStyles.root}>
      <View style={mannequinStyles.bg}>
        <View style={mannequinStyles.topRow}>
          {topItem ? (
            <Image
              source={{ uri: topItem.signedUrl }}
              style={[mannequinStyles.top, { width: TOP_W, height: TOP_H }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[mannequinStyles.top, mannequinStyles.empty, { width: TOP_W, height: TOP_H }]}>
              <Ionicons name="shirt-outline" size={32} color="#D5D0CB" />
            </View>
          )}
          {jacketItem && (
            <Image
              source={{ uri: jacketItem.signedUrl }}
              style={[mannequinStyles.jacket, { width: JACKET_W, height: JACKET_H }]}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={mannequinStyles.bottomRow}>
          {bottomItem ? (
            <Image
              source={{ uri: bottomItem.signedUrl }}
              style={[mannequinStyles.bottom, { width: BOTTOM_W, height: BOTTOM_H }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[mannequinStyles.bottom, mannequinStyles.empty, { width: BOTTOM_W, height: BOTTOM_H }]}>
              <Ionicons name="image-outline" size={28} color="#D5D0CB" />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const mannequinStyles = StyleSheet.create({
  root: { alignItems: 'center', marginVertical: 4 },
  bg: {
    width: '100%', backgroundColor: '#FAFAF8', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', gap: 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  top: { borderRadius: 24, backgroundColor: '#fff' },
  bottomRow: { alignItems: 'center' },
  bottom: { borderRadius: 24, backgroundColor: '#fff' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  jacketWrap: { marginLeft: 8, alignItems: 'center' },
  jacketBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: NAVY, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginBottom: 4,
  },
  jacketBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  jacket: { borderRadius: 20, backgroundColor: '#fff' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: H_PAD,
    paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#EDEAE6',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#7A7570', marginTop: 2 },
  countBadge: {
    backgroundColor: NAVY, width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  countText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: NAVY_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  emptyDesc: { fontSize: 13, color: '#7A7570', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#fff', padding: 16, borderRadius: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: NAVY_LIGHT, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  dateText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#F5F4F2',
    alignItems: 'center', justifyContent: 'center',
  },

  weatherRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FAFAF8', padding: 10, borderRadius: 12, marginBottom: 12,
  },
  weatherIconWrap: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: NAVY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  weatherTemp: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  weatherCondition: { fontSize: 12, color: '#7A7570', fontWeight: '500' },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: NAVY_LIGHT, padding: 10, borderRadius: 10, marginTop: 12,
  },
  noteText: { flex: 1, fontSize: 12, color: '#1A1A1A', lineHeight: 18 },

  statsCard: {
    backgroundColor: '#fff', padding: 14, borderRadius: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  statsTitle: { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statsItem: { flex: 1, alignItems: 'center', position: 'relative' },
  statsRankBadge: {
    position: 'absolute', top: -4, left: -4, zIndex: 2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center',
  },
  statsRankText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  statsImage: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#F5F4F2' },
  statsCount: { marginTop: 6, fontSize: 12, fontWeight: '700', color: NAVY },
  notePlaceholder: { color: '#A8A4A0', fontStyle: 'italic' },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  noteInput: {
    backgroundColor: '#F5F4F2', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#1A1A1A', minHeight: 90, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#A8A4A0', textAlign: 'right', marginTop: 6 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F0EDEA' },
  modalBtnSave: { backgroundColor: NAVY },
  modalBtnCancelText: { color: '#7A7570', fontWeight: '700', fontSize: 14 },
  modalBtnSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
