import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COMBO_LABELS } from '../constants';
import { getSlotSize } from '../helpers';
import { styles } from '../styles';
import MannequinView from './MannequinView';
import type { Clothing, OutfitSuggestion } from '../../../lib/types';

type ClothesMap = Map<string, Clothing & { signedUrl: string }>;

interface Props {
  suggestion: OutfitSuggestion;
  index: number;
  clothesMap: ClothesMap;
  viewMode: 'grid' | 'mannequin';
  confirming: number | null;
  confirmed: boolean;
  onConfirm: (index: number) => void;
}

export default function SuggestionCard({
  suggestion: s,
  index: i,
  clothesMap,
  viewMode,
  confirming,
  confirmed,
  onConfirm,
}: Props) {
  const slotSize = getSlotSize(s);
  const slots: { label: string; id: string | null }[] = [
    { label: '상의', id: s.top_id },
    { label: '하의', id: s.bottom_id },
  ];
  if (s.jacket_id) slots.push({ label: '자켓', id: s.jacket_id });

  const pieceCount = [s.top_id, s.bottom_id, s.jacket_id].filter(Boolean).length;

  return (
    <View style={styles.suggestion}>
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
              <View
                key={idx}
                style={[styles.colorDot, { backgroundColor: item.primary_color }]}
              />
            );
          })}
          <View style={styles.itemCountChip}>
            <Ionicons name="shirt-outline" size={11} color="#7A7570" />
            <Text style={styles.itemCountText}>{pieceCount}피스</Text>
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
                  <Image
                    source={{ uri: item.signedUrl }}
                    style={[styles.slotImage, { width: slotSize, height: slotSize }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.slotImage,
                      styles.slotEmpty,
                      { width: slotSize, height: slotSize },
                    ]}
                  >
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
        style={[styles.wearBtn, confirmed && styles.wearBtnDone]}
        onPress={() => onConfirm(i)}
        disabled={confirming !== null || confirmed}
        activeOpacity={0.8}
      >
        {confirming === i ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : confirmed ? (
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
}
