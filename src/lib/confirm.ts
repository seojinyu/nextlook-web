import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 * - iOS/Android: uses React Native Alert.alert
 * - Web: uses window.confirm (Alert.alert on web doesn't support callbacks properly)
 */
export function confirm(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  options: { confirmText?: string; cancelText?: string; destructive?: boolean } = {}
) {
  const confirmText = options.confirmText ?? '확인';
  const cancelText = options.cancelText ?? '취소';

  if (Platform.OS === 'web') {
    // window.confirm doesn't support labels but is reliable
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    {
      text: confirmText,
      style: options.destructive ? 'destructive' : 'default',
      onPress: () => { onConfirm(); },
    },
  ]);
}
