import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertRequest {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

// On web, we use a React modal rendered by AlertProvider.
// This callback is set by AlertProvider on mount.
let webAlertHandler: ((req: AlertRequest) => void) | null = null;

export function setWebAlertHandler(handler: ((req: AlertRequest) => void) | null): void {
  webAlertHandler = handler;
}

/**
 * Cross-platform alert. On native uses Alert.alert, on web uses
 * a styled modal rendered by AlertProvider.
 */
export function crossAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const resolvedButtons = buttons ?? [{ text: 'OK', style: 'default' as const }];

  if (webAlertHandler) {
    webAlertHandler({ title, message, buttons: resolvedButtons });
  } else {
    // Fallback if AlertProvider isn't mounted
    const fullMessage = message ? `${title}\n\n${message}` : title;
    const actionBtns = resolvedButtons.filter((b) => b.style !== 'cancel');
    if (actionBtns.length <= 1) {
      if (window.confirm(fullMessage)) {
        actionBtns[0]?.onPress?.();
      }
    } else {
      window.alert(fullMessage);
    }
  }
}
