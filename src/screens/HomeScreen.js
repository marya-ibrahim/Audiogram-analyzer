// ===================================================
// HOME SCREEN — Main dashboard with animated cards
// ===================================================
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, ANIM } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import AppNavBar from '../components/AppNavBar';
import { useLang } from '../context/LanguageContext';
import { I18nManager } from 'react-native';

const { width } = Dimensions.get('window');

// ── Staggered entrance hook ───────────────────────
const useStaggeredEntrance = (count, delay = 120) => {
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.parallel(
      anims.map((anim, i) =>
        Animated.spring(anim, { toValue: 1, delay: i * delay, tension: 50, friction: 7, useNativeDriver: false })
      )
    ).start();
  }, []);
  return anims;
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function HomeScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuthContext();
  const { t, isRTL, textStyle } = useLang();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: ANIM.SLOW, useNativeDriver: false }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: false }),
      Animated.spring(logoScale, { toValue: 1, delay: 100, tension: 40, friction: 7, useNativeDriver: false }),
    ]).start();
  }, []);

  const actions = [
    { id: 'start',   icon: 'ear-outline',              title: t.startTest, subtitle: t.startSub,   gradient: [colors.leftEar, isDark ? '#00B8A3' : '#0F766E'], target: 'SelectEar' },
    { id: 'results', icon: 'stats-chart-outline',       title: t.results,   subtitle: t.resultsSub, gradient: [colors.secondary, isDark ? '#6D28D9' : '#5B21B6'], target: 'History' },
    { id: 'about',   icon: 'information-circle-outline', title: t.about,    subtitle: t.aboutSub,   gradient: [colors.accent, isDark ? '#E68A00' : '#D97706'], target: 'About' },
  ];

  const cardAnims = useStaggeredEntrance(actions.length, 150);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <AppNavBar showBack={false} title={null} />

      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, { transform: [{ translateY: slideAnim }, { scale: logoScale }] }]}>
          <View style={[styles.logoGlow, { backgroundColor: colors.primary + '15' }]}>
            <View style={[styles.logoRing, { borderColor: colors.primary + '40' }]} />
            <LinearGradient
              colors={[colors.bgCard, colors.bgElevated]}
              style={[styles.logoBg, { borderColor: colors.primary + '35' }]}
            >
              <Ionicons name="ear" size={44} color={colors.primary} />
            </LinearGradient>
          </View>
          <View style={styles.titleRow}>
            <Text style={[styles.appName, { color: colors.text }]}>Audiogram</Text>
            <Text style={[styles.appNameAccent, { color: colors.primary }]}>Analyzer</Text>
          </View>
          <Text style={[styles.appSubtitle, { color: colors.textMuted }, textStyle]}>
            Pure-tone hearing assessment powered by medical-grade algorithms
          </Text>
          {user && (
            <View style={styles.greetingRow}>
              <Text style={[styles.greetingText, { color: colors.textMuted }, textStyle]}>{t.hello} </Text>
              <Text style={[styles.greetingName, { color: colors.primary }, textStyle]}>{user.name}</Text>
            </View>
          )}
        </Animated.View>

        {/* WHO Stat */}
        <View style={styles.statWrap}>
          <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="globe-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.statTextWrap}>
              <Text style={[styles.statDesc, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                <Text style={[styles.statNum, { color: colors.primary }]}>1.5B+ </Text>
                {t.whoStat}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Cards — staggered */}
        <View style={styles.cardsContainer}>
          {actions.map((action, i) => (
            <AnimatedTouchable
              key={action.id}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(action.target)}
              style={{
                opacity: cardAnims[i],
                transform: [{
                  translateY: cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
                }],
              }}
            >
              <View style={[styles.actionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <LinearGradient colors={action.gradient} style={styles.actionIconWrap}>
                  <Ionicons name={action.icon} size={24} color="#fff" />
                </LinearGradient>
                <View style={styles.actionTextWrap}>
                  <Text style={[styles.actionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{action.title}</Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>{action.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
              </View>
            </AnimatedTouchable>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, {
          backgroundColor: colors.warning + (isDark ? '12' : '08'),
          borderColor: colors.warning + '30',
        }]}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={[styles.disclaimerText, { color: colors.textMuted }, textStyle]}>
            {t.disclaimer}
          </Text>
        </View>

        {/* Logout */}
        {user && (
          <TouchableOpacity onPress={logout} style={[styles.logoutBtn, { borderColor: colors.border }]}>
            <Ionicons name="log-out-outline" size={16} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>{t.signOut}</Text>
          </TouchableOpacity>
        )}

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  inner:          { flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },

  // Logo
  logoWrap:       { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  logoGlow:       { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoRing:       { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: 54, borderWidth: 2 },
  logoBg:         { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  titleRow:       { flexDirection: 'row', gap: 6 },
  appName:        { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  appNameAccent:  { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  appSubtitle:    { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 300 },
  greetingRow:    { flexDirection: 'row', marginTop: 8 },
  greetingText:   { fontSize: 14 },
  greetingName:   { fontSize: 14, fontWeight: '800' },

  // WHO stat
  statWrap:       { marginBottom: 20 },
  statCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1 },
  statIconBg:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statTextWrap:   { flex: 1 },
  statNum:        { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statDesc:       { fontSize: 12, lineHeight: 17, marginTop: 2 },

  // Cards
  cardsContainer: { gap: 12, marginBottom: 20 },
  actionCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: RADIUS.lg, borderWidth: 1 },
  actionIconWrap: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  actionTextWrap: { flex: 1 },
  actionTitle:    { fontSize: 16, fontWeight: '700' },
  actionSubtitle: { fontSize: 13, marginTop: 2 },

  // Disclaimer
  disclaimer:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, marginBottom: 12 },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Logout
  logoutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: RADIUS.md, borderWidth: 1 },
  logoutText:     { fontSize: 14, fontWeight: '600' },
});
