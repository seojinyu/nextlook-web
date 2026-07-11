import { Dimensions } from 'react-native';

export const COLORS = [
  // 무채색
  { name: '블랙', hex: '#000000' },
  { name: '차콜', hex: '#2A2A2A' },
  { name: '다크그레이', hex: '#444444' },
  { name: '그레이', hex: '#888888' },
  { name: '라이트그레이', hex: '#CCCCCC' },
  { name: '화이트', hex: '#FFFFFF' },
  // 블루 계열
  { name: '네이비', hex: '#1B2A4A' },
  { name: '데님', hex: '#4A6FA5' },
  { name: '블루', hex: '#2962FF' },
  { name: '스카이블루', hex: '#87CEEB' },
  { name: '라이트블루', hex: '#82B1FF' },
  { name: '터콰이즈', hex: '#40E0D0' },
  // 레드/핑크 계열
  { name: '레드', hex: '#D32F2F' },
  { name: '버건디', hex: '#800020' },
  { name: '와인', hex: '#722F37' },
  { name: '코랄', hex: '#FF7F50' },
  { name: '핑크', hex: '#F48FB1' },
  { name: '로즈', hex: '#FF6B9D' },
  { name: '라이트핑크', hex: '#FFD1DC' },
  // 옐로우/오렌지
  { name: '옐로우', hex: '#FDD835' },
  { name: '머스타드', hex: '#D4A017' },
  { name: '오렌지', hex: '#EF6C00' },
  { name: '테라코타', hex: '#C86A48' },
  // 그린 계열
  { name: '민트', hex: '#98FF98' },
  { name: '세이지', hex: '#9CAF88' },
  { name: '올리브', hex: '#808000' },
  { name: '카키', hex: '#6B7B3A' },
  { name: '그린', hex: '#2E7D32' },
  { name: '다크그린', hex: '#1B4D1B' },
  // 브라운/베이지 (어스톤)
  { name: '아이보리', hex: '#FFFFF0' },
  { name: '크림', hex: '#FFFDD0' },
  { name: '베이지', hex: '#D7C9AA' },
  { name: '샌드', hex: '#C2A878' },
  { name: '카멜', hex: '#A88B6A' },
  { name: '브라운', hex: '#5D4037' },
  { name: '다크브라운', hex: '#3E2723' },
  // 퍼플
  { name: '라벤더', hex: '#B19CD9' },
  { name: '퍼플', hex: '#7B1FA2' },
  { name: '딥퍼플', hex: '#4A148C' },
  // 실버/골드
  { name: '실버', hex: '#C0C0C0' },
  { name: '골드', hex: '#D4AF37' },
];

export type ColorEntry = { name: string; hex: string };

export const BOTTEGA = '#1B6B4A';
export const AMBER = '#C49A3C';

export const CAT_LABEL: Record<string, string> = {
  top: '상의',
  bottom: '하의',
  jacket: '자켓',
};

export const SEASON_LABEL: Record<string, string> = {
  spring_fall: '봄/가을',
  summer: '여름',
  winter: '겨울',
};

export const SEASON_ICON: Record<string, string> = {
  spring_fall: 'leaf-outline',
  summer: 'sunny-outline',
  winter: 'snow-outline',
};

export const { width: SCREEN_W } = Dimensions.get('window');
export const H_PAD = 20;
export const COLOR_COLUMNS = 5;
export const COLOR_GAP = 8;
export const COLOR_BTN_W =
  (SCREEN_W - H_PAD * 2 - COLOR_GAP * (COLOR_COLUMNS - 1)) / COLOR_COLUMNS;
export const PREVIEW_SIZE = SCREEN_W - H_PAD * 2;
export const LIGHT_COLORS = [
  '#FFFFFF', '#FFFFF0', '#FFFDD0', '#FDD835', '#98FF98',
  '#CCCCCC', '#D7C9AA', '#87CEEB', '#82B1FF', '#40E0D0',
  '#FFD1DC', '#B19CD9', '#9CAF88', '#C0C0C0', '#D4AF37',
];
