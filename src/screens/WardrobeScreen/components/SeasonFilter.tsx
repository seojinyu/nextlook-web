import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SEASON_FILTERS } from '../constants';
import { styles } from '../styles';

interface Props {
  active: string;
  counts: Record<string, number>;
  onChange: (key: string) => void;
}

export default function SeasonFilter({ active, counts, onChange }: Props) {
  return (
    <View style={styles.filterRow}>
      {SEASON_FILTERS.map((f) => {
        const isActive = active === f.key;
        const count = counts[f.key] ?? 0;
        return (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={() => onChange(f.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={f.icon as any}
              size={14}
              color={isActive ? '#fff' : '#7A7570'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
              {f.label} {count > 0 ? count : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
