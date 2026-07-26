import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { confirm } from '../../../lib/confirm';
import { LIME } from '../constants';
import { styles } from '../styles';

interface Props {
  insetsTop: number;
  entryCount: number;
}

export default function Header({ insetsTop, entryCount }: Props) {
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
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={styles.title}>OUTFIT MEMORY</Text>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LIME, marginBottom: 3 }} />
        </View>
        <Text style={styles.subtitle}>기록한 코디를 날씨와 함께 확인하세요</Text>
      </View>
      {entryCount > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{entryCount}</Text>
        </View>
      )}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtnHeader} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={16} color="#fff" />
        <Text style={styles.logoutBtnHeaderText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}
