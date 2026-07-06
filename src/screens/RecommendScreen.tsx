// deno-lint-ignore-file no-explicit-any
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase, getSignedUrl } from '../lib/supabase';
import { confirm } from '../lib/confirm';
import { prefetchForecast, getWeatherFromCache, getForecastDates } from '../lib/weather';
import { generateRecommendations } from '../lib/recommend';
import type { Clothing, OutfitSuggestion, WeatherSnapshot } from '../lib/types';

const WEATHER_ICON: Record<string, string> = {
  Clear: 'sunny', Clouds: 'cloudy', Rain: 'rainy', Drizzle: 'rainy-outline',
  Thunderstorm: 'thunderstorm', Snow: 'snow', Mist: 'water-outline',
  Fog: 'water-outline', Haze: 'water-outline',
};

const CONDITION_KR: Record<string, string> = {
  Clear: '맑음', Clouds: '흐림', Rain: '비', Drizzle: '이슬비',
  Thunderstorm: '뇌우', Snow: '눈', Mist: '안개', Fog: '안개', Haze: '연무',
};

const COMBO_LABELS = ['A', 'B', 'C'];
const { width: SCREEN_W } = Dimensions.get('window');
const SLOT_GAP = 10;
const H_PAD = 20;
const BOTTEGA = '#1B6B4A';
const DATE_CHIP_SIZE = 52;

// Persistent caches (survive re-renders)
let cachedCoords: { latitude: number; longitude: number } | null = null;
// signedUrl 캐시는 크기 제한 (모바일 메모리 보호)
const SIGNED_URL_CACHE_MAX = 200;
const signedUrlCache = new Map<string, string>();
function setCachedSignedUrl(key: string, value: string) {
  if (signedUrlCache.size >= SIGNED_URL_CACHE_MAX) {
    // 가장 오래된 것 제거
    const firstKey = signedUrlCache.keys().next().value;
    if (firstKey) signedUrlCache.delete(firstKey);
  }
  signedUrlCache.set(key, value);
}
let cachedClothes: Clothing[] | null = null;
let cachedRecentIds: Set<string> | null = null;
let cachedClothesUrlMap = new Map<string, Clothing & { signedUrl: string }>();
let dataReady = false;

