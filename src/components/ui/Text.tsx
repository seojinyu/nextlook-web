/**
 * Text - 일관된 타이포 스타일을 강제하는 텍스트 컴포넌트
 *
 * 사용 예시:
 *   <Txt variant="h1">타이틀</Txt>
 *   <Txt variant="body" color="muted">설명 문구</Txt>
 *   <Txt variant="label" weight="bold">라벨</Txt>
 *
 * 이름을 Txt로 export한 이유: React Native의 Text와 이름 충돌을 피하기 위함.
 */
import React from 'react';
import { Text as RNText, TextStyle, StyleProp, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight } from '../../theme/tokens';

type TxtVariant =
  | 'hero'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'caption';

type TxtColor = 'ink' | 'inkSoft' | 'muted' | 'mutedLight' | 'primary' | 'danger' | 'success' | 'white';
type TxtWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
type TxtAlign = 'left' | 'center' | 'right';

interface Props {
  children: React.ReactNode;
  variant?: TxtVariant;
  color?: TxtColor;
  weight?: TxtWeight;
  align?: TxtAlign;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

export default function Txt({
  children,
  variant = 'body',
  color = 'ink',
  weight,
  align,
  numberOfLines,
  style,
}: Props) {
  const composed: StyleProp<TextStyle> = [
    variantStyle[variant],
    { color: colorMap[color] },
    weight && { fontWeight: fontWeight[weight] as any },
    align && { textAlign: align },
    style,
  ];
  return (
    <RNText style={composed} numberOfLines={numberOfLines}>
      {children}
    </RNText>
  );
}

const colorMap: Record<TxtColor, string> = {
  ink: colors.ink,
  inkSoft: colors.inkSoft,
  muted: colors.muted,
  mutedLight: colors.mutedLight,
  primary: colors.primary,
  danger: colors.danger,
  success: colors.success,
  white: '#fff',
};

const variantStyle = StyleSheet.create<Record<TxtVariant, TextStyle>>({
  hero:    { fontSize: fontSize.hero, fontWeight: fontWeight.extrabold as any, letterSpacing: -0.5 },
  h1:      { fontSize: fontSize.h1,   fontWeight: fontWeight.extrabold as any, letterSpacing: -0.3 },
  h2:      { fontSize: fontSize.h2,   fontWeight: fontWeight.bold as any },
  h3:      { fontSize: fontSize.h3,   fontWeight: fontWeight.bold as any },
  title:   { fontSize: fontSize.title, fontWeight: fontWeight.bold as any },
  body:    { fontSize: fontSize.base, fontWeight: fontWeight.regular as any },
  bodySm:  { fontSize: fontSize.md,   fontWeight: fontWeight.regular as any },
  label:   { fontSize: fontSize.md,   fontWeight: fontWeight.semibold as any },
  caption: { fontSize: fontSize.sm,   fontWeight: fontWeight.regular as any },
});
