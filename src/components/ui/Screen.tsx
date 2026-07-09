/**
 * Screen - 모든 화면의 공통 컨테이너
 * SafeArea + 배경색 + padding을 통일합니다.
 *
 * 사용 예시:
 *   <Screen>내용</Screen>
 *   <Screen edges={['top']} padding="none">헤더가 붙는 화면</Screen>
 *   <Screen background="surface">흰 배경</Screen>
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme/tokens';

type ScreenBg = 'bg' | 'surface' | 'surfaceAlt' | 'primary';
type ScreenPadding = 'none' | 'sm' | 'md' | 'lg';

interface Props {
  children: React.ReactNode;
  background?: ScreenBg;
  padding?: ScreenPadding;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

const paddingMap: Record<ScreenPadding, number> = {
  none: 0,
  sm: spacing.sm,
  md: spacing.lg,
  lg: spacing.xl,
};

const bgMap: Record<ScreenBg, string> = {
  bg: colors.bg,
  surface: colors.surface,
  surfaceAlt: colors.surfaceAlt,
  primary: colors.primary,
};

export default function Screen({
  children,
  background = 'bg',
  padding = 'none',
  edges = ['top', 'left', 'right'],
  style,
}: Props) {
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor: bgMap[background] }]}
    >
      <View style={[{ flex: 1, padding: paddingMap[padding] }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
