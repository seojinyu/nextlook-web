import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LIME, INK } from '../constants';

interface Props {
  viewMode: 'grid' | 'mannequin';
  onChangeViewMode: (mode: 'grid' | 'mannequin') => void;
}

export default function SectionHeader({ viewMode, onChangeViewMode }: Props) {
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
          <View style={{ width: 24, height: 3, backgroundColor: INK, borderRadius: 2 }} />
          <Text style={{ fontSize: 10, fontWeight: '900', color: INK, letterSpacing: 2 }}>
            FROM YOUR CLOSET
          </Text>
        </View>
        {/* 메인 타이틀 */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '900',
              color: INK,
              letterSpacing: -1.2,
            }}
          >
            MY PICKS
          </Text>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: LIME, marginBottom: 4 }} />
        </View>
      </View>

      {/* 뷰 모드 토글 */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#F0EDEA',
          borderRadius: 12,
          padding: 3,
          gap: 2,
        }}
      >
        <TouchableOpacity
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 9,
            backgroundColor: viewMode === 'grid' ? '#1A1A1A' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => onChangeViewMode('grid')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="grid-outline"
            size={13}
            color={viewMode === 'grid' ? '#fff' : '#7A7570'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 9,
            backgroundColor: viewMode === 'mannequin' ? '#1A1A1A' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => onChangeViewMode('mannequin')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="body-outline"
            size={13}
            color={viewMode === 'mannequin' ? '#fff' : '#7A7570'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
