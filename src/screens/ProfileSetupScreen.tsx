import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const BOTTEGA = '#1B6B4A';

const GENDER_OPTIONS = [
  { key: 'female', label: '여성', icon: 'female-outline' },
  { key: 'male', label: '남성', icon: 'male-outline' },
  { key: 'other', label: '기타', icon: 'happy-outline' },
  { key: 'prefer_not_to_say', label: '비공개', icon: 'eye-off-outline' },
];

const AGE_OPTIONS = [
  { key: '10s', label: '10대' },
  { key: '20s', label: '20대' },
  { key: '30s', label: '30대' },
  { key: '40s', label: '40대' },
  { key: '50s+', label: '50대 이상' },
];

interface Props {
  onComplete: () => void;
  signupSource?: 'email' | 'google' | 'kakao';
  email?: string;
}

export default function ProfileSetupScreen({ onComplete, signupSource = 'email', email }: Props) {
  const insets = useSafeAreaInsets();
  const [gender, setGender] = useState<string | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (skip = false) => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('로그인이 필요합니다.');

      const payload: any = {
        id: userData.user.id,
        email: email ?? userData.user.email,
        signup_source: signupSource,
        profile_completed_at: new Date().toISOString(),
      };
      if (!skip) {
        if (gender) payload.gender = gender;
        if (ageRange) payload.age_range = ageRange;
      }

      // upsert profile (create if not exists, update if exists)
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) throw error;

      onComplete();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.root, { paddingTop: insets.top + 20 }]} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <View style={styles.iconCircle}>
        <Ionicons name="person-circle-outline" size={40} color={BOTTEGA} />
      </View>

      <Text style={styles.title}>환영합니다!</Text>
      <Text style={styles.desc}>
        더 정확한 코디 추천을 위해{'\n'}간단한 정보를 알려주세요. (선택)
      </Text>

      {/* 성별 */}
      <Text style={styles.sectionTitle}>성별</Text>
      <View style={styles.optionRow}>
        {GENDER_OPTIONS.map((opt) => {
          const active = gender === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setGender(opt.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={opt.icon as any}
                size={18}
                color={active ? '#fff' : '#7A7570'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 나이대 */}
      <Text style={styles.sectionTitle}>나이대</Text>
      <View style={styles.optionRow}>
        {AGE_OPTIONS.map((opt) => {
          const active = ageRange === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setAgeRange(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 버튼 */}
      <TouchableOpacity
        style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
        onPress={() => save(false)}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>저장하고 시작하기</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={() => save(true)}
        disabled={saving}
      >
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>

      <Text style={styles.privacyText}>
        ※ 입력하신 정보는 코디 추천 품질 향상을 위해서만 사용됩니다.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8', paddingHorizontal: 24 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8F0EC', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', letterSpacing: -0.5 },
  desc: { fontSize: 14, color: '#7A7570', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginTop: 28, marginBottom: 12 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#EDEAE6',
  },
  optionActive: { backgroundColor: BOTTEGA, borderColor: BOTTEGA },
  optionText: { fontSize: 14, fontWeight: '600', color: '#7A7570' },
  optionTextActive: { color: '#fff' },

  primaryBtn: {
    backgroundColor: BOTTEGA, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 36,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  skipBtn: { marginTop: 12, alignItems: 'center' },
  skipText: { color: '#9A9590', fontSize: 14, textDecorationLine: 'underline' },

  privacyText: { fontSize: 11, color: '#A8A4A0', textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
