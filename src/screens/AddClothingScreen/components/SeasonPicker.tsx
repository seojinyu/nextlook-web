import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SEASON_ICON, SEASON_LABEL } from '../constants';
import { styles } from '../styles';

interface Props {
  selected: string[];
  onChange: (next: string[]) => void;
}

const SEASONS = ['spring_fall', 'summer', 'winter'] as const;

export default function SeasonPicker({ selected, onChange }: Props) {
  const toggle = (szn: string) => {
    if (selected.includes(szn)) {
      const next = selected.filter((s) => s !== szn);
      onChange(next.length > 0 ? next : [szn]); // 최소 1개
    } else {
      onChange([...selected, szn]);
    }
  };

  return (
    <>
      <Text style={styles.sectionTitle}>계절 (복수 선택 가능)</Text>
      <View style={styles.catRow}>
        {SEASONS.map((szn) => {
          const active = selected.includes(szn);
          return (
            <TouchableOpacity
              key={szn}
              style={[styles.catChip, active && styles.catChipActive]}
              onPress={() => toggle(szn)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={SEASON_ICON[szn] as any}
                size={15}
                color={active ? '#fff' : '#7A7570'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                {SEASON_LABEL[szn]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}
