// ============================================================
// TOAST + MODAL PORTAL — Always visible regardless of scroll
// ============================================================
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const ToastContext = createContext(null);

const ICONS = {
  error:   { name: 'alert-circle',       color: '#FF6B6B' },
  success: { name: 'checkmark-circle',   color: '#00D68F' },
  warning: { name: 'warning',            color: '#FFB347' },
  info:    { name: 'information-circle', color: '#8B7FFF' },
};

// Inject CSS for fixed positioning on web
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    .toast-portal  { position: fixed !important; top:0; left:0; right:0; bottom:0; width:100vw; height:100vh; z-index:99998; pointer-events:none; display:flex; align-items:center; justify-content:center; }
    .toast-portal-interactive { pointer-events: auto; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6); }
    .toast-bar     { position: fixed !important; bottom: 32px; left: 50%; transform: translateX(-50%); z-index:99999; pointer-events:none; min-width: 300px; max-width: 440px; }
  `;
  document.head.appendChild(style);
}

export function ToastProvider({ children }) {
  const { colors } = useTheme();
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const timerRef  = useRef(null);

  const showToast = useCallback((message, type = 'error', duration = 3500) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    opacity.setValue(0);
    translateY.setValue(20);
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, duration);
  }, []);
  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
  }, []);

  const showModal = useCallback((content) => setModal(content), []);
  const hideModal = useCallback(() => setModal(null), []);

  const icon = toast ? (ICONS[toast.type] ?? ICONS.info) : null;

  return (
    <ToastContext.Provider value={{ showToast, hideToast, showModal, hideModal }}>
      {children}

      {/* Modal Portal */}
      {modal && (
        Platform.OS === 'web'
          ? <div className="toast-portal toast-portal-interactive">{modal}</div>
          : <View style={styles.portalNative}>{modal}</View>
      )}

      {/* Toast Bar */}
      {toast && icon && (
        Platform.OS === 'web'
          ? (
            <div className="toast-bar">
              <Animated.View style={[styles.toastWrap, { opacity, transform: [{ translateY }] }]}>
                <View style={[styles.toast, { backgroundColor: colors.bgCard, borderColor: icon.color + '50' }]}>
                  <Ionicons name={icon.name} size={20} color={icon.color} />
                  <Text style={[styles.message, { color: colors.text }]}>{toast.message}</Text>
                </View>
              </Animated.View>
            </div>
          )
          : (
            <Animated.View style={[styles.toastNative, { opacity, transform: [{ translateY }] }]}>
              <View style={[styles.toast, { backgroundColor: colors.bgCard, borderColor: icon.color + '50' }]}>
                <Ionicons name={icon.name} size={20} color={icon.color} />
                <Text style={[styles.message, { color: colors.text }]}>{toast.message}</Text>
              </View>
            </Animated.View>
          )
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

const styles = StyleSheet.create({
  portalNative: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 99998,
  },
  toastNative: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    alignItems: 'center', zIndex: 99999,
  },
  toastWrap: { alignItems: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
    borderRadius: RADIUS.full, borderWidth: 1, maxWidth: 420,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  message: { fontSize: 14, fontWeight: '600', flex: 1 },
});
