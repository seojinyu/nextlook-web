import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { confirm } from '../../../lib/confirm';
import { formatDate } from '../helpers';
import { BOTTEGA } from '../constants';

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
    <View style={{ marginBottom: 20 }}>
      {/* 상단 액션 바 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
        }}
      >
        <TouchableOpacity
          onPress={onRefresh}
          disabled={loading}
          activeOpacity={0.7}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="refresh" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="log-out-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Hero 타이틀 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <View style={{ width: 20, height: 2, backgroundColor: BOTTEGA, borderRadius: 1 }} />
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            color: BOTTEGA,
            letterSpacing: 2,
          }}
        >
          DAILY LOOK
        </Text>
      </View>

      <Text
        style={{
          fontSize: 34,
          fontWeight: '900',
          color: '#fff',
          letterSpacing: -1,
          lineHeight: 40,
        }}
      >
        What to{'\n'}
        <Text style={{ color: BOTTEGA }}>Wear Today</Text>
      </Text>

      {date && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.5)" />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: 0.3,
            }}
          >
            {formatDate(date)}
          </Text>
        </View>
      )}
    </View>
  );
}
