// ============================================================
// ANIM UTILS — Cross-platform animation helpers
// useNativeDriver must be false on web
// ============================================================
import { Platform } from 'react-native';

export const nativeDriver = Platform.OS !== 'web';
