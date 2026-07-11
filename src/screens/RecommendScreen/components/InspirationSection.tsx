/**
 * 오늘의 스타일 영감 섹션.
 * Recommend 탭 상단, 내 옷장 추천 위에 표시.
 * 외부 사진 저작자 크레딧 필수 명시 (Unsplash/Pexels 이용약관).
 */
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BOTTEGA, H_PAD } from '../constants';
import type { InspirationImage } from '../useInspiration';

interface Props {
  loading: boolean;
  error: string | null;
  images: InspirationImage[] | null;
}

export default function InspirationSection({ loading, error, images }: Props) {
  if (loading) {
    return (
      <View style={{ paddingHorizontal: H_PAD, paddingBottom: 20 }}>
        <SectionTitle />
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

  if (error || !images || images.length === 0) {
    return null; // 실패 시 그냥 안 보여줌 (기본 추천은 계속 동작)
  }

  return (
    <View style={{ paddingBottom: 20 }}>
      <View style={{ paddingHorizontal: H_PAD }}>
        <SectionTitle />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 12 }}
      >
        {images.map((img, i) => (
          <View
            key={i}
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

function SectionTitle() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 6,
      }}
    >
      <Ionicons name="bulb" size={16} color={BOTTEGA} />
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A' }}>
        오늘의 스타일 영감
      </Text>
      <Text style={{ fontSize: 12, color: '#7A7570', marginLeft: 4 }}>
        · 성별 · 날씨 맞춤
      </Text>
    </View>
  );
}
