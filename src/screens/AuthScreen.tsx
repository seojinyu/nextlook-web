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

  const signInWithProvider = async (provider: 'google' | 'kakao') => {
    console.log(`[OAuth] Starting ${provider} login...`);
    setLoading(true);
    try {
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : undefined;
      console.log(`[OAuth] redirectTo:`, redirectTo);

      // Kakao는 비즈 앱이 아니면 이메일 요청 불가 → 닉네임/프로필사진만 요청
      const options: any = {
        skipBrowserRedirect: true, // 우리가 수동으로 리다이렉트 (scope 조작 위해)
        ...(redirectTo ? { redirectTo } : {}),
      };
      if (provider === 'kakao') {
        options.scopes = 'profile_nickname profile_image';
        options.queryParams = { scope: 'profile_nickname profile_image' };
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options,
      });

      console.log(`[OAuth] response:`, { data, error });

      if (error) throw error;
      if (!data?.url) throw new Error('OAuth URL 없음 - Supabase에서 provider를 활성화해 주세요');

      let finalUrl = data.url;
      console.log(`[OAuth] Supabase URL:`, finalUrl);

      // Kakao의 경우: Supabase가 만든 URL에서 scope 파라미터를 강제 오버라이드
      if (provider === 'kakao' && Platform.OS === 'web') {
        try {
          const url = new URL(finalUrl);
          // scope 파라미터를 우리가 원하는 값으로 강제 설정
          url.searchParams.set('scope', 'profile_nickname profile_image');
          finalUrl = url.toString();
          console.log(`[OAuth] Modified URL for Kakao:`, finalUrl);
        } catch (e) {
          console.warn('[OAuth] URL modification failed:', e);
        }
      }

      // 웹에서 수동 리다이렉트
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = finalUrl;
      }
    } catch (e: any) {
      console.error(`[OAuth] ${provider} failed:`, e);
      const msg = e.message ?? String(e);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`${provider === 'google' ? 'Google' : '카카오'} 로그인 실패\n\n${msg}\n\nSupabase에서 ${provider} provider가 활성화되어 있고 Redirect URLs이 설정되어 있는지 확인해 주세요.`);
      } else {
        Alert.alert('로그인 실패', msg);
      }
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

        {/* OAuth 구분선 */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google 로그인 */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={() => signInWithProvider('google')}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-google" size={18} color="#4285F4" />
          <Text style={styles.googleBtnText}>Google로 계속하기</Text>
        </TouchableOpacity>

        {/* Kakao 로그인 */}
        <TouchableOpacity
          style={styles.kakaoBtn}
          onPress={() => signInWithProvider('kakao')}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble" size={16} color="#3C1E1E" />
          <Text style={styles.kakaoBtnText}>카카오로 계속하기</Text>
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

  dividerRow: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EDEAE6' },
  dividerText: { marginHorizontal: 10, color: '#9A9590', fontSize: 12, fontWeight: '600' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0DDD8',
    paddingVertical: 14, borderRadius: 12, marginBottom: 10,
  },
  googleBtnText: { color: '#1A1A1A', fontSize: 14, fontWeight: '600' },
  kakaoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEE500', paddingVertical: 14, borderRadius: 12,
  },
  kakaoBtnText: { color: '#3C1E1E', fontSize: 14, fontWeight: '600' },

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
