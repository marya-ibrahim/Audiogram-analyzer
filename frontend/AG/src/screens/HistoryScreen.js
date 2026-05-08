// ===================================================
// HISTORY SCREEN - Past test results & audiograms
// Enhanced with theme support, animations, and polish
// ===================================================
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, RefreshControl, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SPACING, RADIUS, ANIM, FREQUENCIES, FREQ_LABELS, getHearingLevel } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useTests } from '../hooks/useTests';
import AudiogramChart from '../components/AudiogramChart';
import AppNavBar from '../components/AppNavBar';
import { useLang } from '../context/LanguageContext';
import { useToast } from '../components/Toast';

const { width } = Dimensions.get('window');

export default function HistoryScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const { t, textStyle } = useLang();
  const { showModal, hideModal } = useToast();
  const { tests, loading: refreshing, refresh: loadTests, deleteTest: removeTest } = useTests();
  const openTestId = route?.params?.openTestId;
  const [expanded, setExpanded] = useState(openTestId ?? null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: ANIM.NORMAL, useNativeDriver: false }).start();
    loadTests();
  }, []));

  // Fallback: ensure visible after mount
  useEffect(() => {
    fadeAnim.setValue(1);
  }, []);
  useEffect(() => {
    if (tests.length === 0) return;
    if (openTestId) {
      // Try to find by id (string or number comparison)
      const found = tests.find(t => String(t.id) === String(openTestId));
      setExpanded(found ? found.id : tests[0]?.id);
    }
  }, [tests, openTestId]);

  const handleDelete = (test) => {
    showModal(
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.box, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="warning-outline" size={32} color={colors.danger} style={{ marginBottom: 8 }} />
          <Text style={[modalStyles.title, { color: colors.text }]}>{t.deleteTitle}</Text>
          <Text style={[modalStyles.body, { color: colors.textMuted }]}>{t.cannotUndo}</Text>
          <View style={modalStyles.btns}>
            <TouchableOpacity style={[modalStyles.cancel, { borderColor: colors.border }]} onPress={hideModal}>
              <Text style={[modalStyles.cancelText, { color: colors.textMuted }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.confirm, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}
              onPress={() => { hideModal(); removeTest(test); }}
            >
              <Text style={[modalStyles.confirmText, { color: colors.danger }]}>{t.delete}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleClearAll = () => {
    showModal(
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.box, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="warning-outline" size={32} color={colors.danger} style={{ marginBottom: 8 }} />
          <Text style={[modalStyles.title, { color: colors.text }]}>{t.clearTitle}</Text>
          <Text style={[modalStyles.body, { color: colors.textMuted }]}>{t.cannotUndo}</Text>
          <View style={modalStyles.btns}>
            <TouchableOpacity style={[modalStyles.cancel, { borderColor: colors.border }]} onPress={hideModal}>
              <Text style={[modalStyles.cancelText, { color: colors.textMuted }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.confirm, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}
              onPress={async () => { hideModal(); for (const t2 of tests) await removeTest(t2); }}
            >
              <Text style={[modalStyles.confirmText, { color: colors.danger }]}>{t.clearAll}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const findBoneMatch = (airTest) => {
    if (airTest.session_type !== 'air') return null;
    return tests.find(t =>
      t.session_type === 'bone' && t.ear === airTest.ear &&
      Math.abs(new Date(t.date) - new Date(airTest.date)) < 24 * 60 * 60 * 1000
    ) || null;
  };

  const shouldRenderTest = (test) => {
    if (test.session_type === 'air') return true;
    return !tests.some(t =>
      t.session_type === 'air' && t.ear === test.ear &&
      Math.abs(new Date(t.date) - new Date(test.date)) < 24 * 60 * 60 * 1000
    );
  };

  const visibleTests = tests.filter(shouldRenderTest);

  // ── EMPTY STATE ──────────────────────────────────
  if (visibleTests.length === 0 && tests.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ScrollView stickyHeaderIndices={[0]}>
          <View><AppNavBar navigation={navigation} title="My Results" /></View>
          <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }, textStyle]}>{t.noTests}</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }, textStyle]}>{t.noTestsSub}</Text>
            <TouchableOpacity style={styles.startTestBtn} onPress={() => navigation.navigate('SelectEar')}>
              <LinearGradient colors={[colors.primary, isDark ? '#00B8A0' : '#0F766E']} style={styles.startGrad}>
                <Text style={[styles.startText, { color: isDark ? colors.bg : '#fff' }]}>{t.firstTest}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Sticky Navbar — outside ScrollView */}
      <AppNavBar navigation={navigation} title="My Results" />
      {tests.length > 0 && (
        <TouchableOpacity
          onPress={handleClearAll}
          style={[styles.clearBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '25' }]}
        >
          <Ionicons name="trash-outline" size={14} color={colors.danger} />
          <Text style={[styles.clearBtnText, { color: colors.danger }]}>{t.clearAll}</Text>
        </TouchableOpacity>
      )}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadTests} tintColor={colors.primary} />}
        >

          {/* Test Cards */}
          <View style={styles.cardsList}>
            {visibleTests.map((test) => {
              const earColor  = test.ear === 'left' ? colors.leftEar : colors.rightEar;
              const isBone    = test.session_type === 'bone';
              const typeColor = isBone ? colors.secondary : earColor;
              const isAdaptive = test.strategy_type === 'gaussian_process';
              const zone      = getHearingLevel(test.avg_threshold);
              const isExpanded = expanded === test.id;
              const boneMatch = findBoneMatch(test);

              const airThresholds  = test.session_type === 'air' ? test.results : {};
              const boneThresholds = boneMatch ? boneMatch.results : (isBone ? test.results : {});
              const leftAir   = test.ear === 'left'  ? airThresholds  : {};
              const rightAir  = test.ear === 'right' ? airThresholds  : {};
              const leftBone  = test.ear === 'left'  ? boneThresholds : {};
              const rightBone = test.ear === 'right' ? boneThresholds : {};

              return (
                <View key={test.id} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : test.id)} activeOpacity={0.8}>
                    <LinearGradient colors={[colors.bgCard, colors.bgElevated]} style={styles.cardHeader}>
                      <View style={styles.cardTop}>
                        <View style={styles.pillsRow}>
                          <View style={[styles.earPill, { backgroundColor: earColor + '20', borderColor: earColor + '40' }]}>
                            <View style={[styles.earDot, { backgroundColor: earColor }]} />
                            <Text style={[styles.earPillText, { color: earColor }]}>{test.ear === 'left' ? 'Left' : 'Right'}</Text>
                          </View>
                          <View style={[styles.typePill, { backgroundColor: typeColor + '18', borderColor: typeColor + '35' }]}>
                            <Ionicons name={isBone ? 'radio-outline' : 'headset-outline'} size={11} color={typeColor} />
                            <Text style={[styles.typePillText, { color: typeColor }]}>{isBone ? 'Bone' : 'Air'}</Text>
                          </View>
                          {boneMatch && (
                            <View style={[styles.pairedBadge, { backgroundColor: colors.secondary + '18', borderColor: colors.secondary + '35' }]}>
                              <Ionicons name="radio-outline" size={11} color={colors.secondary} />
                              <Text style={[styles.pairedBadgeText, { color: colors.secondary }]}>+Bone</Text>
                            </View>
                          )}
                          {/* Algorithm badge */}
                          <View style={[styles.pairedBadge, {
                            backgroundColor: isAdaptive ? colors.secondary + '15' : colors.primary + '12',
                            borderColor: isAdaptive ? colors.secondary + '40' : colors.primary + '25',
                          }]}>
                            <Ionicons
                              name={isAdaptive ? 'analytics-outline' : 'trending-up-outline'}
                              size={10}
                              color={isAdaptive ? colors.secondary : colors.primary}
                            />
                            <Text style={[styles.pairedBadgeText, { color: isAdaptive ? colors.secondary : colors.primary }]}>
                              {isAdaptive ? 'GPC' : 'H-W'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.dateText, { color: colors.textDim }]}>{formatDate(test.date)}</Text>
                      </View>
                      <View style={styles.levelRow}>
                        <View style={[styles.levelBadge, { backgroundColor: zone.color + '20' }]}>
                          <Text style={[styles.levelText, { color: zone.color }]}>{zone.label}</Text>
                        </View>
                        <Text style={[styles.avgText, { color: colors.textMuted }]}>{t.avg}: {test.avg_threshold?.toFixed(0)} dB HL</Text>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.chartContainer, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
                      <View style={styles.chartLegend}>
                        {Object.keys(airThresholds).length > 0 && (
                          <View style={styles.legendItem}>
                            <Ionicons name="headset-outline" size={13} color={earColor} />
                            <Text style={[styles.legendLabel, { color: earColor }]}>Air</Text>
                          </View>
                        )}
                        {Object.keys(boneThresholds).length > 0 && (
                          <View style={styles.legendItem}>
                            <Ionicons name="radio-outline" size={13} color={colors.secondary} />
                            <Text style={[styles.legendLabel, { color: colors.secondary }]}>Bone</Text>
                          </View>
                        )}
                      </View>

                      <AudiogramChart
                        leftThresholds={leftAir} rightThresholds={rightAir}
                        leftBoneThresholds={leftBone} rightBoneThresholds={rightBone}
                        width={width - 4}
                      />

                      {Object.keys(airThresholds).length > 0 && (
                        <View style={[styles.freqTableWrap, { backgroundColor: colors.bgElevated }]}>
                          <Text style={[styles.freqTableTitle, { color: earColor }]}>
                            {t.air} — {test.ear === 'left' ? t.leftEar : t.rightEar}
                          </Text>
                          <View style={styles.freqTable}>
                            {FREQUENCIES.map((f, i) => (
                              <View key={f} style={styles.freqRow}>
                                <Text style={[styles.freqLabel, { color: colors.textMuted }]}>{FREQ_LABELS[i]} Hz</Text>
                                <Text style={[styles.freqValue, { color: earColor }]}>
                                  {airThresholds[f] != null ? `${airThresholds[f]} dB` : '—'}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {Object.keys(boneThresholds).length > 0 && (
                        <View style={[styles.freqTableWrap, { backgroundColor: colors.bgElevated }]}>
                          <Text style={[styles.freqTableTitle, { color: colors.secondary }]}>
                            {t.bone} — {test.ear === 'left' ? t.leftEar : t.rightEar}
                          </Text>
                          <View style={styles.freqTable}>
                            {FREQUENCIES.map((f, i) => (
                              <View key={f} style={styles.freqRow}>
                                <Text style={[styles.freqLabel, { color: colors.textMuted }]}>{FREQ_LABELS[i]} Hz</Text>
                                <Text style={[styles.freqValue, { color: colors.secondary }]}>
                                  {boneThresholds[f] != null ? `${boneThresholds[f]} dB` : '—'}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {boneMatch && (
                        <View style={[styles.abgBox, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '30' }]}>
                          <Text style={[styles.abgTitle, { color: colors.warning }]}>Air-Bone Gap (ABG)</Text>
                          <View style={styles.abgRow}>
                            {FREQUENCIES.filter(f => airThresholds[f] != null && boneThresholds[f] != null).map((f) => {
                              const gap = airThresholds[f] - boneThresholds[f];
                              const gapColor = gap >= 15 ? colors.warning : colors.success;
                              return (
                                <View key={f} style={styles.abgItem}>
                                  <Text style={[styles.abgFreq, { color: colors.textDim }]}>{FREQ_LABELS[FREQUENCIES.indexOf(f)]}</Text>
                                  <Text style={[styles.abgVal, { color: gapColor }]}>{gap > 0 ? '+' : ''}{gap} dB</Text>
                                </View>
                              );
                            })}
                          </View>
                          <Text style={[styles.abgHint, { color: colors.textDim }]}>ABG ≥ 15 dB indicates conductive hearing loss component</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}
                        onPress={() => handleDelete(test)} activeOpacity={0.75}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        <Text style={[styles.deleteBtnText, { color: colors.danger }]}>{t.deleteTest}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  box:         { width: '85%', maxWidth: 340, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, alignItems: 'center' },
  title:       { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  body:        { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  btns:        { flexDirection: 'row', gap: 12, width: '100%' },
  cancel:      { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center' },
  cancelText:  { fontSize: 14, fontWeight: '700' },
  confirm:     { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center' },
  confirmText: { fontSize: 14, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container:      { flex: 1 },
  scroll:         { paddingBottom: 40 },
  cardsList:      { padding: SPACING.lg, gap: 12 },
  clearBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginRight: SPACING.lg, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1 },
  clearBtnText:   { fontSize: 12, fontWeight: '700' },

  emptyState:     { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: 12, marginTop: 60 },
  emptyIconWrap:  { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:     { fontSize: 24, fontWeight: '800', marginTop: 8 },
  emptyText:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  startTestBtn:   { marginTop: 8, borderRadius: RADIUS.lg, overflow: 'hidden', width: '100%' },
  startGrad:      { padding: 16, alignItems: 'center' },
  startText:      { fontSize: 16, fontWeight: '800' },

  card:           { borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1 },
  cardHeader:     { padding: 16, gap: 10 },
  cardTop:        { gap: 6 },
  pillsRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  earPill:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  earDot:         { width: 6, height: 6, borderRadius: 3 },
  earPillText:    { fontSize: 11, fontWeight: '700' },
  typePill:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  typePillText:   { fontSize: 11, fontWeight: '700' },
  pairedBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  pairedBadgeText:{ fontSize: 10, fontWeight: '700' },
  dateText:       { fontSize: 11 },
  levelRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  levelText:      { fontSize: 13, fontWeight: '700' },
  avgText:        { flex: 1, fontSize: 13 },

  chartContainer: { padding: SPACING.md, gap: 14, borderTopWidth: 1 },
  chartLegend:    { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLabel:    { fontSize: 12, fontWeight: '700' },

  freqTableWrap:  { borderRadius: RADIUS.md, padding: 12, gap: 8 },
  freqTableTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  freqTable:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  freqRow:        { width: '30%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  freqLabel:      { fontSize: 12, fontWeight: '600' },
  freqValue:      { fontSize: 12, fontWeight: '700' },

  abgBox:         { borderRadius: RADIUS.md, borderWidth: 1, padding: 12, gap: 8 },
  abgTitle:       { fontSize: 12, fontWeight: '800' },
  abgRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  abgItem:        { alignItems: 'center', minWidth: 44 },
  abgFreq:        { fontSize: 10 },
  abgVal:         { fontSize: 13, fontWeight: '800' },
  abgHint:        { fontSize: 10, fontStyle: 'italic' },

  deleteBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: RADIUS.md, borderWidth: 1 },
  deleteBtnText:  { fontSize: 13, fontWeight: '600' },
});
