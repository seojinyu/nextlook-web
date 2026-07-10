import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

interface Option {
  key: string;
  label: string;
  icon?: string;
}

interface Props {
  options: Option[];
  value: string | null;
  onChange: (key: string) => void;
}

export default function OptionChips({ options, value, onChange }: Props) {
  return (
    <View style={styles.optionRow}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.7}
          >
            {opt.icon && (
              <Ionicons
                name={opt.icon as any}
                size={18}
                color={active ? '#fff' : '#7A7570'}
                style={{ marginRight: 6 }}
              />
            )}
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
