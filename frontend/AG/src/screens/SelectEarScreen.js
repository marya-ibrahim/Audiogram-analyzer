// ===================================================
// SELECT EAR SCREEN
// Enhanced with theme, animations, glass effects
// ===================================================
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, ANIM } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import AppNavBar from '../components/AppNavBar';
import { useLang } from '../context/LanguageContext';

// ── Staggered entrance hook ───────────────────────
const useStaggeredEntrance = (count, delay = 120) => {
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.parallel(
      anims.map((anim, i) =>
        Animated.spring(anim, { toValue: 1, delay: i * delay, tension: 50, friction: 7, useNativeDriver: true })
      )
    ).start();
  }, []);
  return anims;
};

const animStyle = (anim) => ({
  opacity: anim,
  transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
});

export default function SelectEarScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t, isRTL, textStyle } = useLang();
  const [algorithm, setAlgorithm] = useState('traditional');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // 0=tip, 1=leftEar, 2=rightEar, 3=algo, 4=instructions
  const itemAnims = useStaggeredEntrance(5, 100);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: ANIM.SLOW, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const ears = [
    { id: 'left',  label: t.leftEar,  symbol: 'X', icon: 'ear-outline', color: colors.leftEar,  dim: colors.leftEarDim,  hint: t.leftHint },
    { id: 'right', label: t.rightEar, symbol: 'O', icon: 'ear-outline', color: colors.rightEar, dim: colors.rightEarDim, hint: t.rightHint },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <AppNavBar navigation={navigation} title="Select Ear" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          <Text style={[styles.heading, { color: colors.text }, textStyle]}>{t.chooseEar}</Text>
          <Text style={[styles.subheading, { color: colors.textMuted }, textStyle]}>{t.chooseEarSub}</Text>

          {/* Tip */}
          <Animated.View style={animStyle(itemAnims[0])}>
            <View style={[styles.tip, { backgroundColor: colors.accentDim, borderColor: colors.accent + '25' }]}>
              <Ionicons name="headset-outline" size={20} color={colors.accent} />
              <Text style={[styles.tipText, { color: colors.accent }]}>{t.tipText}</Text>
            </View>
          </Animated.View>

          {/* Ear Cards */}
          <View style={styles.earRow}>
            {ears.map((ear, index) => (
              <Animated.View key={ear.id} style={[{ flex: 1 }, animStyle(itemAnims[index + 1])]}>
                <EarCard
                  ear={ear}
                  colors={colors}
                  isDark={isDark}
                  onPress={() => navigation.navigate('Test', { ear: ear.id, sessionType: 'air', algorithm })}
                />
              </Animated.View>
            ))}
          </View>

          {/* Algorithm Selection */}
          <Animated.View style={animStyle(itemAnims[3])}>
            <View style={[styles.algoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.algoTitle, { color: colors.textMuted }]}>{t.algorithm}</Text>
              <View style={styles.algoRow}>
                <TouchableOpacity
                  style={[styles.algoBtn, {
                    borderColor: algorithm === 'traditional' ? colors.primary + '60' : colors.border,
                    backgroundColor: algorithm === 'traditional' ? colors.primaryDim : 'transparent',
                  }]}
                  onPress={() => setAlgorithm('traditional')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trending-up-outline" size={16} color={algorithm === 'traditional' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.algoBtnText, { color: algorithm === 'traditional' ? colors.primary : colors.textMuted }]}>{t.traditional}</Text>
                  <Text style={[styles.algoDesc, { color: colors.textDim }]}>Hughson-Westlake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.algoBtn, {
                    borderColor: algorithm === 'gpc' ? colors.secondary + '60' : colors.border,
                    backgroundColor: algorithm === 'gpc' ? colors.secondaryDim : 'transparent',
                  }]}
                  onPress={() => setAlgorithm('gpc')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="analytics-outline" size={16} color={algorithm === 'gpc' ? colors.secondary : colors.textMuted} />
                  <Text style={[styles.algoBtnText, { color: algorithm === 'gpc' ? colors.secondary : colors.textMuted }]}>{t.adaptive}</Text>
                  <Text style={[styles.algoDesc, { color: colors.textDim }]}>GPC Algorithm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Instructions */}
          <Animated.View style={animStyle(itemAnims[4])}>
            <View style={[styles.instructions, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.instrTitle, { color: colors.text }]}>{t.beforeBegin}</Text>
              {t.steps.map((step, i) => (
                <View key={i} style={styles.instrRow}>
                  <View style={[styles.instrBullet, { backgroundColor: colors.primaryDim }]}>
                    <Text style={[styles.instrNum, { color: colors.primary }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.instrText, { color: colors.textMuted }]}>{step}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Ear Card ──────────────────────────────────────
function EarCard({ ear, colors, onPress }) {
  const [pressed, setPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 100, friction: 8 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, tension: 100, friction: 8 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.earCard, {
          borderColor: pressed ? ear.color + '60' : colors.border,
          backgroundColor: colors.bgCard,
        }]}
      >
        <View style={[styles.symbolBadge, { backgroundColor: ear.color + '18', borderColor: ear.color + '35' }]}>
          <Text style={[styles.symbolText, { color: ear.color }]}>{ear.symbol}</Text>
        </View>
        <View style={[styles.earIcon, { backgroundColor: ear.dim }]}>
          <Ionicons name={ear.icon} size={40} color={ear.color} />
        </View>
        <Text style={[styles.earLabel, { color: ear.color }]}>{ear.label}</Text>
        <Text style={[styles.earHint, { color: colors.textMuted }]} numberOfLines={2}>{ear.hint}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  scrollContent:{ flexGrow: 1 },
  content:      { paddingHorizontal: SPACING.lg, paddingTop: 16, paddingBottom: 32 },
  heading:      { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  subheading:   { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  tip:          { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.md, padding: 12, marginBottom: 20, borderWidth: 1 },
  tipText:      { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  earRow:       { flexDirection: 'row', gap: 12, marginBottom: 20 },
  earCard:      { borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1.5, minHeight: 180 },
  symbolBadge:  { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  symbolText:   { fontSize: 16, fontWeight: '800' },
  earIcon:      { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  earLabel:     { fontSize: 16, fontWeight: '700' },
  earHint:      { fontSize: 11, textAlign: 'center' },
  algoCard:     { borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, marginBottom: 20 },
  algoTitle:    { fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  algoRow:      { flexDirection: 'row', gap: 10 },
  algoBtn:      { flex: 1, alignItems: 'center', padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, gap: 4 },
  algoBtnText:  { fontSize: 14, fontWeight: '700' },
  algoDesc:     { fontSize: 10 },
  instructions: { borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, marginBottom: 24 },
  instrTitle:   { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  instrRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  instrBullet:  { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  instrNum:     { fontSize: 11, fontWeight: '700' },
  instrText:    { flex: 1, fontSize: 13, lineHeight: 18 },
});
