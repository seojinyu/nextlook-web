import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BOTTEGA, type ColorEntry } from '../constants';
import { styles } from '../styles';

interface Props {
  detectedColor: ColorEntry | null;
  selectedColor: ColorEntry | null;
}

export default function DetectedBox({ detectedColor, selectedColor }: Props) {
  const wasEdited = !!(selectedColor && detectedColor && selectedColor.hex !== detectedColor.hex);
  return (
    <View style={styles.detectedBox}>
      <View style={styles.detectedHeader}>
        <Ionicons name="sparkles" size={14} color={BOTTEGA} />
        <Text style={styles.detectedHeaderText}>AI 분석 결과</Text>
      </View>
      <View style={styles.detectedTags}>
        {detectedColor && (
          <View style={styles.colorInfoRow}>
            <View style={[styles.detectedSwatch, { backgroundColor: detectedColor.hex }]} />
            <Text style={styles.detectedName}>{detectedColor.name}</Text>
          </View>
        )}
        {wasEdited && (
          <View style={styles.editedBadge}>
            <Text style={styles.editedBadgeText}>색상 수정됨</Text>
          </View>
        )}
      </View>
    </View>
  );
}
