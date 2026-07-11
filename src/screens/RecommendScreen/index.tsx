/**
 * RecommendScreen - 얇은 조정자 (thin coordinator)
 *
 * 데이터 로딩 → useRecommendData 훅
 * UI 조각 → components/*.tsx
 * 스타일 → styles.ts
 * 상수 → constants.ts
 * 캐시 → cache.ts
 * 순수 함수 → helpers.ts
 */
import { useCallback, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Text, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { getForecastDates } from '../../lib/weather';

import { H_PAD, BOTTEGA } from './constants';
import { styles } from './styles';
import { useRecommendData } from './useRecommendData';

import Header from './components/Header';
import DatePicker from './components/DatePicker';
import WeatherCard from './components/WeatherCard';
import SectionHeader from './components/SectionHeader';
import SuggestionCard from './components/SuggestionCard';
import EmptyState from './components/EmptyState';
import NoteModal from './components/NoteModal';
import InspirationSection from './components/InspirationSection';
import { useInspiration } from './useInspiration';

export default function RecommendScreen() {
  const insets = useSafeAreaInsets();
  const forecastDates = getForecastDates();

  const [selectedDays, setSelectedDays] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'mannequin'>('grid');

  const [confirming, setConfirming] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [noteModalIdx, setNoteModalIdx] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');

  const {
    loading, weather, date, suggestions, clothesMap,
    selectDate, refresh, getCachedClothes,
  } = useRecommendData();

  const inspiration = useInspiration(weather);

  const handleSelectDate = (days: number) => {
    setSelectedDays(days);
    selectDate(days);
    setConfirmed(new Set());
  };

  // React.memo가 걸린 SuggestionCard의 재렌더를 막기 위해 참조 안정화
  const openNoteModal = useCallback((idx: number) => {
    setNoteText('');
    setNoteModalIdx(idx);
  }, []);

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
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? String(e));
    } finally {
      setConfirming(null);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 80 }}
    >
      <View style={styles.header}>
        <Header date={date} loading={loading} onRefresh={refresh} />
        <DatePicker
          dates={forecastDates}
          selectedDays={selectedDays}
          disabled={loading}
          onSelect={handleSelectDate}
        />
        {weather && <WeatherCard weather={weather} />}
      </View>

      {/* 오늘의 스타일 영감 (외부 사진, 성별/날씨 맞춤) */}
      <InspirationSection
        loading={inspiration.loading}
        error={inspiration.error}
        images={inspiration.result?.images ?? null}
        onRefresh={inspiration.refresh}
      />

      <View style={{ paddingHorizontal: H_PAD }}>
        {!loading && suggestions.length > 0 && (
          <SectionHeader viewMode={viewMode} onChangeViewMode={setViewMode} />
        )}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={BOTTEGA} />
            <Text style={styles.loadingText}>추천 조합을 만들고 있어요...</Text>
          </View>
        )}

        {suggestions.map((s, i) => (
          <SuggestionCard
            key={i}
            suggestion={s}
            index={i}
            clothesMap={clothesMap}
            viewMode={viewMode}
            confirming={confirming}
            confirmed={confirmed.has(i)}
            onConfirm={openNoteModal}
          />
        ))}

        {!loading && suggestions.length === 0 && (
          <EmptyState clothes={getCachedClothes()} weather={weather} />
        )}
      </View>

      <NoteModal
        visible={noteModalIdx !== null}
        value={noteText}
        onChange={setNoteText}
        onCancel={() => setNoteModalIdx(null)}
        onSave={saveWearLog}
      />
    </ScrollView>
  );
}
