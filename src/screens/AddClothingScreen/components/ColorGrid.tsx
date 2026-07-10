import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR_BTN_W, COLORS, LIGHT_COLORS, type ColorEntry } from '../constants';
import { styles } from '../styles';

interface Props {
  value: ColorEntry | null;
  onChange: (c: ColorEntry) => void;
}

export default function ColorGrid({ value, onChange }: Props) {
  return (
    <>
      <Text style={styles.sectionTitle}>색상이 다르면 선택해 주세요</Text>
      <View style={styles.colorGrid}>
        {COLORS.map((c) => {
          const sel = value?.hex === c.hex;
          return (
            <TouchableOpacity
              key={c.hex}
              style={[styles.colorBtn, { width: COLOR_BTN_W }, sel && styles.colorBtnActive]}
              onPress={() => onChange(c)}
              activeOpacity={0.7}
            >
              <View style={[styles.colorSwatch, { backgroundColor: c.hex }]}>
                {sel && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={LIGHT_COLORS.includes(c.hex) ? '#000' : '#fff'}
                  />
                )}
              </View>
              <Text style={[styles.colorLabel, sel && styles.colorLabelActive]} numberOfLines={1}>
                {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}
