// ============================================================
// APP NAVBAR — Sticky top navigation bar
// ============================================================
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import { SPACING, RADIUS } from '../constants/theme';
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
  const { lang, toggleLang, t } = useLang();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 90, right: SPACING.lg });
  const badgeRef = useRef(null);

  // The backend sends first_name / last_name / username (there is no "name" field)
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  const userName = user ? (fullName || user.name || user.username || null) : null;

  // Phone sign-ups are stored as "<phone>@placeholder.local" — show the phone instead
  const rawEmail = user?.email || '';
  const isPlaceholder = rawEmail.endsWith('@placeholder.local');
  const contactIsPhone = isPlaceholder || (!rawEmail && !!(user?.phone_number || user?.phone));
  const contactValue = isPlaceholder
    ? (user?.username || rawEmail.replace('@placeholder.local', ''))
    : (rawEmail || user?.phone_number || user?.phone || '');
  const roleLabel = user?.role === 'audiologist' ? t.audiologist : t.patient;

  const openMenu = () => {
    // Measure the button so the menu opens right under it
    if (badgeRef.current?.measureInWindow) {
      badgeRef.current.measureInWindow((x, y, w, h) => {
        setMenuPos({ top: y + h + 6, right: SPACING.lg });
        setShowUserMenu(true);
      });
    } else {
      setShowUserMenu(true);
    }
  };

  const handleLogout = () => {
    // Block logout during an active test
    // (the menu already shows why: a lock icon and a hint under "Sign Out")
    if (isTestActive) return;
    setShowUserMenu(false);
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
            ref={badgeRef}
            collapsable={false}
            onPress={() => (showUserMenu ? setShowUserMenu(false) : openMenu())}
            style={[styles.userBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + '35' }]}
          >
            <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
            <Text style={[styles.userName, { color: colors.primary }]} numberOfLines={1}>{userName}</Text>
            <Ionicons name={showUserMenu ? 'chevron-up' : 'chevron-down'} size={12} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* User menu — in a Modal so it can be tapped on Android
          (touches outside a parent view's bounds are ignored there) */}
      <Modal
        visible={showUserMenu}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowUserMenu(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowUserMenu(false)}>
          <Pressable
            onPress={() => {}}
            style={[styles.dropdown, {
              top: menuPos.top,
              right: menuPos.right,
              backgroundColor: colors.bgCard,
              borderColor: colors.border,
              shadowColor: colors.shadowColor ?? '#000',
            }]}
          >
            {/* Name + avatar */}
            <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primaryDim }]}>
                <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                  {userName?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.dropdownName, { color: colors.text }]} numberOfLines={2}>{userName}</Text>
                <Text style={[styles.dropdownEmail, { color: colors.textMuted }]}>{t.signedIn}</Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.detailsBox}>
              {!!contactValue && (
                <View style={styles.detailRow}>
                  <Ionicons name={contactIsPhone ? 'call-outline' : 'mail-outline'} size={15} color={colors.textMuted} />
                  <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>{contactValue}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Ionicons name="shield-checkmark-outline" size={15} color={colors.textMuted} />
                <Text style={[styles.detailText, { color: colors.text }]}>{t.accountType}: {roleLabel}</Text>
              </View>
            </View>

            {/* Sign out — disabled while a test is running */}
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={isTestActive ? 1 : 0.7}
              style={[styles.dropdownItem, { borderTopColor: colors.border, opacity: isTestActive ? 0.5 : 1 }]}
            >
              <Ionicons
                name={isTestActive ? 'lock-closed-outline' : 'log-out-outline'}
                size={16}
                color={isTestActive ? colors.textMuted : colors.danger}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.dropdownItemText, { color: isTestActive ? colors.textMuted : colors.danger }]}>
                  {t.signOut}
                </Text>
                {isTestActive && (
                  <Text style={[styles.lockedHint, { color: colors.textMuted }]}>{t.logoutBlocked}</Text>
                )}
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  userBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, maxWidth: 140 },
  userName:     { fontSize: 11, fontWeight: '700', flexShrink: 1 },

  // Dropdown (inside Modal)
  backdrop: { flex: 1 },
  dropdown: {
    position: 'absolute',
    minWidth: 240,
    maxWidth: 300,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
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
  detailsBox:     { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  detailRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText:     { fontSize: 13, flexShrink: 1 },
  dropdownItem:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: 1 },
  dropdownItemText: { fontSize: 14, fontWeight: '600' },
  lockedHint:     { fontSize: 11, marginTop: 2 },
});
