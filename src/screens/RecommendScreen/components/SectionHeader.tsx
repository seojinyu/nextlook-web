import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

interface Props {
  viewMode: 'grid' | 'mannequin';
  onChangeViewMode: (mode: 'grid' | 'mannequin') => void;
}

export default function SectionHeader({ viewMode, onChangeViewMode }: Props) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>추천 조합</Text>
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
          onPress={() => onChangeViewMode('grid')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="grid-outline"
            size={14}
            color={viewMode === 'grid' ? '#fff' : '#7A7570'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'mannequin' && styles.viewToggleBtnActive]}
          onPress={() => onChangeViewMode('mannequin')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="body-outline"
            size={14}
            color={viewMode === 'mannequin' ? '#fff' : '#7A7570'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
