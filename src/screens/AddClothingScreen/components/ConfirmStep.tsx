import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { H_PAD, PREVIEW_SIZE, LIME, INK, type ColorEntry } from '../constants';
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
          style={[styles.saveBtnWrap, styles.btnGradient, { backgroundColor: LIME }]}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={INK} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={19} color={INK} />
              <Text style={[styles.primaryBtnText, { color: INK }]}>  옷장에 저장</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onReset} activeOpacity={0.7}>
          <Ionicons name="refresh" size={16} color="#1A1A1A" />
          <Text style={styles.secondaryBtnText}>  다시 찍기</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
