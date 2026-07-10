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

export const NAVY = '#3D5A80';
export const NAVY_LIGHT = '#E8EDF2';

export const { width: SCREEN_W } = Dimensions.get('window');
export const H_PAD = 20;
