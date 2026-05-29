// ===================================================
// ABOUT SCREEN - Project info, methodology, team
// ===================================================
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import AppNavBar from '../components/AppNavBar';

export default function AboutScreen({ navigation }) {
  const { colors } = useTheme();

  const phases = [
    { icon: 'musical-notes-outline', title: 'Phase 1: Audio Infrastructure', desc: 'Pure tone generation at 250–8000 Hz with volume control.' },
    { icon: 'construct-outline',     title: 'Phase 2: Calibration',           desc: 'Internal calibration table mapping digital signal to dB HL.' },
    { icon: 'git-branch-outline',    title: 'Phase 3: Testing Algorithm',     desc: 'Hughson-Westlake ascending method for threshold finding.' },
    { icon: 'phone-portrait-outline',title: 'Phase 4: User Interface',        desc: 'Test screen with heard/not-heard buttons and audiogram display.' },
    { icon: 'checkmark-done-outline',title: 'Phase 5: Testing & Evaluation',  desc: 'Validation against OHHR clinical dataset (581 participants).' },
  ];

  const team = [
    { name: 'Marya Ibrahim',        id: '', role: 'Developer' },
    { name: 'Leen Roumani',         id: '', role: 'Developer' },
    { name: 'Dr. Mouhib Alnoukari', id: '',        role: 'Supervisor' },
    { name: 'Eng. Anas Abdulaziz',  id: '',        role: 'Supervisor' },
  ];

  const features = [
    { id: 'RE-FR-01', title: 'Pure Tone Playback',  desc: '250–8000 Hz frequencies' },
    { id: 'RE-FR-02', title: 'Intensity Control',   desc: '-10 to 120 dB range' },
    { id: 'RE-FR-03', title: 'Sound Calibration',   desc: 'Internal calibration table' },
    { id: 'RE-FR-04', title: 'H-W Algorithm',       desc: 'Medical threshold detection' },
    { id: 'RE-FR-07', title: 'Left Ear Test',       desc: 'Isolated left channel' },
    { id: 'RE-FR-08', title: 'Right Ear Test',      desc: 'Isolated right channel' },
    { id: 'RE-FR-09', title: 'Audiogram Drawing',   desc: 'SVG graph with zones' },
    { id: 'RE-FR-10', title: 'Local Storage',       desc: 'SQLite offline storage' },
    { id: 'RE-FR-11', title: 'History View',        desc: 'All past test results' },
    { id: 'RE-FR-12', title: 'Offline Mode',        desc: 'No internet required' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <AppNavBar navigation={navigation} title="How It Works" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <LinearGradient
          colors={[colors.primary + '20', colors.secondary + '12', colors.bg]}
          style={[styles.banner, { borderColor: colors.border }]}
        >
          <Ionicons name="ear" size={40} color={colors.primary} />
          <Text style={[styles.bannerTitle, { color: colors.text }]}>Audiogram Analyzer</Text>
          <Text style={[styles.bannerSub, { color: colors.textMuted }]}>
            Junior Project — Faculty of Informatics{'\n'}Department of Software Engineering
          </Text>
        </LinearGradient>

        {/* WHO stat */}
        <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>1.5B+</Text>
          <Text style={[styles.statDesc, { color: colors.textMuted }]}>
            People worldwide live with hearing loss according to WHO. Early detection is key — this app provides a free, accessible initial screening.
          </Text>
        </View>

        {/* How it works */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>How It Works</Text>
        <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
          The app plays pure tones at specific frequencies (250–8000 Hz) and uses the{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Hughson-Westlake ascending method</Text>
          {' '}to determine your hearing threshold — the lowest sound level you can detect at each frequency.
          Results are displayed as an audiogram graph, mirroring clinical standards.
        </Text>

        {/* Project phases */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Development Phases</Text>
        {phases.map((p, i) => (
          <View key={i} style={[styles.phaseCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.phaseIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name={p.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.phaseText}>
              <Text style={[styles.phaseTitle, { color: colors.text }]}>{p.title}</Text>
              <Text style={[styles.phaseDesc, { color: colors.textMuted }]}>{p.desc}</Text>
            </View>
          </View>
        ))}

        {/* Dataset */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Reference Dataset</Text>
        <View style={[styles.datasetCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.datasetRow}>
            <Ionicons name="school-outline" size={18} color={colors.secondary} />
            <Text style={[styles.datasetLabel, { color: colors.text }]}>Oldenburg Hearing Health Repository (OHHR)</Text>
          </View>
          {[
            ['Source', 'University of Oldenburg, Germany'],
            ['Participants', '581 patients'],
            ['Age range', '18–86 years'],
            ['Period', '2013–2015'],
          ].map(([k, v]) => (
            <View key={k} style={styles.dataRow}>
              <Text style={[styles.dataKey, { color: colors.textMuted }]}>{k}</Text>
              <Text style={[styles.dataVal, { color: colors.text }]}>{v}</Text>
            </View>
          ))}
          <TouchableOpacity onPress={() => Linking.openURL('https://zenodo.org/records/14177903')} style={styles.dataLink}>
            <Ionicons name="link-outline" size={14} color={colors.secondary} />
            <Text style={[styles.dataLinkText, { color: colors.secondary }]}>zenodo.org/records/14177903</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Implemented Features</Text>
        <View style={styles.featGrid}>
          {features.map((f) => (
            <View key={f.id} style={[styles.featCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.featId, { color: colors.primary }]}>{f.id}</Text>
              <Text style={[styles.featTitle, { color: colors.text }]}>{f.title}</Text>
              <Text style={[styles.featDesc, { color: colors.textMuted }]}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* Methodology */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Development Methodology</Text>
        <View style={[styles.methodCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.methodBadge, { backgroundColor: colors.secondaryDim }]}>
            <Ionicons name="refresh-outline" size={24} color={colors.secondary} />
            <Text style={[styles.methodBadgeText, { color: colors.secondary }]}>Agile</Text>
          </View>
          <Text style={[styles.methodText, { color: colors.textMuted }]}>
            We adopted <Text style={{ fontWeight: '700', color: colors.text }}>Agile methodology</Text> with sprint-based development, allowing continuous delivery of testable components, flexibility to adapt to technical challenges, and smooth collaboration within the team.
          </Text>
        </View>

        {/* Team */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Team</Text>
        {team.map((m, i) => (
          <View key={i} style={[styles.teamRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.teamAvatar, { backgroundColor: i < 2 ? colors.primaryDim : colors.secondaryDim }]}>
              <Text style={{ color: i < 2 ? colors.primary : colors.secondary, fontWeight: '800' }}>
                {m.name.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={[styles.teamName, { color: colors.text }]}>{m.name}</Text>
              <Text style={[styles.teamRole, { color: colors.textMuted }]}>
                {m.role}{m.id ? ` · ${m.id}` : ''}
              </Text>
            </View>
          </View>
        ))}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
          <Ionicons name="warning-outline" size={18} color={colors.warning} />
          <Text style={[styles.disclaimerText, { color: colors.warning }]}>
            This application is for educational and awareness purposes only. It is not a substitute for professional clinical audiometry. Always consult a licensed audiologist for medical diagnosis.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  scroll:       { padding: SPACING.lg, paddingBottom: 48, gap: 20 },

  banner:       { alignItems: 'center', padding: 28, borderRadius: RADIUS.xl, gap: 8, borderWidth: 1 },
  bannerTitle:  { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  bannerSub:    { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  statCard:     { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: RADIUS.lg, padding: 18, borderWidth: 1 },
  statNum:      { fontSize: 32, fontWeight: '900', minWidth: 72 },
  statDesc:     { flex: 1, fontSize: 13, lineHeight: 20 },

  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: -8 },
  sectionBody:  { fontSize: 14, lineHeight: 22 },

  phaseCard:    { flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderRadius: RADIUS.md, padding: 14, borderWidth: 1 },
  phaseIcon:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  phaseText:    { flex: 1 },
  phaseTitle:   { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  phaseDesc:    { fontSize: 13, lineHeight: 18 },

  datasetCard:  { borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, gap: 10 },
  datasetRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datasetLabel: { fontSize: 14, fontWeight: '700', flex: 1 },
  dataRow:      { flexDirection: 'row', justifyContent: 'space-between' },
  dataKey:      { fontSize: 13 },
  dataVal:      { fontSize: 13, fontWeight: '600' },
  dataLink:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dataLinkText: { fontSize: 13, textDecorationLine: 'underline' },

  featGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featCard:     { width: '47%', borderRadius: RADIUS.md, padding: 12, borderWidth: 1, gap: 4 },
  featId:       { fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
  featTitle:    { fontSize: 13, fontWeight: '700' },
  featDesc:     { fontSize: 12 },

  methodCard:   { borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, gap: 12 },
  methodBadge:  { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', padding: 8, borderRadius: RADIUS.md },
  methodBadgeText: { fontSize: 14, fontWeight: '800' },
  methodText:   { fontSize: 14, lineHeight: 22 },

  teamRow:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: RADIUS.md, padding: 14, borderWidth: 1 },
  teamAvatar:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  teamName:     { fontSize: 15, fontWeight: '700' },
  teamRole:     { fontSize: 12, marginTop: 2 },

  disclaimer:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: RADIUS.md, padding: 14, borderWidth: 1 },
  disclaimerText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
