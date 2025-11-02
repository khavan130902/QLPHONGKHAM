import { Alert } from 'react-native';

export default function safeAlert(
  title: string,
  message?: string,
  buttons?: any[],
) {
  try {
    // Use native Alert when possible
    Alert.alert(title, message ?? undefined, buttons ?? undefined);
  } catch (e) {
    // If the native layer is not ready (BadTokenException etc), log instead of throwing
    // This prevents crashes from attempted window additions while Activity is not ready.
    // eslint-disable-next-line no-console
    console.warn(
      '[safeAlert] fallback - could not show Alert:',
      title,
      message,
      e,
    );
  }
}
