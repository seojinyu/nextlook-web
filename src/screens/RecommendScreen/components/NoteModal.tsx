import { Modal, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BOTTEGA } from '../constants';
import { styles } from '../styles';

interface Props {
  visible: boolean;
  value: string;
  onChange: (text: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function NoteModal({ visible, value, onChange, onCancel, onSave }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Ionicons name="create-outline" size={20} color={BOTTEGA} />
            <Text style={styles.modalTitle}>코디 메모</Text>
          </View>
          <Text style={styles.modalDesc}>
            이 조합에 대해 기록할 내용이 있나요?{'\n'}(선택사항)
          </Text>
          <TextInput
            style={styles.noteInput}
            value={value}
            onChangeText={onChange}
            placeholder="예: 데이트룩, 회의용, 출근복…"
            placeholderTextColor="#B5B0AB"
            multiline
            maxLength={200}
            autoFocus
          />
          <Text style={styles.charCount}>{value.length}/200</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSave]}
              onPress={onSave}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnSaveText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
