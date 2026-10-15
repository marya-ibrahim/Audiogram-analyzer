// ============================================================
// LOCAL STORE — localStorage replacement that works on Android/iOS
// Web    -> window.localStorage
// Mobile -> expo-sqlite key-value store (synchronous API)
// Never throws: returns null / does nothing on failure.
// ============================================================
import { Platform } from 'react-native';

let kv = null;
if (Platform.OS !== 'web') {
  try {
    kv = require('expo-sqlite/kv-store').default;
  } catch (e) {
    console.warn('[localStore] kv-store unavailable:', e?.message);
  }
}

const webStore = () =>
  typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;

export const localStore = {
  getItem(key) {
    try {
      if (Platform.OS === 'web') return webStore()?.getItem(key) ?? null;
      return kv ? kv.getItemSync(key) : null;
    } catch { return null; }
  },
  setItem(key, value) {
    try {
      if (Platform.OS === 'web') webStore()?.setItem(key, value);
      else kv?.setItemSync(key, value);
    } catch {}
  },
  removeItem(key) {
    try {
      if (Platform.OS === 'web') webStore()?.removeItem(key);
      else kv?.removeItemSync(key);
    } catch {}
  },
};

export default localStore;
