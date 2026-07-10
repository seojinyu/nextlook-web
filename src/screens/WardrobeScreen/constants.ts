import { Dimensions } from 'react-native';

export const COLORS = [
  { name: '블랙', hex: '#000000' },
  { name: '화이트', hex: '#FFFFFF' },
  { name: '그레이', hex: '#888888' },
  { name: '라이트그레이', hex: '#CCCCCC' },
  { name: '다크그레이', hex: '#444444' },
  { name: '네이비', hex: '#1B2A4A' },
  { name: '블루', hex: '#2962FF' },
  { name: '라이트블루', hex: '#82B1FF' },
  { name: '레드', hex: '#D32F2F' },
  { name: '와인', hex: '#722F37' },
  { name: '핑크', hex: '#F48FB1' },
  { name: '베이지', hex: '#D7C9AA' },
  { name: '크림', hex: '#FFFDD0' },
  { name: '브라운', hex: '#5D4037' },
  { name: '카키', hex: '#6B7B3A' },
  { name: '그린', hex: '#2E7D32' },
  { name: '민트', hex: '#98FF98' },
  { name: '옐로우', hex: '#FDD835' },
  { name: '오렌지', hex: '#EF6C00' },
  { name: '퍼플', hex: '#7B1FA2' },
];

export const SEASON_FILTERS = [
  { key: 'all', label: '전체', icon: 'apps-outline' },
  { key: 'spring_fall', label: '봄/가을', icon: 'leaf-outline' },
  { key: 'summer', label: '여름', icon: 'sunny-outline' },
  { key: 'winter', label: '겨울', icon: 'snow-outline' },
];

export const AMBER = '#C49A3C';
export const AMBER_LIGHT = '#F5EFE0';
export const AMBER_SELECTED = '#F0E8D6';

export const { width: SCREEN_W } = Dimensions.get('window');
export const CARD_GAP = 10;
export const CARD_PADDING = 16;
export const CARD_W = (SCREEN_W - CARD_PADDING * 2 - CARD_GAP) / 2;

export const COLOR_COLUMNS = 5;
export const COLOR_GAP = 8;
export const MODAL_PAD = 20;
export const COLOR_BTN_W =
  (SCREEN_W - MODAL_PAD * 2 - COLOR_GAP * (COLOR_COLUMNS - 1)) / COLOR_COLUMNS;
export const LIGHT_COLORS = ['#FFFFFF', '#FDD835', '#FFFDD0', '#98FF98', '#CCCCCC'];

export const CAT_LABEL: Record<string, string> = {
  top: '상의',
  bottom: '하의',
  jacket: '자켓',
};

export const SEASON_LABEL: Record<string, string> = {
  spring_fall: '봄/가을',
  summer: '여름',
  winter: '겨울',
  spring: '봄/가을',
  fall: '봄/가을',
};

export const SEASON_ICON: Record<string, string> = {
  spring_fall: 'leaf-outline',
  summer: 'sunny-outline',
  winter: 'snow-outline',
  spring: 'leaf-outline',
  fall: 'leaf-outline',
};
