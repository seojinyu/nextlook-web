/**
 * Complete the Look 섹션 - 코디-연결형 쇼핑 추천.
 *
 * 오늘의 추천 코디 + 옷장 + 날씨를 분석해 "부족한 것"을 그룹으로 제안.
 * - 각 그룹(아우터/하의/신발/악세서리)마다 "왜 필요한지" 코디 연결 문구 표시
 * - 쿠팡 파트너스 실제 상품
 */
import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LIME, INK, H_PAD } from '../constants';
import type { ShoppingProduct } from '../useShoppingRecs';
import type { WeatherSnapshot } from '../../../lib/types';

interface Props {
  loading: boolean;
  error: string | null;
  products: ShoppingProduct[];
  weather: WeatherSnapshot | null;
  userGender?: string | null;
  onRefresh?: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const GAP_META: Record<string, { label: string; icon: IoniconName }> = {
  outerwear: { label: '아우터', icon: 'shirt-outline' },
  top: { label: '상의', icon: 'shirt-outline' },
  bottom: { label: '하의', icon: 'layers-outline' },
  shoes: { label: '신발', icon: 'footsteps-outline' },
  accessory: { label: '포인트', icon: 'bag-handle-outline' },
  pick: { label: '추천', icon: 'sparkles-outline' },
};

interface Group {
  key: string;
  reason?: string;
  items: ShoppingProduct[];
}

export default function ShoppingSection({
  loading, error, products, weather, userGender, onRefresh,
}: Props) {
  const groups = useMemo<Group[]>(() => {
    const order: string[] = [];
    const map = new Map<string, ShoppingProduct[]>();
    for (const p of products) {
      const k = p.gapKey ?? 'pick';
      if (!map.has(k)) { map.set(k, []); order.push(k); }
      map.get(k)!.push(p);
    }
    return order.map((k) => ({
      key: k,
      reason: map.get(k)!.find((p) => p.gapReason)?.gapReason,
      items: map.get(k)!,
    }));
  }, [products]);

  if (loading) {
    return (
      <View style={{ paddingHorizontal: H_PAD, paddingBottom: 24 }}>
        <SectionHeader weather={weather} userGender={userGender} onRefresh={undefined} />
        <View
          style={{
            height: 240,
            borderRadius: 20,
            backgroundColor: '#1A1A1A',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 12, letterSpacing: 1 }}>
            코디 완성 아이템 찾는 중...
          </Text>
        </View>
      </View>
    );
  }

  if (error || products.length === 0) return null;

  return (
    <View style={{ paddingBottom: 28 }}>
      <View style={{ paddingHorizontal: H_PAD }}>
        <SectionHeader weather={weather} userGender={userGender} onRefresh={onRefresh} />
      </View>

      {/* 성별 미설정 시 안내 */}
      {(!userGender || userGender === 'other' || userGender === 'prefer_not_to_say') && (
        <View
          style={{
            marginHorizontal: H_PAD,
            marginBottom: 12,
            padding: 10,
            backgroundColor: 'rgba(196, 154, 60, 0.08)',
            borderRadius: 10,
            borderLeftWidth: 3,
            borderLeftColor: '#C49A3C',
          }}
        >
          <Text style={{ fontSize: 11, color: '#7A7570', lineHeight: 15 }}>
            <Text style={{ fontWeight: '800', color: '#C49A3C' }}>💡 팁: </Text>
            프로필에 성별 설정하면 남자/여자 맞춤 상품만 추천해드려요.
          </Text>
        </View>
      )}

      {groups.map((group) => (
        <View key={group.key} style={{ marginBottom: 18 }}>
          <GroupHeader gapKey={group.key} reason={group.reason} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 12 }}
            decelerationRate="fast"
            snapToInterval={172}
          >
            {group.items.map((p, i) => (
              <ProductCard key={`${p.id}-${i}`} product={p} />
            ))}
          </ScrollView>
        </View>
      ))}

      {/* 어필리에이트 명시 (미니멀 · 법적 필수) */}
      <View style={{ paddingHorizontal: H_PAD, marginTop: 2, opacity: 0.45 }}>
        <Text style={{ fontSize: 9, color: '#B5B0AB', letterSpacing: 0.2 }}>
          · 파트너스 활동으로 수수료를 받을 수 있어요
        </Text>
      </View>
    </View>
  );
}

/** gap 그룹 헤더 — 아이콘 칩 + 라벨 + 코디 연결 이유 */
function GroupHeader({ gapKey, reason }: { gapKey: string; reason?: string }) {
  const meta = GAP_META[gapKey] ?? GAP_META.pick;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: H_PAD,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          backgroundColor: LIME,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={meta.icon} size={16} color={INK} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: INK, letterSpacing: -0.3 }}>
          {meta.label}
        </Text>
        {reason && (
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#8A857F', marginTop: 1 }} numberOfLines={1}>
            {reason}
          </Text>
        )}
      </View>
    </View>
  );
}

function ProductCard({ product: p }: { product: ShoppingProduct }) {
  return (
    <TouchableOpacity
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
        <Text style={{ fontSize: 15, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.5 }}>
          {p.price.toLocaleString()}
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#7A7570' }}>원</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({
  weather,
  userGender,
  onRefresh,
}: {
  weather: WeatherSnapshot | null;
  userGender?: string | null;
  onRefresh?: () => void;
}) {
  const temp = weather ? Math.round((weather.temp_min_c + weather.temp_max_c) / 2) : null;
  const conditionKr =
    weather?.condition === 'Clear' ? '맑음'
    : weather?.condition === 'Clouds' ? '흐림'
    : weather?.condition === 'Rain' ? '비'
    : weather?.condition === 'Snow' ? '눈'
    : weather?.condition ?? '';

  const genderLabel = userGender === 'male' ? "MEN'S"
                    : userGender === 'female' ? "WOMEN'S"
                    : null;

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
          <View style={{ width: 24, height: 3, backgroundColor: INK, borderRadius: 2 }} />
          <Text style={{ fontSize: 10, fontWeight: '900', color: INK, letterSpacing: 2 }}>
            COMPLETE THE LOOK
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: INK, letterSpacing: -1.2 }}>
            코디 완성하기
          </Text>
          {genderLabel && (
            <View
              style={{
                backgroundColor: LIME,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '900', color: INK, letterSpacing: 1 }}>
                {genderLabel}
              </Text>
            </View>
          )}
          {temp !== null && (
            <View
              style={{
                backgroundColor: INK,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 0.5 }}>
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
            paddingHorizontal: 13,
            paddingVertical: 9,
            borderRadius: 20,
            backgroundColor: INK,
          }}
        >
          <Ionicons name="refresh" size={12} color={LIME} />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
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
