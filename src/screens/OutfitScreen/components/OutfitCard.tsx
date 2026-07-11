import { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CONDITION_KR, NAVY } from '../constants';
import { formatDate, getWeatherIcon } from '../helpers';
import { styles } from '../styles';
import MannequinView from './MannequinView';
import type { OutfitEntry } from '../types';

interface Props {
  entry: OutfitEntry;
  onDelete: (logId: string) => void;
  onEditNote: (logId: string, currentNote: string | null) => void;
}

function OutfitCard({ entry, onDelete, onEditNote }: Props) {
  const w = entry.log.weather;
  const weatherIcon = getWeatherIcon(w?.condition);

  const topItem = entry.items.find((i) => i.category === 'top') ?? null;
  const bottomItem = entry.items.find((i) => i.category === 'bottom') ?? null;
  const jacketItem = entry.items.find((i) => i.category === 'jacket') ?? null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={13} color={NAVY} />
          <Text style={styles.dateText}>{formatDate(entry.log.worn_on)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => onDelete(entry.log.id)}
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

      <TouchableOpacity
        style={styles.noteBox}
        onPress={() => onEditNote(entry.log.id, entry.log.note)}
        activeOpacity={0.7}
      >
        <Ionicons name="bookmark-outline" size={13} color={NAVY} style={{ marginTop: 1 }} />
        <Text
          style={[styles.noteText, !entry.log.note && styles.notePlaceholder]}
          numberOfLines={3}
        >
          {entry.log.note || '메모를 추가하려면 탭하세요'}
        </Text>
        <Ionicons name="pencil" size={12} color="#A8A4A0" />
      </TouchableOpacity>
    </View>
  );
}

/**
 * React.memo로 재렌더 방지.
 * 스크롤 시 다른 카드가 재렌더되어도 이 카드는 스킵 → 이미지 재로드 안 됨 → 메모리 안정.
 * entry.log.id + note가 같고 콜백 참조 안정하면 스킵.
 */
export default memo(OutfitCard, (prev, next) => {
  return (
    prev.entry.log.id === next.entry.log.id &&
    prev.entry.log.note === next.entry.log.note &&
    prev.entry.items.length === next.entry.items.length &&
    prev.onDelete === next.onDelete &&
    prev.onEditNote === next.onEditNote
  );
});
