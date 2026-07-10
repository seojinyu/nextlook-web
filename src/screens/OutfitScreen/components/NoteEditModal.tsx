import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NAVY } from '../constants';
import { styles } from '../styles';

interface Props {
  visible: boolean;
  logId: string | null;
  initialNote: string;
  onCancel: () => void;
  onSave: (logId: string, newNote: string | null) => Promise<void>;
}

export default function NoteEditModal({ visible, logId, initialNote, onCancel, onSave }: Props) {
  const [text, setText] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  // 모달이 열릴 때 초기 텍스트로 리셋
  const handleShow = () => setText(initialNote);

  const handleSave = async () => {
    if (!logId) return;
    setSaving(true);
    try {
      await onSave(logId, text.trim() || null);
      onCancel();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} onShow={handleShow}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Ionicons name="create-outline" size={20} color={NAVY} />
            <Text style={styles.modalTitle}>메모 수정</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            value={text}
            onChangeText={setText}
            placeholder="예: 데이트룩, 회의용, 출근복…"
            placeholderTextColor="#B5B0AB"
            multiline
            maxLength={200}
            autoFocus
          />
          <Text style={styles.charCount}>{text.length}/200</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={onCancel}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSave]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalBtnSaveText}>저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
