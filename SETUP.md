# Outfit AI — Setup Guide

안드로이드 실제 기기에서 동작시키는 전체 절차입니다. 처음 한 번만 하면 됩니다.

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 가입 → New project
2. Region: `Northeast Asia (Seoul)` 권장
3. Password: 강력한 비밀번호 저장해 둘 것

프로젝트가 만들어지면 Project Settings → API 메뉴에서 아래 두 값을 복사:
- `Project URL` (예: `https://abcxyz.supabase.co`)
- `anon public` 키

## 2. DB 스키마 적용

Supabase 대시보드 → SQL Editor → New query →
`supabase/schema.sql` 파일 전체 내용을 붙여넣고 **Run**.

Storage 메뉴에 `clothes` 버킷이 생기고, `clothes`, `wear_log`, `profiles` 테이블이 생긴 것을 확인.

## 3. Edge Function 배포

Supabase CLI 설치가 필요합니다.

```bash
npm i -g supabase
supabase login
cd C:/dev/outfit-ai
supabase link --project-ref <프로젝트 ref>    # 대시보드 URL의 abcxyz 부분
```

비밀 키 설정:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

(SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY는 Supabase가 자동 주입합니다.)

함수 배포:

```bash
supabase functions deploy analyze-clothing
supabase functions deploy recommend
```

## 4. OpenWeather API 키

https://openweathermap.org/api 가입 → "3 Hour Forecast 5 days" (무료) → API Key 복사.

키 활성화까지 10분~1시간 걸릴 수 있음.

## 5. 앱 환경변수

`C:\dev\outfit-ai\.env` 파일 생성 (템플릿은 `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=https://abcxyz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
EXPO_PUBLIC_OPENWEATHER_API_KEY=여기에키
```

## 6. 안드로이드에서 실행

Expo Go로 빠르게 테스트:

1. 안드로이드 Play 스토어에서 **Expo Go** 앱 설치
2. PC에서:
   ```bash
   cd C:/dev/outfit-ai
   npm start
   ```
3. 터미널에 QR코드가 뜨면 **Expo Go 앱**으로 스캔 (같은 Wi-Fi여야 함)

### 중요: Expo Go의 한계

Expo Go는 빠른 개발용이지만 일부 기능은 **development build**가 필요할 수 있습니다.
프로덕션에 가까운 빌드가 필요하면:

```bash
npx expo install expo-dev-client
eas build --profile development --platform android
```

(EAS 빌드는 `expo-dev-client` 설치 후 `eas-cli` 로그인이 필요합니다.)

## 7. 첫 사용 흐름

1. 앱 열면 로그인 화면 → 이메일/비밀번호로 **가입**
2. 메일함 확인 후 이메일 인증 완료
3. 다시 앱에서 **로그인**
4. `옷장` 탭 → `+ 옷 추가` → 카메라로 옷 촬영 → AI 분석 → 저장
5. 옷이 최소 상의 2~3벌, 하의 2~3벌 정도 있으면 `추천` 탭에서 내일 추천 확인

## 문제 해결

- **"Missing EXPO_PUBLIC_..." 에러**: `.env` 파일 위치/내용 확인 후 `npm start -- --clear`로 캐시 재빌드
- **Edge function 401**: `supabase secrets set` 누락 또는 로그인 세션 만료
- **위치 권한 오류**: 안드로이드 설정 → 앱 → Expo Go → 권한 → 위치 허용
- **OpenWeather 401**: 키가 아직 활성화 안 됨. 10~60분 대기