export default function RecommendScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [date, setDate] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState(1);
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [clothesMap, setClothesMap] = useState<
    Map<string, Clothing & { signedUrl: string }>
  >(new Map());
  const [confirming, setConfirming] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [noteModalIdx, setNoteModalIdx] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'mannequin'>('grid');
  const forecastDates = getForecastDates();

  const getLocation = async () => {
    if (cachedCoords) return cachedCoords;
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) throw new Error('위치 권한이 필요합니다.');
    const last = await Location.getLastKnownPositionAsync();
    if (last) { cachedCoords = last.coords; return cachedCoords; }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    cachedCoords = loc.coords;
    return cachedCoords;
  };

  const getCachedSignedUrl = async (path: string) => {
    const cached = signedUrlCache.get(path);
    if (cached) return cached;
    const url = await getSignedUrl(path);
    setCachedSignedUrl(path, url);
    return url;
  };

  /** First load: fetch everything + prefetch all 16 days of weather */
  const initialLoad = async () => {
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

      // Prefetch ALL weather + clothes + recent in parallel
      const [, clothesRes, recentRes] = await Promise.all([
        prefetchForecast(coords.latitude, coords.longitude),
        supabase.from('clothes').select('*').eq('user_id', userId),
        supabase.from('wear_log').select('clothing_ids').eq('user_id', userId).gte('worn_on', fourDaysAgo.toISOString().slice(0, 10)),
      ]);

      cachedClothes = (clothesRes.data ?? []) as Clothing[];
      cachedRecentIds = new Set<string>();
      (recentRes.data ?? []).forEach((r: any) => (r.clothing_ids as string[]).forEach((id: string) => cachedRecentIds!.add(id)));

      // Pre-cache all signed URLs for all clothes (prefer processed_image_path on web)
      const urlMap = new Map<string, Clothing & { signedUrl: string }>();
      await Promise.all(cachedClothes.map(async (c) => {
        const preferProcessed = Platform.OS === 'web' && c.processed_image_path;
        const path = preferProcessed ? c.processed_image_path! : c.image_path;
        const url = await getCachedSignedUrl(path);
        urlMap.set(c.id, { ...c, signedUrl: url });
      }));
      cachedClothesUrlMap = urlMap;
      dataReady = true;

      // Now generate for default day
      generateForDay(1);
    } catch (e: any) { Alert.alert('추천 실패', e.message ?? String(e)); }
    finally { setLoading(false); }
  };

  /** Switch date: instant, no API calls */
  const generateForDay = (days: number) => {
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
    setConfirmed(new Set());

    console.log('[RecommendScreen] 옷장 개수:', cachedClothes.length);
    const recs = generateRecommendations(cachedClothes, w, cachedRecentIds);
    console.log('[RecommendScreen] 추천 개수:', recs.length);
    setSuggestions(recs);

    // Build clothesMap from pre-cached URLs (instant)
    const m = new Map<string, Clothing & { signedUrl: string }>();
    recs.forEach((s) => {
      [s.top_id, s.bottom_id, s.jacket_id].forEach((id) => {
        if (id) { const item = cachedClothesUrlMap.get(id); if (item) m.set(id, item); }
      });
    });
    setClothesMap(m);
  };

  const selectDate = (days: number) => {
    setSelectedDays(days);
    if (dataReady) {
      generateForDay(days);
    } else {
      initialLoad();
    }
  };

  const refresh = async () => {
    cachedCoords = null;
    cachedClothes = null;
    cachedRecentIds = null;
    dataReady = false;
    signedUrlCache.clear();
    cachedClothesUrlMap.clear();
    await initialLoad();
  };

  useEffect(() => { initialLoad(); }, []);

  const openNoteModal = (idx: number) => {
    setNoteText('');
    setNoteModalIdx(idx);
  };

  const saveWearLog = async () => {
    if (noteModalIdx === null) return;
    const idx = noteModalIdx;
    const s = suggestions[idx];
    const ids = [s.top_id, s.bottom_id, s.jacket_id].filter((x): x is string => !!x);
    if (ids.length === 0) return;
    setConfirming(idx);
    setNoteModalIdx(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('not signed in');
      const { error } = await supabase.from('wear_log').insert({
        user_id: userData.user.id,
        clothing_ids: ids,
        worn_on: date,
        weather,
        note: noteText.trim() || null,
      });
      if (error) throw error;
      setConfirmed((prev) => new Set(prev).add(idx));
    } catch (e: any) { Alert.alert('저장 실패', e.message ?? String(e)); }
    finally { setConfirming(null); }
  };

  const formatDate = (d: string) => {
    const [, m, day] = d.split('-');
    const weekday = ['일', '월', '화', '수', '목', '금', '토'];
    return `${parseInt(m)}월 ${parseInt(day)}일 (${weekday[new Date(d).getDay()]})`;
  };

  const weatherIconName = weather ? (WEATHER_ICON[weather.condition] ?? 'partly-sunny') : 'partly-sunny';
  const getSlotCount = (s: OutfitSuggestion) => [s.top_id, s.bottom_id, s.jacket_id].filter(Boolean).length;
  const getSlotSize = (s: OutfitSuggestion) => {
    const n = getSlotCount(s);
    return (SCREEN_W - H_PAD * 2 - 16 * 2 - SLOT_GAP * (n - 1)) / n;
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 80 }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Outfit Recommend</Text>
            {date ? <Text style={styles.dateSubtext}>{formatDate(date)}</Text> : null}
          </View>
          <TouchableOpacity onPress={refresh} disabled={loading} style={styles.refreshBtn} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              confirm(
                '로그아웃',
                '정말 로그아웃 하시겠습니까?',
                () => { supabase.auth.signOut(); },
                { confirmText: '로그아웃', destructive: true }
              );
            }}
            style={styles.logoutBtnHeader}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={16} color="#fff" />
            <Text style={styles.logoutBtnHeaderText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker - Calendar Style */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePicker} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
          {forecastDates.map((fd) => {
            const active = selectedDays === fd.daysFromToday;
            return (
              <TouchableOpacity
                key={fd.date}
                style={[styles.dateItem, active && styles.dateItemActive]}
                onPress={() => selectDate(fd.daysFromToday)}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={[styles.dateItemWeekday, active && styles.dateItemWeekdayActive]}>{fd.weekday}</Text>
                <Text style={[styles.dateItemDay, active && styles.dateItemDayActive]}>{fd.day}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Weather Card */}
        {weather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherLeft}>
              <View style={styles.weatherIconCircle}>
                <Ionicons name={weatherIconName as any} size={22} color="#fff" />
              </View>
              <Text style={styles.weatherCondition}>{CONDITION_KR[weather.condition] ?? weather.condition}</Text>
            </View>
            <View style={styles.weatherRight}>
              <Text style={styles.weatherTempBig}>{weather.temp_min_c}° / {weather.temp_max_c}°</Text>
              <Text style={styles.weatherDetail}>
                강수 {weather.precipitation_mm}mm  ·  바람 {weather.wind_mps}m/s
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: H_PAD }}>
        {/* Section Label */}
        {!loading && suggestions.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>추천 조합</Text>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('grid')}
                activeOpacity={0.7}
              >
                <Ionicons name="grid-outline" size={14} color={viewMode === 'grid' ? '#fff' : '#7A7570'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'mannequin' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('mannequin')}
                activeOpacity={0.7}
              >
                <Ionicons name="body-outline" size={14} color={viewMode === 'mannequin' ? '#fff' : '#7A7570'} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={BOTTEGA} />
            <Text style={styles.loadingText}>추천 조합을 만들고 있어요...</Text>
          </View>
        )}

        {suggestions.map((s, i) => {
          const isConfirmed = confirmed.has(i);
          const slotSize = getSlotSize(s);
          const slots: { label: string; id: string | null }[] = [
            { label: '상의', id: s.top_id }, { label: '하의', id: s.bottom_id },
          ];
          if (s.jacket_id) slots.push({ label: '자켓', id: s.jacket_id });

          return (
            <View key={i} style={styles.suggestion}>
              <View style={styles.sugTop}>
                <View style={styles.comboBadge}>
                  <Text style={styles.comboBadgeText}>Style {COMBO_LABELS[i] ?? i + 1}</Text>
                </View>
                <View style={styles.sugTopRight}>
                  {[s.top_id, s.bottom_id, s.jacket_id].map((id, idx) => {
                    if (!id) return null;
                    const item = clothesMap.get(id);
                    if (!item?.primary_color) return null;
                    return (
                      <View key={idx} style={[styles.colorDot, { backgroundColor: item.primary_color }]} />
                    );
                  })}
                  <View style={styles.itemCountChip}>
                    <Ionicons name="shirt-outline" size={11} color="#7A7570" />
                    <Text style={styles.itemCountText}>
                      {[s.top_id, s.bottom_id, s.jacket_id].filter(Boolean).length}피스
                    </Text>
                  </View>
                </View>
              </View>
              {viewMode === 'grid' ? (
                <View style={styles.slots}>
                  {slots.map((slot, si) => {
                    const item = slot.id ? clothesMap.get(slot.id) : null;
                    return (
                      <View key={si} style={[styles.slotWrap, { width: slotSize }]}>
                        <View style={styles.slotLabelWrap}>
                          <Text style={styles.slotLabel}>{slot.label}</Text>
                        </View>
                        {item ? (
                          <Image source={{ uri: item.signedUrl }} style={[styles.slotImage, { width: slotSize, height: slotSize }]} resizeMode="cover" />
                        ) : (
                          <View style={[styles.slotImage, styles.slotEmpty, { width: slotSize, height: slotSize }]}>
                            <Ionicons name="image-outline" size={22} color="#D5D0CB" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <MannequinView
                  topItem={s.top_id ? clothesMap.get(s.top_id) ?? null : null}
                  bottomItem={s.bottom_id ? clothesMap.get(s.bottom_id) ?? null : null}
                  jacketItem={s.jacket_id ? clothesMap.get(s.jacket_id) ?? null : null}
                />
              )}
              <TouchableOpacity
                style={[styles.wearBtn, isConfirmed && styles.wearBtnDone]}
                onPress={() => openNoteModal(i)}
                disabled={confirming !== null || isConfirmed}
                activeOpacity={0.8}
              >
                {confirming === i ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : isConfirmed ? (
                  <View style={styles.wearBtnRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.wearBtnText}>  기록 완료!</Text>
                  </View>
                ) : (
                  <View style={styles.wearBtnRow}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.wearBtnText}>  이 조합 입을래요</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {!loading && suggestions.length === 0 && (() => {
          const totalClothes = cachedClothes?.length ?? 0;
          const topsCount = cachedClothes?.filter((c) => c.category === 'top').length ?? 0;
          const bottomsCount = cachedClothes?.filter((c) => c.category === 'bottom').length ?? 0;
          let title = '추천할 조합이 없어요';
          let desc = '옷장에 상의와 하의를 추가하면\n맞춤 조합을 추천해 드릴게요.';
          if (totalClothes === 0) {
            title = '옷장이 비어있어요';
            desc = '옷장 탭에서 옷을 등록해 주세요.';
          } else if (topsCount === 0 && bottomsCount === 0) {
            title = '상의와 하의가 필요해요';
            desc = `현재 옷장: ${totalClothes}개\n상의와 하의를 각 1개 이상 등록해 주세요.`;
          } else if (topsCount === 0) {
            title = '상의가 없어요';
            desc = `하의 ${bottomsCount}개 있음\n상의를 1개 이상 등록해 주세요.`;
          } else if (bottomsCount === 0) {
            title = '하의가 없어요';
            desc = `상의 ${topsCount}개 있음\n하의를 1개 이상 등록해 주세요.`;
          }
          return (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="shirt-outline" size={40} color="#C0BDB8" />
              </View>
              <Text style={styles.emptyTitle}>{title}</Text>
              <Text style={styles.emptyDesc}>{desc}</Text>
            </View>
          );
        })()}
      </View>

      {/* Note Modal */}
      <Modal
        visible={noteModalIdx !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteModalIdx(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="create-outline" size={20} color={BOTTEGA} />
              <Text style={styles.modalTitle}>코디 메모</Text>
            </View>
            <Text style={styles.modalDesc}>이 조합에 대해 기록할 내용이 있나요?{'\n'}(선택사항)</Text>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="예: 데이트룩, 회의용, 출근복…"
              placeholderTextColor="#B5B0AB"
              multiline
              maxLength={200}
              autoFocus
            />
            <Text style={styles.charCount}>{noteText.length}/200</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setNoteModalIdx(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={saveWearLog}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

/** 마네킹 스타일 미리보기 */
function MannequinView({
  topItem, bottomItem, jacketItem,
}: {
  topItem: (Clothing & { signedUrl: string }) | null;
  bottomItem: (Clothing & { signedUrl: string }) | null;
  jacketItem: (Clothing & { signedUrl: string }) | null;
}) {
  // 웹에서 배경 제거된 이미지가 있는 경우 → 매거진 플랫레이 레이아웃
  const isWeb = Platform.OS === 'web';
  const hasProcessed = isWeb && (
    !!topItem?.processed_image_path ||
    !!bottomItem?.processed_image_path ||
    !!jacketItem?.processed_image_path
  );

  if (hasProcessed) {
    return <MagazineLayoutView topItem={topItem} bottomItem={bottomItem} jacketItem={jacketItem} />;
  }

  // 기본 마네킹 뷰 (배경 있는 사진용)
  const TOP_W = 150;
  const TOP_H = 150;
  const BOTTOM_W = 140;
  const BOTTOM_H = 190;
  const JACKET_W = 130;
  const JACKET_H = 130;
  return (
    <View style={styles.mannequinRoot}>
      <View style={styles.mannequinBg}>
        <View style={styles.mannequinTopRow}>
          {topItem ? (
            <Image source={{ uri: topItem.signedUrl }} style={[styles.mannequinTop, { width: TOP_W, height: TOP_H }]} resizeMode="cover" />
          ) : (
            <View style={[styles.mannequinTop, styles.mannequinEmpty, { width: TOP_W, height: TOP_H }]}>
              <Ionicons name="shirt-outline" size={32} color="#D5D0CB" />
            </View>
          )}
          {jacketItem && (
            <Image source={{ uri: jacketItem.signedUrl }} style={[styles.jacketImage, { width: JACKET_W, height: JACKET_H }]} resizeMode="cover" />
          )}
        </View>

        <View style={styles.mannequinBottomRow}>
          {bottomItem ? (
            <Image source={{ uri: bottomItem.signedUrl }} style={[styles.mannequinBottom, { width: BOTTOM_W, height: BOTTOM_H }]} resizeMode="cover" />
          ) : (
            <View style={[styles.mannequinBottom, styles.mannequinEmpty, { width: BOTTOM_W, height: BOTTOM_H }]}>
              <Ionicons name="image-outline" size={28} color="#D5D0CB" />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/** 매거진 화보 스타일 플랫레이 - 세로 정렬 (첨부 이미지 스타일) */
function MagazineLayoutView({
  topItem, bottomItem, jacketItem,
}: {
  topItem: (Clothing & { signedUrl: string }) | null;
  bottomItem: (Clothing & { signedUrl: string }) | null;
  jacketItem: (Clothing & { signedUrl: string }) | null;
}) {
  return (
    <View style={styles.magazineRoot}>
      {/* 상의 (자켓이 있으면 아우터 옆에 정렬) */}
      <View style={styles.magazineTopRow}>
        {topItem ? (
          <Image
            source={{ uri: topItem.signedUrl }}
            style={styles.magazineTopImg}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.magazineTopImg, styles.magazineEmpty]}>
            <Ionicons name="shirt-outline" size={40} color="#D5D0CB" />
          </View>
        )}

        {jacketItem && (
          <Image
            source={{ uri: jacketItem.signedUrl }}
            style={styles.magazineJacketImg}
            resizeMode="contain"
          />
        )}
      </View>

      {/* 하의 (아래) */}
      {bottomItem ? (
        <Image
          source={{ uri: bottomItem.signedUrl }}
          style={styles.magazineBottomImg}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.magazineBottomImg, styles.magazineEmpty]}>
          <Ionicons name="image-outline" size={40} color="#D5D0CB" />
        </View>
      )}
    </View>
  );
}

/** 코디 주요 컬러를 보고 잘 어울리는 배경색 선택 */
function pickBackgroundFromOutfit(
  top: (Clothing & { signedUrl: string }) | null,
  bottom: (Clothing & { signedUrl: string }) | null,
  jacket: (Clothing & { signedUrl: string }) | null,
): string {
  const colors = [top, bottom, jacket].filter(Boolean).map((i) => i!.primary_color).filter(Boolean) as string[];
  if (colors.length === 0) return '#A88B6A'; // 기본 카멜브라운

  // 어두운 톤이 많으면 → 베이지/카멜
  // 밝은 톤이 많으면 → 그레이/올리브
  const darkCount = colors.filter((c) => {
    const rgb = parseInt(c.slice(1), 16);
    const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = rgb & 0xff;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 100;
  }).length;

  if (darkCount >= colors.length / 2) return '#A88B6A'; // 다크 → 카멜브라운
  return '#8A9A7B'; // 라이트 → 세이지그린
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8' },
  header: {
    backgroundColor: '#1A1A1A', paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 20,
  },
  headerInner: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, gap: 8 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  dateSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  logoutBtnHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoutBtnHeaderText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  datePicker: { marginBottom: 16 },
  dateItem: {
    width: DATE_CHIP_SIZE, height: DATE_CHIP_SIZE + 10, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  dateItemActive: { backgroundColor: BOTTEGA },
  dateItemWeekday: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  dateItemWeekdayActive: { color: 'rgba(255,255,255,0.8)' },
  dateItemDay: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  dateItemDayActive: { color: '#fff' },

  weatherCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 16, borderRadius: 16, alignItems: 'center',
  },
  weatherLeft: { alignItems: 'center', marginRight: 16 },
  weatherIconCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  weatherCondition: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  weatherRight: { flex: 1 },
  weatherTempBig: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  weatherDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  sectionCount: { fontSize: 13, fontWeight: '700', color: BOTTEGA },
  viewToggle: { flexDirection: 'row', backgroundColor: '#F0EDEA', borderRadius: 10, padding: 3 },
  viewToggleBtn: {
    width: 32, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  viewToggleBtnActive: { backgroundColor: BOTTEGA },

  // ─── 매거진 플랫레이 (웹, 배경 제거 이미지 전용) ───
  // 첨부 이미지 스타일: 상의 위 / 하의 아래 세로 정렬
  magazineRoot: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FAFAF8',
    borderRadius: 20,
    gap: 4,
  },
  magazineTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  magazineTopImg: {
    width: 180,
    height: 180,
  },
  magazineJacketImg: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  magazineBottomImg: {
    width: 180,
    height: 220,
    marginTop: -20,
  },
  magazineEmpty: {
    backgroundColor: '#F5F4F2',
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  mannequinRoot: { alignItems: 'center', marginVertical: 4 },
  mannequinBg: {
    width: '100%',
    backgroundColor: '#FAFAF8',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  mannequinTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mannequinTop: { borderRadius: 24, backgroundColor: '#fff' },
  mannequinBottomRow: { alignItems: 'center' },
  mannequinBottom: { borderRadius: 24, backgroundColor: '#fff' },
  mannequinEmpty: { alignItems: 'center', justifyContent: 'center' },
  jacketImage: { borderRadius: 20, backgroundColor: '#fff' },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 22,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  modalDesc: { fontSize: 12, color: '#7A7570', marginBottom: 14, lineHeight: 17 },
  noteInput: {
    backgroundColor: '#F5F4F2', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#1A1A1A', minHeight: 90, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#A8A4A0', textAlign: 'right', marginTop: 6 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F0EDEA' },
  modalBtnSave: { backgroundColor: BOTTEGA },
  modalBtnCancelText: { color: '#7A7570', fontWeight: '700', fontSize: 14 },
  modalBtnSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  loadingBox: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { color: '#7A7570', marginTop: 12, fontSize: 14 },
  suggestion: {
    backgroundColor: '#fff', padding: 16, borderRadius: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  sugTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  comboBadge: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: BOTTEGA,
    alignItems: 'center', justifyContent: 'center',
  },
  comboBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  sugTopRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  colorDot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  itemCountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F4F2', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, marginLeft: 4,
  },
  itemCountText: { fontSize: 11, fontWeight: '700', color: '#7A7570' },
  reasonText: { flex: 1, color: '#7A7570', fontSize: 12, lineHeight: 17 },
  slots: { flexDirection: 'row', gap: SLOT_GAP },
  slotWrap: { alignItems: 'center' },
  slotLabelWrap: { backgroundColor: '#E8F0EC', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  slotLabel: { fontSize: 11, fontWeight: '700', color: BOTTEGA, textAlign: 'center' },
  slotImage: { borderRadius: 22, backgroundColor: '#F5F4F2' },
  slotEmpty: { alignItems: 'center', justifyContent: 'center' },
  wearBtn: { backgroundColor: '#1A1A1A', paddingVertical: 13, borderRadius: 14, alignItems: 'center', marginTop: 14 },
  wearBtnDone: { backgroundColor: '#4A8B5C' },
  wearBtnRow: { flexDirection: 'row', alignItems: 'center' },
  wearBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0EDEA', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  emptyDesc: { fontSize: 13, color: '#7A7570', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
