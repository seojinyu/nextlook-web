import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

interface SaveOpts {
  signupSource: 'email' | 'google' | 'kakao';
  email?: string;
  gender: string | null;
  ageRange: string | null;
  skip: boolean;
}

export function useProfileSetup(onComplete: () => void) {
  const [saving, setSaving] = useState(false);

  const save = async (opts: SaveOpts) => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('로그인이 필요합니다.');

      const payload: any = {
        id: userData.user.id,
        email: opts.email ?? userData.user.email,
        signup_source: opts.signupSource,
        profile_completed_at: new Date().toISOString(),
      };
      if (!opts.skip) {
        if (opts.gender) payload.gender = opts.gender;
        if (opts.ageRange) payload.age_range = opts.ageRange;
      }

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) throw error;

      onComplete();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return { saving, save };
}
