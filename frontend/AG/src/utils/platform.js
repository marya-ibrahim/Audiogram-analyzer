// ============================================================
// PLATFORM UTILS — Cross-platform helpers
// ============================================================
import { Platform } from 'react-native';

// useNativeDriver: true crashes on web, false on native is slower but works
export const nativeDriver = Platform.OS !== 'web';

// Convert shadow* props to boxShadow for web
export const shadow = (color = '#000', opacity = 0.15, radius = 8, offsetY = 4) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0px ${offsetY}px ${radius}px rgba(0,0,0,${opacity})`,
    };
  }
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowOffset: { width: 0, height: offsetY },
    shadowRadius: radius,
    elevation: Math.round(offsetY * 2),
  };
};
