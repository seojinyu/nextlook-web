import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { H_PAD, PREVIEW_SIZE, type ColorEntry } from '../constants';
import { styles } from '../styles';
import DetectedBox from './DetectedBox';
import SeasonPicker from './SeasonPicker';
import CategoryPicker from './CategoryPicker';
import ColorGrid from './ColorGrid';
import type { ClothingCategory } from '../../../lib/types';

interface Props {
  insetsBottom: number;
  localUri: string | null;
  detectedColor: ColorEntry | null;
  selectedColor: ColorEntry | null;
  onChangeColor: (c: ColorEntry) => void;
  detectedCategory: ClothingCategory;
  onChangeCategory: (c: ClothingCategory) => void;
  seasonTags: string[];
  onChangeSeasonTags: (t: string[]) => void;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export default function ConfirmStep({
  insetsBottom, localUri,
  detectedColor, selectedColor, onChangeColor,
  detectedCategory, onChangeCategory,
  seasonTags, onChangeSeasonTags,
  saving, onSave, onReset,
}: Props) {
  return (
    <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: H_PAD, paddingBottom: 16 }}>
        {localUri && (
          <Image
            source={{ uri: localUri }}
            style={[
              styles.confirmImage,
              { width: PREVIEW_SIZE, height: PREVIEW_SIZE * 0.75 },
            ]}
          />
        )}

        <DetectedBox detectedColor={detectedColor} selectedColor={selectedColor} />
        <SeasonPicker selected={seasonTags} onChange={onChangeSeasonTags} />
        <CategoryPicker value={detectedCategory} onChange={onChangeCategory} />
        <ColorGrid value={selectedColor} onChange={onChangeColor} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insetsBottom + 16 }]}>
        <TouchableOpacity
          style={styles.saveBtnWrap}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#1A1A1A', '#2D2D2D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>  옷장에 저장</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onReset} activeOpacity={0.7}>
          <Ionicons name="refresh" size={16} color="#1A1A1A" />
          <Text style={styles.secondaryBtnText}>  다시 찍기</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
