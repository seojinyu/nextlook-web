import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('가입 완료', '로그인해 주세요.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      Alert.alert('오류', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const sendResetEmail = async () => {
    const target = resetEmail.trim();
    if (!target) {
      Alert.alert('입력 오류', '이메일을 입력해 주세요.');
      return;
    }
    setResetLoading(true);
    try {
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(target, redirectTo ? { redirectTo } : undefined);
      if (error) throw error;
      Alert.alert(
        '메일 발송 완료',
        `${target} 으로 비밀번호 재설정 메일을 보냈습니다.\n메일함을 확인해 주세요.`,
        [{ text: '확인', onPress: () => { setResetModalOpen(false); setResetEmail(''); } }]
      );
    } catch (e: any) {
      Alert.alert('전송 실패', e.message ?? String(e));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoArea}>
        <View style={styles.iconCircle}>
          <Ionicons name="shirt" size={32} color="#1B6B4A" />
        </View>
        <Text style={styles.brand}>NextLook</Text>
        <Text style={styles.tagline}>AI가 골라주는 내일의 코디</Text>
      </View>

      <View style={styles.card}>
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
            onChangeText={setEmail}
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
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          onPress={submit}
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

        <TouchableOpacity
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          style={styles.switchBtn}
        >
          <Text style={styles.switchText}>
            {mode === 'signin'
              ? '계정이 없으신가요? '
              : '이미 계정이 있으신가요? '}
            <Text style={styles.switchLink}>
              {mode === 'signin' ? '가입하기' : '로그인'}
            </Text>
          </Text>
        </TouchableOpacity>

        {mode === 'signin' && (
          <TouchableOpacity
            onPress={() => { setResetEmail(email); setResetModalOpen(true); }}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 비밀번호 재설정 모달 */}
      <Modal
        visible={resetModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="key-outline" size={20} color="#1B6B4A" />
              <Text style={styles.modalTitle}>비밀번호 찾기</Text>
            </View>
            <Text style={styles.modalDesc}>
              가입하신 이메일을 입력해 주세요.{'\n'}비밀번호 재설정 링크를 보내 드립니다.
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#C0BDB8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="이메일"
                placeholderTextColor="#C0BDB8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoFocus
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setResetModalOpen(false)}
                disabled={resetLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSend]}
                onPress={sendResetEmail}
                disabled={resetLoading}
                activeOpacity={0.8}
              >
                {resetLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnSendText}>메일 보내기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8', justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 36 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  brand: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', letterSpacing: -1 },
  tagline: { fontSize: 14, color: '#7A7570', marginTop: 6 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4,
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F4F2', borderRadius: 14,
    marginBottom: 12, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 16, fontSize: 15, color: '#1A1A1A' },
  primaryBtn: {
    backgroundColor: '#1A1A1A', paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#7A7570', fontSize: 14 },
  switchLink: { color: '#1B6B4A', fontWeight: '600' },

  forgotBtn: { marginTop: 12, alignItems: 'center' },
  forgotText: { color: '#9A9590', fontSize: 13, textDecorationLine: 'underline' },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  modalDesc: { fontSize: 13, color: '#7A7570', marginBottom: 16, lineHeight: 19 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F0EDEA' },
  modalBtnSend: { backgroundColor: '#1B6B4A' },
  modalBtnCancelText: { color: '#7A7570', fontWeight: '700', fontSize: 14 },
  modalBtnSendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
