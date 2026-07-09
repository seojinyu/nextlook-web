/**
 * Chip - 필터/카테고리/계절 선택 등에 쓰는 태그형 버튼
 *
 * 사용 예시:
 *   <Chip selected={isSummer} onPress={toggle}>여름</Chip>
 *   <Chip variant="filled" color="primary">추천</Chip>
 *   <Chip size="sm" icon="👕">상의</Chip>
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '../../theme/tokens';

type ChipVariant = 'default' | 'filled' | 'ghost';
type ChipSize = 'sm' | 'md' | 'lg';
type ChipColor = 'neutral' | 'primary' | 'danger' | 'success';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  variant?: ChipVariant;
  size?: ChipSize;
  color?: ChipColor;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export default function Chip({
  children,
  onPress,
  selected = false,
  variant = 'default',
  size = 'md',
  color = 'neutral',
  icon,
  style,
  disabled = false,
}: Props) {
  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    sizeContainer[size],
    variant === 'default' && styles.outlined,
    variant === 'filled' && styles.filled,
    variant === 'ghost' && styles.ghost,
    selected && selectedContainer[color],
    disabled && styles.disabled,
    style,
  ];

  const labelStyle: StyleProp<TextStyle> = [
    sizeLabel[size],
    styles.label,
    selected ? selectedLabel[color] : unselectedLabel[color],
  ];

  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={containerStyle}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={labelStyle} numberOfLines={1}>
        {children}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  outlined: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filled: {
    backgroundColor: colors.surfaceAlt,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontWeight: fontWeight.semibold as any,
  },
  disabled: {
    opacity: 0.4,
  },
});

const sizeContainer: Record<ChipSize, ViewStyle> = {
  sm: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  md: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  lg: { paddingHorizontal: spacing.lg, paddingVertical: 8 },
};

const sizeLabel: Record<ChipSize, TextStyle> = {
  sm: { fontSize: fontSize.sm },
  md: { fontSize: fontSize.base },
  lg: { fontSize: fontSize.lg },
};

const selectedContainer: Record<ChipColor, ViewStyle> = {
  neutral: { backgroundColor: colors.ink, borderColor: colors.ink },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger },
  success: { backgroundColor: colors.success, borderColor: colors.success },
};

const selectedLabel: Record<ChipColor, TextStyle> = {
  neutral: { color: '#fff' },
  primary: { color: '#fff' },
  danger: { color: '#fff' },
  success: { color: '#fff' },
};

const unselectedLabel: Record<ChipColor, TextStyle> = {
  neutral: { color: colors.ink },
  primary: { color: colors.primary },
  danger: { color: colors.danger },
  success: { color: colors.success },
};
