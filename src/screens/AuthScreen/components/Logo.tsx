import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

export default function Logo() {
  return (
    <View style={styles.logoArea}>
      <View style={styles.iconCircle}>
        <Ionicons name="shirt" size={32} color="#1B6B4A" />
      </View>
      <Text style={styles.brand}>NextLook</Text>
      <Text style={styles.tagline}>AI가 골라주는 내일의 코디</Text>
    </View>
  );
}
