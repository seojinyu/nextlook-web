import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles';

interface ForecastDate {
  date: string;
  daysFromToday: number;
  weekday: string;
  day: number | string;
  label?: string;
}

interface Props {
  dates: ForecastDate[];
  selectedDays: number;
  disabled?: boolean;
  onSelect: (days: number) => void;
}

export default function DatePicker({ dates, selectedDays, disabled, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.datePicker}
      contentContainerStyle={{ gap: 6, paddingRight: 8 }}
    >
      {dates.map((fd) => {
        const active = selectedDays === fd.daysFromToday;
        return (
          <TouchableOpacity
            key={fd.date}
            style={[styles.dateItem, active && styles.dateItemActive]}
            onPress={() => onSelect(fd.daysFromToday)}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Text style={[styles.dateItemWeekday, active && styles.dateItemWeekdayActive]}>
              {fd.weekday}
            </Text>
            <Text style={[styles.dateItemDay, active && styles.dateItemDayActive]}>
              {fd.day}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
