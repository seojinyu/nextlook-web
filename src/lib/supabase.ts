import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in values.'
  );
}

const isWeb = Platform.OS === 'web';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 웹에선 localStorage 자동 사용 (AsyncStorage는 native only 안전)
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // 웹에서만 URL의 access_token 자동 감지 (OAuth 리다이렉트 완료 후 필수)
    detectSessionInUrl: isWeb,
    // implicit flow는 #access_token=... 형식으로 리다이렉트 (더 간단)
    flowType: 'implicit',
  },
});

// 웹에서 로드 시 URL 해시에 세션 정보가 있으면 즉시 처리
if (isWeb && typeof window !== 'undefined') {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    console.log('[Supabase] OAuth redirect detected, processing token...');
    // Supabase가 자동으로 처리하지만, 명시적으로 세션 가져오기
    supabase.auth.getSession().then(({ data, error }) => {
      console.log('[Supabase] session after redirect:', { hasSession: !!data.session, error });
      if (data.session) {
        // URL 정리 (해시 제거)
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
  }
}

export async function getSignedUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('clothes')
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadClothingImage(
  userId: string,
  localUri: string,
  mimeType = 'image/jpeg'
): Promise<string> {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const res = await fetch(localUri);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf as ArrayBuffer);

  const { error } = await supabase.storage
    .from('clothes')
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) throw error;
  return path;
}

export async function invokeEdge<T>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const res = await fetch(
    `${supabaseUrl}/functions/v1/${name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey!,
      },
      body: JSON.stringify(body),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[${name}] ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`[${name}] invalid JSON: ${text.substring(0, 200)}`);
  }
}
