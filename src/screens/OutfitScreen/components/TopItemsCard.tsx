import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NAVY } from '../constants';
import { styles } from '../styles';
import type { Item } from '../types';

interface Props {
  items: { item: Item; count: number }[];
}

export default function TopItemsCard({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <Ionicons name="trending-up" size={16} color={NAVY} />
        <Text style={styles.statsTitle}>자주 입는 옷 TOP {items.length}</Text>
      </View>
      <View style={styles.statsRow}>
        {items.map((t, idx) => (
          <View key={t.item.id} style={styles.statsItem}>
            <View style={styles.statsRankBadge}>
              <Text style={styles.statsRankText}>{idx + 1}</Text>
            </View>
            <Image source={{ uri: t.item.signedUrl }} style={styles.statsImage} />
            <Text style={styles.statsCount}>{t.count}회</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
