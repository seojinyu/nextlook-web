import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

interface Props {
  variant: 'no-entries' | 'no-period-match';
}

export default function EmptyState({ variant }: Props) {
  if (variant === 'no-entries') {
    return (
      <View style={styles.emptyBox}>
        <View style={styles.emptyIcon}>
          <Ionicons name="albums-outline" size={40} color="#C0BDB8" />
        </View>
        <Text style={styles.emptyTitle}>아웃핏 기록이 없어요</Text>
        <Text style={styles.emptyDesc}>
          추천 탭에서 조합을 선택하면{'\n'}여기에 기록됩니다.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Ionicons name="calendar-outline" size={40} color="#C0BDB8" />
      </View>
      <Text style={styles.emptyTitle}>이 기간의 기록이 없어요</Text>
    </View>
  );
}
