import { View, Text, TouchableOpacity } from 'react-native';
import { CAT_LABEL } from '../constants';
import { styles } from '../styles';
import type { ClothingCategory } from '../../../lib/types';

interface Props {
  value: ClothingCategory;
  onChange: (v: ClothingCategory) => void;
}

const CATS: ClothingCategory[] = ['top', 'bottom', 'jacket'];

export default function CategoryPicker({ value, onChange }: Props) {
  return (
    <>
      <Text style={styles.sectionTitle}>카테고리</Text>
      <View style={styles.catRow}>
        {CATS.map((cat) => {
          const active = value === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, active && styles.catChipActive]}
              onPress={() => onChange(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                {CAT_LABEL[cat]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}
