import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

interface Props {
  mode: 'signin' | 'signup';
  email: string;
  password: string;
  loading: boolean;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onSubmit: () => void;
}

export default function EmailForm({
  mode, email, password, loading,
  onChangeEmail, onChangePassword, onSubmit,
}: Props) {
  return (
    <>
      <Text style={styles.formTitle}>
        {mode === 'signin' ? '로그인' : '회원가입'}
      </Text>

      <View style={styles.inputWrapper}>
        <Ionicons name="mail-outline" size={18} color="#C0BDB8" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#C0BDB8"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={onChangeEmail}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Ionicons name="lock-closed-outline" size={18} color="#C0BDB8" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor="#C0BDB8"
          secureTextEntry
          value={password}
          onChangeText={onChangePassword}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
        onPress={onSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>
            {mode === 'signin' ? '로그인' : '가입하기'}
          </Text>
        )}
      </TouchableOpacity>
    </>
  );
}
