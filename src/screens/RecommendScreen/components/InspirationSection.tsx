/**
 * STYLE MOOD 섹션 - 매거진 스타일 UI.
 * - 30장 pool에서 3장 랜덤 표시
 * - "SHUFFLE" 버튼으로 rotation
 * - 각 카드는 큰 이미지 + 그라데이션 오버레이 + 번호 배지
 */
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Linking, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BOTTEGA, H_PAD } from '../constants';
import type { InspirationImage } from '../useInspiration';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_W - H_PAD * 2 - 40, 280);
const CARD_H = CARD_W * 1.35;

interface Props {
  loading: boolean;
  error: string | null;
  images: InspirationImage[];
  poolSize: number;
  onRotate?: () => void;
}

export default function InspirationSection({ loading, error, images, poolSize, onRotate }: Props) {
  if (loading) {
    return (
      <View style={{ paddingHorizontal: H_PAD, paddingBottom: 24 }}>
        <SectionHeader poolSize={0} onRotate={undefined} />
        <View
          style={{
            height: CARD_H,
            borderRadius: 24,
            backgroundColor: '#1A1A1A',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 12, letterSpacing: 1 }}>
            CURATING TODAY'S LOOK...
          </Text>
        </View>
      </View>
    );
  }

  if (error || images.length === 0) return null;

  return (
    <View style={{ paddingBottom: 28 }}>
      <View style={{ paddingHorizontal: H_PAD }}>
        <SectionHeader poolSize={poolSize} onRotate={onRotate} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 14 }}
        decelerationRate="fast"
        snapToInterval={CARD_W + 14}
      >
        {images.map((img, i) => (
          <View key={`${img.url}-${i}`} style={{ width: CARD_W }}>
            <View
              style={{
                width: CARD_W,
                height: CARD_H,
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: '#F5F4F2',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 6,
                position: 'relative',
              }}
            >
              <Image
                source={{ uri: img.url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />

              {/* 번호 배지 (좌상단) */}
              <View
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#1A1A1A', letterSpacing: 1.5 }}>
                  {String(i + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
                </Text>
              </View>

              {/* 출처 뱃지 (우상단) */}
              <View
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  backgroundColor: img.source === 'unsplash' ? 'rgba(0,0,0,0.8)' : 'rgba(5,160,129,0.9)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }}>
                  {img.source === 'unsplash' ? 'UNSPLASH' : 'PEXELS'}
                </Text>
              </View>

              {/* 하단 그라데이션 + 저작자 정보 */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 120,
                  justifyContent: 'flex-end',
                  padding: 16,
                }}
              >
                <TouchableOpacity
                  onPress={() => Linking.openURL(img.credit_url)}
                  activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="person" size={14} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '600', letterSpacing: 1 }}>
                      PHOTOGRAPHER
                    </Text>
                    <Text
                      style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {img.photographer}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ poolSize, onRotate }: { poolSize: number; onRotate?: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <View style={{ flex: 1 }}>
        {/* 상단 라벨 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <View
            style={{
              width: 24,
              height: 2,
              backgroundColor: BOTTEGA,
              borderRadius: 1,
            }}
          />
          <Text style={{ fontSize: 10, fontWeight: '700', color: BOTTEGA, letterSpacing: 2 }}>
            TODAY'S CURATION
          </Text>
        </View>
        {/* 메인 타이틀 */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '900',
              color: '#1A1A1A',
              letterSpacing: -0.8,
            }}
          >
            Style Mood
          </Text>
          {poolSize > 0 && (
            <View
              style={{
                backgroundColor: '#1A1A1A',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>
                {poolSize} LOOKS
              </Text>
            </View>
          )}
        </View>
      </View>

      {onRotate && poolSize > 3 && (
        <TouchableOpacity
          onPress={onRotate}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: '#1A1A1A',
          }}
        >
          <Ionicons name="shuffle" size={13} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
            SHUFFLE
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
