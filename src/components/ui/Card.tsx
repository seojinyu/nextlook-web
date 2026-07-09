/**
 * Card - 공통 카드 컨테이너
 *
 * 사용 예시:
 *   <Card><Text>기본 카드</Text></Card>
 *   <Card variant="elevated" padding="lg">내용</Card>
 *   <Card onPress={() => {}} variant="outlined">클릭 가능</Card>
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, radius, spacing, shadow } from '../../theme/tokens';

type CardVariant = 'flat' | 'outlined' | 'elevated' | 'soft';
type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  radiusSize?: keyof typeof radius;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
};

export default function Card({
  children,
  variant = 'flat',
  padding = 'md',
  radiusSize = 'lg',
  onPress,
  style,
  disabled = false,
}: Props) {
  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    { padding: paddingMap[padding], borderRadius: radius[radiusSize] },
    variant === 'outlined' && styles.outlined,
    variant === 'elevated' && [styles.surface, shadow.md as ViewStyle],
    variant === 'soft' && styles.soft,
    variant === 'flat' && styles.surface,
    disabled && styles.disabled,
    style,
  ];

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  surface: {
    backgroundColor: colors.surface,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  soft: {
    backgroundColor: colors.surfaceAlt,
  },
  disabled: {
    opacity: 0.5,
  },
});
