import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { confirm } from '../../../lib/confirm';
import { AMBER } from '../constants';
import { styles } from '../styles';

interface Props {
  insetsTop: number;
  totalCount: number;
  selectMode: boolean;
  selectedCount: number;
  deleting: boolean;
  onEnterSelectMode: () => void;
  onExitSelectMode: () => void;
  onConfirmDelete: () => void;
}

export default function Header({
  insetsTop, totalCount, selectMode, selectedCount, deleting,
  onEnterSelectMode, onExitSelectMode, onConfirmDelete,
}: Props) {
  const handleLogout = () => {
    confirm(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      () => { supabase.auth.signOut(); },
      { confirmText: '로그아웃', destructive: true }
    );
  };

  return (
    <View style={[styles.header, { paddingTop: insetsTop + 12 }]}>
      {selectMode ? (
        <>
          <TouchableOpacity onPress={onExitSelectMode}>
            <Text style={styles.headerAction}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedCount}개 선택됨</Text>
          <TouchableOpacity onPress={onConfirmDelete} disabled={deleting || selectedCount === 0}>
            {deleting ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Text style={[styles.headerDelete, selectedCount === 0 && { color: '#CCC' }]}>
                삭제
              </Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Closet</Text>
            <Text style={styles.headerCount}>{totalCount}벌</Text>
          </View>
          <View style={styles.headerRight}>
            {totalCount > 0 && (
              <TouchableOpacity onPress={onEnterSelectMode} style={styles.headerIconBtn}>
                <Ionicons name="checkmark-circle-outline" size={20} color={AMBER} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.logoutBtnText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
