import { Dimensions } from 'react-native';

export const WEATHER_ICON: Record<string, string> = {
  Clear: 'sunny',
  Clouds: 'cloudy',
  Rain: 'rainy',
  Drizzle: 'rainy-outline',
  Thunderstorm: 'thunderstorm',
  Snow: 'snow',
  Mist: 'water-outline',
  Fog: 'water-outline',
  Haze: 'water-outline',
};

export const CONDITION_KR: Record<string, string> = {
  Clear: '맑음',
  Clouds: '흐림',
  Rain: '비',
  Drizzle: '이슬비',
  Thunderstorm: '뇌우',
  Snow: '눈',
  Mist: '안개',
  Fog: '안개',
  Haze: '연무',
};

// ─── Bold Street 팔레트 (통일) ───
export const LIME = '#CBFF3C';        // 일렉트릭 라임 — 액티브 채움 (텍스트는 INK)
export const INK = '#111111';         // 니어 블랙
export const LIME_LIGHT = '#F1FBD7';

// 레거시 호환 — 기존 NAVY 참조를 Bold Street 톤으로 매핑
export const NAVY = INK;
export const NAVY_LIGHT = '#F0EDEA';

export const { width: SCREEN_W } = Dimensions.get('window');
export const H_PAD = 20;
