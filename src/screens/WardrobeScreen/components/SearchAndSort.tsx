import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AMBER } from '../constants';
import { styles } from '../styles';
import { nextSortKey } from '../helpers';

type SortKey = 'recent' | 'color' | 'category';

interface Props {
  query: string;
  onChangeQuery: (v: string) => void;
  sortBy: SortKey;
  onChangeSort: (next: SortKey) => void;
}

const SORT_ICON: Record<SortKey, string> = {
  recent: 'time-outline',
  color: 'color-palette-outline',
  category: 'apps-outline',
};

const SORT_LABEL: Record<SortKey, string> = {
  recent: '최근순',
  color: '색상순',
  category: '종류순',
};

export default function SearchAndSort({ query, onChangeQuery, sortBy, onChangeSort }: Props) {
  return (
    <View style={styles.searchRow}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#9A9590" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onChangeQuery}
          placeholder="색상·종류·메모 검색"
          placeholderTextColor="#B5B0AB"
        />
        {!!query && (
          <TouchableOpacity
            onPress={() => onChangeQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color="#B5B0AB" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={styles.sortBtn}
        onPress={() => onChangeSort(nextSortKey(sortBy))}
        activeOpacity={0.7}
      >
        <Ionicons
          name={SORT_ICON[sortBy] as any}
          size={14}
          color={AMBER}
          style={{ marginRight: 4 }}
        />
        <Text style={styles.sortBtnText}>{SORT_LABEL[sortBy]}</Text>
      </TouchableOpacity>
    </View>
  );
}
