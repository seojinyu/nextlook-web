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

export const COMBO_LABELS = ['A', 'B', 'C'] as const;
export const { width: SCREEN_W } = Dimensions.get('window');
export const SLOT_GAP = 10;
export const H_PAD = 20;

// ─── Bold Street 팔레트 ───
export const BOTTEGA = '#1B6B4A';   // 레거시 그린 (다른 화면 호환용)
export const LIME = '#CBFF3C';      // 일렉트릭 라임 — 메인 팝 액센트
export const LIME_DEEP = '#A6E016'; // 진한 라임 (텍스트/보더용)
export const INK = '#111111';       // 니어 블랙
export const SURFACE = '#FAFAF8';   // 오프화이트 배경

export const DATE_CHIP_SIZE = 52;
