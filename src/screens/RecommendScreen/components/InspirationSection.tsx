/**
 * 오늘의 스타일 영감 섹션.
 * - 30장 pool에서 무작위 3장 표시
 * - "🔄 다른 스타일" 버튼 = pool 내 rotation (즉시, 무료)
 * - 헤더에 pool 크기 표시 (예: "30 중 3")
 */
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BOTTEGA, H_PAD } from '../constants';
import type { InspirationImage } from '../useInspiration';

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
      <View style={{ paddingHorizontal: H_PAD, paddingBottom: 20 }}>
        <SectionTitle poolSize={0} />
        <View style={{
          height: 300,
          borderRadius: 18,
          backgroundColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ActivityIndicator size="large" color={BOTTEGA} />
          <Text style={{ color: '#7A7570', fontSize: 12, marginTop: 8 }}>
            오늘의 스타일 찾는 중...
          </Text>
        </View>
      </View>
    );
  }

  if (error || images.length === 0) return null;

  return (
    <View style={{ paddingBottom: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: H_PAD,
        }}
      >
        <SectionTitle poolSize={poolSize} />
        {onRotate && poolSize > 3 && (
          <TouchableOpacity
            onPress={onRotate}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: '#F0EDEA',
              marginBottom: 12,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="shuffle" size={12} color={BOTTEGA} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: BOTTEGA }}>
              다른 스타일
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 12 }}
      >
        {images.map((img, i) => (
          <View
            key={`${img.url}-${i}`}
            style={{
              width: 220,
              backgroundColor: '#fff',
              borderRadius: 18,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <Image
              source={{ uri: img.url }}
              style={{ width: 220, height: 300, backgroundColor: '#F5F4F2' }}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 10,
                gap: 6,
              }}
              onPress={() => Linking.openURL(img.credit_url)}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={12} color="#7A7570" />
              <Text
                style={{ flex: 1, fontSize: 11, color: '#7A7570' }}
                numberOfLines={1}
              >
                {img.photographer}
              </Text>
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  backgroundColor: img.source === 'unsplash' ? '#1A1A1A' : '#05A081',
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {img.source === 'unsplash' ? 'Unsplash' : 'Pexels'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function SectionTitle({ poolSize }: { poolSize: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 6,
        flex: 1,
      }}
    >
      <Ionicons name="bulb" size={16} color={BOTTEGA} />
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>
        오늘의 스타일 영감
      </Text>
      {poolSize > 0 && (
        <Text style={{ fontSize: 11, color: '#A8A4A0', marginLeft: 4 }}>
          · {poolSize}개 중
        </Text>
      )}
    </View>
  );
}
