import {
  Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

interface Props {
  visible: boolean;
  email: string;
  loading: boolean;
  onChangeEmail: (v: string) => void;
  onCancel: () => void;
  onSend: () => void;
}

export default function ResetPasswordModal({
  visible, email, loading, onChangeEmail, onCancel, onSend,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
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
              value={email}
              onChangeText={onChangeEmail}
              autoFocus
            />
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSend]}
              onPress={onSend}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalBtnSendText}>메일 보내기</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
