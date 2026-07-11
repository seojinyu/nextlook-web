import { memo } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COMBO_LABELS, BOTTEGA } from '../constants';
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

function SuggestionCard({
  suggestion: s, index: i, clothesMap, viewMode,
  confirming, confirmed, onConfirm,
}: Props) {
  const slotSize = getSlotSize(s);
  const slots: { label: string; id: string | null }[] = [
    { label: '상의', id: s.top_id },
    { label: '하의', id: s.bottom_id },
  ];
  if (s.jacket_id) slots.push({ label: '자켓', id: s.jacket_id });

  const pieceCount = [s.top_id, s.bottom_id, s.jacket_id].filter(Boolean).length;
  const styleLabel = COMBO_LABELS[i] ?? String.fromCharCode(65 + i);

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 18,
        marginBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
      }}
    >
      {/* 카드 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#1A1A1A',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: '900',
                letterSpacing: -0.5,
              }}
            >
              {styleLabel}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 9, fontWeight: '700', color: BOTTEGA, letterSpacing: 1.5 }}>
              STYLE
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '800',
                color: '#1A1A1A',
                letterSpacing: -0.3,
              }}
            >
              Look {styleLabel}
            </Text>
          </View>
        </View>

        {/* 컬러 도트 + 피스 카운트 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {[s.top_id, s.bottom_id, s.jacket_id].map((id, idx) => {
            if (!id) return null;
            const item = clothesMap.get(id);
            if (!item?.primary_color) return null;
            return (
              <View
                key={idx}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: item.primary_color,
                  borderWidth: 1.5,
                  borderColor: '#fff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                }}
              />
            );
          })}
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              backgroundColor: '#F5F4F2',
              marginLeft: 2,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: '#7A7570',
                letterSpacing: 0.5,
              }}
            >
              {pieceCount} PCS
            </Text>
          </View>
        </View>
      </View>

      {/* 이미지 영역 */}
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

      {/* CTA 버튼 - 그라데이션 */}
      <TouchableOpacity
        onPress={() => onConfirm(i)}
        disabled={confirming !== null || confirmed}
        activeOpacity={0.85}
        style={{ marginTop: 16, borderRadius: 16, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={confirmed ? ['#4A8B5C', '#3D724D'] : ['#1A1A1A', '#333333']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 15,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
          }}
        >
          {confirming === i ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : confirmed ? (
            <>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text
                style={{
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: 13,
                  letterSpacing: 1,
                }}
              >
                SAVED
              </Text>
            </>
          ) : (
            <>
              <Text
                style={{
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: 13,
                  letterSpacing: 1,
                }}
              >
                WEAR THIS TODAY
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default memo(SuggestionCard, (prev, next) => {
  return (
    prev.viewMode === next.viewMode &&
    prev.confirmed === next.confirmed &&
    prev.confirming === next.confirming &&
    prev.index === next.index &&
    prev.suggestion.top_id === next.suggestion.top_id &&
    prev.suggestion.bottom_id === next.suggestion.bottom_id &&
    prev.suggestion.jacket_id === next.suggestion.jacket_id &&
    prev.clothesMap === next.clothesMap &&
    prev.onConfirm === next.onConfirm
  );
});
