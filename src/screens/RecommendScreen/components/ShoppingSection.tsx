/**
 * TODAY'S PICK 섹션 - 오늘 날씨 맞춤 쇼핑 추천.
 * Style Mood 자리에 들어가는 새 섹션.
 *
 * - 네이버 쇼핑 API 기반 실제 상품
 * - 매거진 스타일 카드 UI
 * - 쇼핑몰 로고 배지
 * - 저작권 안전 (이미지는 네이버 호스팅)
 * - 하단에 어필리에이트 필수 명시
 */
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BOTTEGA, H_PAD } from '../constants';
import type { ShoppingProduct } from '../useShoppingRecs';
import type { WeatherSnapshot } from '../../../lib/types';

interface Props {
  loading: boolean;
  error: string | null;
  products: ShoppingProduct[];
  weather: WeatherSnapshot | null;
  onRefresh?: () => void;
}

export default function ShoppingSection({ loading, error, products, weather, onRefresh }: Props) {
  if (loading) {
    return (
      <View style={{ paddingHorizontal: H_PAD, paddingBottom: 24 }}>
        <SectionHeader weather={weather} onRefresh={undefined} />
        <View
          style={{
            height: 280,
            borderRadius: 20,
            backgroundColor: '#1A1A1A',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 12, letterSpacing: 1 }}>
            오늘의 아이템 찾는 중...
          </Text>
        </View>
      </View>
    );
  }

  if (error || products.length === 0) return null;

  return (
    <View style={{ paddingBottom: 28 }}>
      <View style={{ paddingHorizontal: H_PAD }}>
        <SectionHeader weather={weather} onRefresh={onRefresh} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 12 }}
        decelerationRate="fast"
        snapToInterval={172}
      >
        {products.map((p, i) => (
          <TouchableOpacity
            key={`${p.id}-${i}`}
            style={{
              width: 160,
              backgroundColor: '#fff',
              borderRadius: 16,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 3,
            }}
            onPress={() => Linking.openURL(p.productUrl)}
            activeOpacity={0.85}
          >
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: p.image }}
                style={{ width: 160, height: 200, backgroundColor: '#F5F4F2' }}
                resizeMode="cover"
              />
              {/* 쇼핑몰 배지 */}
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: getMallColor(p.mall),
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                  {p.mall}
                </Text>
              </View>
            </View>

            <View style={{ padding: 10 }}>
              {p.brand && (
                <Text
                  style={{ fontSize: 10, fontWeight: '700', color: '#7A7570', letterSpacing: 0.5, marginBottom: 3 }}
                  numberOfLines={1}
                >
                  {p.brand.toUpperCase()}
                </Text>
              )}
              <Text
                style={{ fontSize: 12, fontWeight: '600', color: '#1A1A1A', lineHeight: 16, marginBottom: 6 }}
                numberOfLines={2}
              >
                {p.title}
              </Text>
              <Text
                style={{ fontSize: 15, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.5 }}
              >
                {p.price.toLocaleString()}
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#7A7570' }}>원</Text>
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 어필리에이트 명시 (미니멀 · 법적 필수) */}
      <View style={{ paddingHorizontal: H_PAD, marginTop: 10, opacity: 0.45 }}>
        <Text style={{ fontSize: 9, color: '#B5B0AB', letterSpacing: 0.2 }}>
          · 파트너스 활동으로 수수료를 받을 수 있어요
        </Text>
      </View>
    </View>
  );
}

function SectionHeader({
  weather,
  onRefresh,
}: {
  weather: WeatherSnapshot | null;
  onRefresh?: () => void;
}) {
  const temp = weather ? Math.round((weather.temp_min_c + weather.temp_max_c) / 2) : null;
  const conditionKr =
    weather?.condition === 'Clear' ? '맑음'
    : weather?.condition === 'Clouds' ? '흐림'
    : weather?.condition === 'Rain' ? '비'
    : weather?.condition === 'Snow' ? '눈'
    : weather?.condition ?? '';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <View style={{ width: 24, height: 2, backgroundColor: BOTTEGA, borderRadius: 1 }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: BOTTEGA, letterSpacing: 2 }}>
            TODAY'S PICK
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.8 }}>
            Shop Today
          </Text>
          {temp !== null && (
            <View
              style={{
                backgroundColor: '#1A1A1A',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>
                {temp}° · {conditionKr}
              </Text>
            </View>
          )}
        </View>
      </View>

      {onRefresh && (
        <TouchableOpacity
          onPress={onRefresh}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: '#F0EDEA',
          }}
        >
          <Ionicons name="refresh" size={12} color={BOTTEGA} />
          <Text style={{ color: BOTTEGA, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
            새로 찾기
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function getMallColor(mall: string): string {
  if (mall.includes('쿠팡')) return '#F04747';
  if (mall.includes('무신사')) return '#1A1A1A';
  if (mall.includes('에이블리')) return '#FF4081';
  if (mall.includes('29CM')) return '#000';
  if (mall.includes('지그재그')) return '#FF3A44';
  if (mall.includes('W컨셉')) return '#000';
  if (mall.includes('지마켓')) return '#00A650';
  if (mall.includes('11번가')) return '#F43142';
  return '#7A7570';
}
