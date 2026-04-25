// ============================================================
// APP NAVBAR — Sticky top navigation bar
// ============================================================
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import { SPACING, RADIUS } from '../constants/theme';
import { useToast } from './Toast';
import { useLang } from '../context/LanguageContext';

export default function AppNavBar({
  navigation,
  title,
  showBack    = true,
  disableBack = false,
  isTestActive = false,   // disables logout during test
}) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuthContext();
  const { showToast } = useToast();
  const { lang, toggleLang } = useLang();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userName = user?.name || null;

  const handleLogout = () => {
    setShowUserMenu(false);
    if (isTestActive) {
      showToast('Please finish or quit the current test before logging out.', 'warning');
      return;
    }
    logout();
  };

  return (
    <View style={[styles.container, {
      backgroundColor: colors.bgCard,
      borderBottomColor: colors.border,
      shadowColor: colors.shadowColor ?? '#000',
    }]}>

      {/* Left: back + logo + title */}
      <View style={styles.left}>
        {showBack && navigation && (
          <TouchableOpacity
            onPress={() => !disableBack && navigation.goBack()}
            style={[styles.backBtn, disableBack && { opacity: 0.3 }]}
            disabled={disableBack}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Logo */}
        <View style={[styles.logoWrap, { backgroundColor: colors.primaryDim, borderColor: colors.primary + '40' }]}>
          <Ionicons name="ear" size={18} color={colors.primary} />
        </View>

        {/* App name + page title */}
        <View style={styles.titleWrap}>
          <View style={styles.appNameRow}>
            <Text style={[styles.appName, { color: colors.primary }]}>AG</Text>
            <Text style={[styles.appName, { color: colors.text }]}> Analyzer</Text>
          </View>
          {title && (
            <Text style={[styles.pageTitle, { color: colors.textMuted }]} numberOfLines={1}>{title}</Text>
          )}
        </View>
      </View>

      {/* Right: theme toggle + lang + user */}
      <View style={styles.right}>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
        >
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={17} color={isDark ? colors.primary : colors.accent} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleLang}
          style={[styles.langBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
        >
          <Text style={[styles.langText, { color: colors.primary }]}>
            {lang === 'en' ? 'ع' : 'EN'}
          </Text>
        </TouchableOpacity>

        {userName && (
          <TouchableOpacity
            onPress={() => setShowUserMenu(v => !v)}
            style={[styles.userBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + '35' }]}
          >
            <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
            <Text style={[styles.userName, { color: colors.primary }]} numberOfLines={1}>{userName}</Text>
            <Ionicons name={showUserMenu ? 'chevron-up' : 'chevron-down'} size={12} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* User dropdown */}
      {showUserMenu && (
        <View style={[styles.dropdown, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadowColor ?? '#000' }]}>
          {/* User info */}
          <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryDim }]}>
              <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                {userName?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.dropdownName, { color: colors.text }]}>{userName}</Text>
              <Text style={[styles.dropdownEmail, { color: colors.textMuted }]}>{user?.email || user?.phone || ''}</Text>
            </View>
          </View>

          {/* Logout button */}
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.dropdownItem, { borderTopColor: colors.border }]}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.danger} />
            <Text style={[styles.dropdownItemText, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Backdrop to close dropdown */}
      {showUserMenu && (
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => setShowUserMenu(false)}
          activeOpacity={1}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'web' ? 14 : 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
    position: Platform.OS === 'web' ? 'sticky' : 'relative',
    top: 0,
    zIndex: 100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  left:         { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  backBtn:      { padding: 4 },
  logoWrap:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, flexShrink: 0 },
  titleWrap:    { gap: 1, flexShrink: 1, minWidth: 0 },
  appNameRow:   { flexDirection: 'row', alignItems: 'baseline' },
  appName:      { fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  pageTitle:    { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  right:        { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  themeBtn:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  langBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  langText:     { fontSize: 12, fontWeight: '800' },
  userBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, maxWidth: 120 },
  userName:     { fontSize: 11, fontWeight: '700', flexShrink: 1 },

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: SPACING.lg,
    minWidth: 220,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    zIndex: 200,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1 },
  avatarCircle:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter:   { fontSize: 18, fontWeight: '800' },
  dropdownName:   { fontSize: 14, fontWeight: '700' },
  dropdownEmail:  { fontSize: 12, marginTop: 1 },
  dropdownItem:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  dropdownItemText: { fontSize: 14, fontWeight: '600' },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 150 },
});
