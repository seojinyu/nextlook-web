import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

export default function EmptyState() {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Ionicons name="shirt-outline" size={40} color="#C0BDB8" />
      </View>
      <Text style={styles.emptyTitle}>옷장이 비어있어요</Text>
      <Text style={styles.emptyDesc}>아래 버튼을 눌러 옷을 추가해 보세요.</Text>
    </View>
  );
}
