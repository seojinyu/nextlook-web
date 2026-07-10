import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

interface Props {
  loading: boolean;
  onProvider: (p: 'google' | 'kakao') => void;
}

export default function OAuthButtons({ loading, onProvider }: Props) {
  return (
    <>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>또는</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={styles.googleBtn}
        onPress={() => onProvider('google')}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Ionicons name="logo-google" size={18} color="#4285F4" />
        <Text style={styles.googleBtnText}>Google로 계속하기</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.kakaoBtn}
        onPress={() => onProvider('kakao')}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble" size={16} color="#3C1E1E" />
        <Text style={styles.kakaoBtnText}>카카오로 계속하기</Text>
      </TouchableOpacity>
    </>
  );
}
