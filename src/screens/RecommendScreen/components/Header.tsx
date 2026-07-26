import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { confirm } from '../../../lib/confirm';
import { formatDate } from '../helpers';
import { LIME, INK } from '../constants';

const ADMIN_EMAILS = ['seojinyu89@gmail.com'];

interface Props {
  date: string;
  loading: boolean;
  onRefresh: () => void;
}

export default function Header({ date, loading, onRefresh }: Props) {
  const navigation = useNavigation<any>();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = (data.user?.email ?? '').toLowerCase();
      setIsAdmin(ADMIN_EMAILS.includes(email));
    })();
  }, []);
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
      {/* 상단 액션 바 — 좌: 워드마크 / 우: 액션 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 22,
        }}
      >
        {/* 스티커 워드마크 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: LIME,
            }}
          />
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 1 }}>
            NEXTLOOK
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Admin')}
              activeOpacity={0.7}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: LIME,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="shield-checkmark" size={17} color={INK} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onRefresh}
            disabled={loading}
            activeOpacity={0.7}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="refresh" size={17} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.7}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="log-out-outline" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero 타이틀 — 볼드 + 라임 하이라이터 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <View style={{ width: 22, height: 3, backgroundColor: LIME, borderRadius: 2 }} />
        <Text
          style={{
            fontSize: 11,
            fontWeight: '900',
            color: LIME,
            letterSpacing: 2.5,
          }}
        >
          DAILY LOOK
        </Text>
      </View>

      <Text
        style={{
          fontSize: 44,
          fontWeight: '900',
          color: '#fff',
          letterSpacing: -2,
          lineHeight: 46,
        }}
      >
        WHAT TO
      </Text>
      <View style={{ flexDirection: 'row', marginTop: 2 }}>
        <Text
          style={{
            fontSize: 44,
            fontWeight: '900',
            color: INK,
            backgroundColor: LIME,
            letterSpacing: -2,
            lineHeight: 46,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          WEAR TODAY
        </Text>
      </View>

      {date && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
          <Ionicons name="calendar-clear" size={12} color={LIME} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.6)',
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
