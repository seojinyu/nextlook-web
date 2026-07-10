/**
 * ProfileSetupScreen - 얇은 조정자
 * 최초 로그인 시 성별/나이대(선택) 저장.
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AGE_OPTIONS, BOTTEGA, GENDER_OPTIONS } from './constants';
import { styles } from './styles';
import { useProfileSetup } from './useProfileSetup';
import OptionChips from './components/OptionChips';

interface Props {
  onComplete: () => void;
  signupSource?: 'email' | 'google' | 'kakao';
  email?: string;
}

export default function ProfileSetupScreen({
  onComplete, signupSource = 'email', email,
}: Props) {
  const insets = useSafeAreaInsets();
  const [gender, setGender] = useState<string | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const { saving, save } = useProfileSetup(onComplete);

  const handleSave = (skip: boolean) => {
    save({ signupSource, email, gender, ageRange, skip });
  };

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top + 20 }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="person-circle-outline" size={40} color={BOTTEGA} />
      </View>

      <Text style={styles.title}>환영합니다!</Text>
      <Text style={styles.desc}>
        더 정확한 코디 추천을 위해{'\n'}간단한 정보를 알려주세요. (선택)
      </Text>

      <Text style={styles.sectionTitle}>성별</Text>
      <OptionChips options={GENDER_OPTIONS} value={gender} onChange={setGender} />

      <Text style={styles.sectionTitle}>나이대</Text>
      <OptionChips options={AGE_OPTIONS} value={ageRange} onChange={setAgeRange} />

      <TouchableOpacity
        style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
        onPress={() => handleSave(false)}
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
        onPress={() => handleSave(true)}
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
