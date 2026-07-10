import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NAVY } from '../constants';
import { styles } from '../styles';

interface Props {
  periods: [string, number][];
  totalCount: number;
  active: string;
  onChange: (v: string) => void;
}

export default function PeriodFilter({ periods, totalCount, active, onChange }: Props) {
  const isAll = active === 'all';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.periodScroll}
      contentContainerStyle={styles.periodScrollContent}
    >
      <TouchableOpacity
        style={[styles.periodChip, isAll && styles.periodChipActive]}
        onPress={() => onChange('all')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={13}
          color={isAll ? '#fff' : NAVY}
          style={{ marginRight: 4 }}
        />
        <Text style={[styles.periodChipText, isAll && styles.periodChipTextActive]}>
          전체 {totalCount}
        </Text>
      </TouchableOpacity>
      {periods.map(([ym, count]) => {
        const [year, month] = ym.split('-');
        const isActive = active === ym;
        return (
          <TouchableOpacity
            key={ym}
            style={[styles.periodChip, isActive && styles.periodChipActive]}
            onPress={() => onChange(ym)}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodChipYear, isActive && styles.periodChipTextActive]}>
              {year}
            </Text>
            <Text style={[styles.periodChipMonth, isActive && styles.periodChipTextActive]}>
              {parseInt(month, 10)}월
            </Text>
            <View style={[styles.periodCountBadge, isActive && styles.periodCountBadgeActive]}>
              <Text style={[styles.periodCountText, isActive && styles.periodCountTextActive]}>
                {count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
