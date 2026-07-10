/**
 * AuthScreen - 얇은 조정자
 * 이메일/OAuth 로그인 + 비밀번호 재설정
 */
import { useState } from 'react';
import { View, TouchableOpacity, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { styles } from './styles';
import { useAuth } from './useAuth';

import Logo from './components/Logo';
import EmailForm from './components/EmailForm';
import OAuthButtons from './components/OAuthButtons';
import ResetPasswordModal from './components/ResetPasswordModal';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { loading, resetLoading, submit, signInWithProvider, sendResetEmail } = useAuth();

  const openResetModal = () => {
    setResetEmail(email);
    setResetModalOpen(true);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Logo />

      <View style={styles.card}>
        <EmailForm
          mode={mode}
          email={email}
          password={password}
          loading={loading}
          onChangeEmail={setEmail}
          onChangePassword={setPassword}
          onSubmit={() => submit(mode, email, password)}
        />

        <OAuthButtons loading={loading} onProvider={signInWithProvider} />

        <TouchableOpacity
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          style={styles.switchBtn}
        >
          <Text style={styles.switchText}>
            {mode === 'signin' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            <Text style={styles.switchLink}>
              {mode === 'signin' ? '가입하기' : '로그인'}
            </Text>
          </Text>
        </TouchableOpacity>

        {mode === 'signin' && (
          <TouchableOpacity onPress={openResetModal} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>
        )}
      </View>

      <ResetPasswordModal
        visible={resetModalOpen}
        email={resetEmail}
        loading={resetLoading}
        onChangeEmail={setResetEmail}
        onCancel={() => setResetModalOpen(false)}
        onSend={() =>
          sendResetEmail(resetEmail, () => {
            setResetModalOpen(false);
            setResetEmail('');
          })
        }
      />
    </KeyboardAvoidingView>
  );
}
