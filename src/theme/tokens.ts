/**
 * NextLook 디자인 토큰
 * 색상, 간격, 반경, 타이포, 그림자를 한곳에서 관리합니다.
 * 모든 화면과 컴포넌트는 이 파일의 값을 참조해서 스타일을 만드세요.
 */
import { Platform } from 'react-native';

/** 색상 팔레트 */
export const colors = {
  // Brand
  primary: '#1B6B4A',
  primaryDark: '#134D36',
  primaryLight: '#2E8A63',
  primarySoft: '#E6F0EB',

  // Neutrals
  ink: '#1A1A1A',
  inkSoft: '#3A3A3A',
  muted: '#7A7570',
  mutedLight: '#A6A19C',

  // Surfaces
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F2ED',

  // Borders
  border: '#EDEAE6',
  borderStrong: '#D8D3CC',
  borderSoft: '#F0EDEA',

  // Semantic
  success: '#22A06B',
  warning: '#E5A83B',
  danger: '#D64545',
  info: '#3B82C4',

  // Utility
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayStrong: 'rgba(0, 0, 0, 0.85)',
  transparent: 'transparent',
} as const;

/** 간격 (padding, margin, gap) */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** 모서리 둥글기 */
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

/** 폰트 크기 */
export const fontSize = {
  xs: 10,
  sm: 12,
  md: 13,
  base: 14,
  lg: 15,
  xl: 16,
  xxl: 18,
  title: 20,
  h3: 22,
  h2: 26,
  h1: 32,
  hero: 40,
} as const;

/** 폰트 굵기 (React Native 규격) */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

/** 라인 높이 */
export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
} as const;

/** 그림자 (플랫폼 대응) */
export const shadow = {
  none: {},
  sm: Platform.select({
    web: { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
  }),
  md: Platform.select({
    web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
  }),
  lg: Platform.select({
    web: { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
  }),
} as const;

/** 애니메이션 지속 시간 (ms) */
export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

/** 반응형 브레이크포인트 (웹) */
export const breakpoint = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
} as const;

/** z-index 순서 */
export const zIndex = {
  base: 0,
  dropdown: 100,
  header: 500,
  modal: 1000,
  toast: 5000,
  overlay: 9999,
} as const;

/** 통합 export (한 번에 import 편의용) */
export const tokens = {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  lineHeight,
  shadow,
  duration,
  breakpoint,
  zIndex,
} as const;

export default tokens;
