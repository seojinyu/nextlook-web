/**
 * AuthScreen 액션 훅.
 * - 이메일/비밀번호 로그인·가입
 * - Google/Kakao OAuth (인앱 브라우저 오류 시 웹은 window.alert)
 * - 비밀번호 재설정 메일
 */
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

type Mode = 'signin' | 'signup';
type Provider = 'google' | 'kakao';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const submit = async (mode: Mode, email: string, password: string) => {
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

  const signInWithProvider = async (provider: Provider) => {
    console.log(`[OAuth] Starting ${provider} login...`);
    setLoading(true);
    try {
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : undefined;
      const options: any = redirectTo ? { redirectTo } : {};
      if (provider === 'kakao') {
        options.scopes = 'account_email profile_nickname profile_image';
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options,
      });
      console.log(`[OAuth] response:`, { data, error });
      if (error) throw error;
    } catch (e: any) {
      console.error(`[OAuth] ${provider} failed:`, e);
      const msg = e.message ?? String(e);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const name = provider === 'google' ? 'Google' : '카카오';
        window.alert(
          `${name} 로그인 실패\n\n${msg}\n\nSupabase에서 ${provider} provider가 활성화되어 있고 Redirect URLs이 설정되어 있는지 확인해 주세요.`,
        );
      } else {
        Alert.alert('로그인 실패', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendResetEmail = async (targetEmail: string, onSuccess: () => void) => {
    const target = targetEmail.trim();
    if (!target) {
      Alert.alert('입력 오류', '이메일을 입력해 주세요.');
      return;
    }
    setResetLoading(true);
    try {
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(
        target,
        redirectTo ? { redirectTo } : undefined,
      );
      if (error) throw error;
      Alert.alert(
        '메일 발송 완료',
        `${target} 으로 비밀번호 재설정 메일을 보냈습니다.\n메일함을 확인해 주세요.`,
        [{ text: '확인', onPress: onSuccess }],
      );
    } catch (e: any) {
      Alert.alert('전송 실패', e.message ?? String(e));
    } finally {
      setResetLoading(false);
    }
  };

  return { loading, resetLoading, submit, signInWithProvider, sendResetEmail };
}
