import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { confirm } from '../../../lib/confirm';
import { styles } from '../styles';
import { formatDate } from '../helpers';

interface Props {
  date: string;
  loading: boolean;
  onRefresh: () => void;
}

export default function Header({ date, loading, onRefresh }: Props) {
  const handleLogout = () => {
    confirm(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      () => { supabase.auth.signOut(); },
      { confirmText: '로그아웃', destructive: true }
    );
  };

  return (
    <View style={styles.headerInner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greeting}>Outfit Recommend</Text>
        {date ? <Text style={styles.dateSubtext}>{formatDate(date)}</Text> : null}
      </View>
      <TouchableOpacity
        onPress={onRefresh}
        disabled={loading}
        style={styles.refreshBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh" size={18} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleLogout}
        style={styles.logoutBtnHeader}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={16} color="#fff" />
        <Text style={styles.logoutBtnHeaderText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}
