// ===================================================
// AUDIOGRAM ANALYZER - Design System / Theme
// Supports Dark and Light modes with smooth transitions
// ===================================================

// ── Dark Theme ────────────────────────────────────
const dark = {
  bg: '#0A0E1A',
  bgCard: '#111827',
  bgElevated: '#1A2035',
  bgInput: '#1E293B',
  bgGlass: 'rgba(17, 24, 39, 0.85)',
  primary: '#00E5CC',
  primaryDim: 'rgba(0,229,204,0.12)',
  primaryGlow: 'rgba(0,229,204,0.35)',
  secondary: '#8B7FFF',
  secondaryDim: 'rgba(139,127,255,0.12)',
  accent: '#FFB347',
  accentDim: 'rgba(255,179,71,0.12)',
  leftEar: '#00E5CC',
  rightEar: '#FF6B9D',
  leftEarDim: 'rgba(0,229,204,0.15)',
  rightEarDim: 'rgba(255,107,157,0.15)',
  normal: 'rgba(0,229,204,0.06)',
  mild: 'rgba(255,214,0,0.06)',
  moderate: 'rgba(255,179,71,0.06)',
  severe: 'rgba(255,107,71,0.06)',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  textDim: '#334155',
  success: '#00D68F',
  warning: '#FFB347',
  danger: '#FF6B6B',
  border: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(0,229,204,0.35)',
  shadowColor: '#000000',
  shadowOpacity: 0.4,
  glassBorder: 'rgba(255,255,255,0.08)',
  glassHighlight: 'rgba(255,255,255,0.03)',
  statusBar: 'dark-content',
  keyboardAppearance: 'dark',
};

// ── Light Theme ───────────────────────────────────
const light = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgElevated: '#F1F5F9',
  bgInput: '#F1F5F9',
  bgGlass: 'rgba(255, 255, 255, 0.85)',
  primary: '#0D9488',
  primaryDim: 'rgba(13,148,136,0.08)',
  primaryGlow: 'rgba(13,148,136,0.25)',
  secondary: '#7C3AED',
  secondaryDim: 'rgba(124,58,237,0.08)',
  accent: '#D97706',
  accentDim: 'rgba(217,119,6,0.08)',
  leftEar: '#0D9488',
  rightEar: '#E11D48',
  leftEarDim: 'rgba(13,148,136,0.1)',
  rightEarDim: 'rgba(225,29,72,0.1)',
  normal: 'rgba(13,148,136,0.06)',
  mild: 'rgba(202,138,4,0.06)',
  moderate: 'rgba(217,119,6,0.06)',
  severe: 'rgba(225,29,72,0.06)',
  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textDim: '#CBD5E1',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  border: 'rgba(0,0,0,0.06)',
  borderActive: 'rgba(13,148,136,0.35)',
  shadowColor: '#000000',
  shadowOpacity: 0.08,
  glassBorder: 'rgba(0,0,0,0.05)',
  glassHighlight: 'rgba(255,255,255,0.6)',
  statusBar: 'dark-content',
  keyboardAppearance: 'light',
};

export const themes = { dark, light };
export const COLORS = dark;

export const FONTS = {
  display: 'System',
  body: 'System',
  mono: 'System',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000];
export const FREQ_LABELS = ['250', '500', '1k', '2k', '4k', '8k'];
export const DB_LEVELS = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

export const HEARING_ZONES = [
  { label: 'Normal',            range: [-10, 25],  color: '#00D68F' },
  { label: 'Mild',              range: [25,  40],  color: '#FFD600' },
  { label: 'Moderate',          range: [40,  55],  color: '#FFB347' },
  { label: 'Moderately Severe', range: [55,  70],  color: '#FF8C42' },
  { label: 'Severe',            range: [70,  90],  color: '#FF6B6B' },
  { label: 'Profound',          range: [90, 120],  color: '#CC3333' },
];

export const getHearingLevel = (avgThreshold) => {
  for (const zone of HEARING_ZONES) {
    if (avgThreshold >= zone.range[0] && avgThreshold < zone.range[1]) return zone;
  }
  return HEARING_ZONES[HEARING_ZONES.length - 1];
};

export const ANIM = {
  FAST:   250,
  NORMAL: 400,
  SLOW:   600,
  SPRING: { tension: 80,  friction: 12 },
  BOUNCE: { tension: 120, friction: 8  },
  GENTLE: { tension: 50,  friction: 15 },
};
