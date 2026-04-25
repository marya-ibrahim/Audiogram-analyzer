// ===================================================
// LOGIN / REGISTER SCREEN
// Enhanced with dark/light theme, glass morphism, animations
// ===================================================
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, ANIM } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useLang } from '../context/LanguageContext';

export default function LoginScreen({ navigation }) {
  const { login, register, loading } = useAuthContext();
  const { colors, isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { t } = useLang();

  const [isRegister,   setIsRegister]   = useState(false);
  const [name,         setName]         = useState('');
  const [identifier,   setIdentifier]   = useState('');
  const [password,     setPassword]     = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [error,        setError]        = useState('');
  const [focusedInput, setFocusedInput] = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoAnim  = useRef(new Animated.Value(0.6)).current;
  const identifierRef = useRef(null);
  const passwordRef   = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: ANIM.SLOW, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.spring(logoAnim,  { toValue: 1, delay: 100, tension: 40, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const identifierType = identifier.includes('@') ? 'email'
    : /^\+?[\d\s\-]{4,}$/.test(identifier) ? 'phone' : null;
  const identifierIcon = identifierType === 'email' ? 'mail-outline'
    : identifierType === 'phone' ? 'call-outline' : 'person-outline';

  const handleFocus = (field) => setFocusedInput(field);
  const handleBlur  = ()      => setFocusedInput(null);

  const inputBorder = (field) =>
    focusedInput === field ? colors.primary + '70' : colors.border;

  const handleSubmit = async () => {
    setError('');
    if (isRegister && !name.trim())        { showToast('Please enter your name.', 'warning'); return; }
    if (!identifier.trim())                { showToast('Please enter your email or phone.', 'warning'); return; }
    if (!password)                         { showToast('Please enter your password.', 'warning'); return; }
    if (isRegister && password.length < 6) { showToast('Password must be at least 6 characters.', 'warning'); return; }
    try {
      if (isRegister) {
        await register({ name: name.trim(), identifier: identifier.trim(), password });
      } else {
        await login({ identifier: identifier.trim(), password });
      }
      // Navigation handled automatically by App.js via isLoggedIn state
    } catch (err) {
      const msg = err.message ?? 'Something went wrong. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background orbs */}
      <View style={[styles.bgOrb1, { backgroundColor: colors.primary + '08' }]} />
      <View style={[styles.bgOrb2, { backgroundColor: colors.secondary + '06' }]} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Theme toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.7}
            style={[styles.themeToggle, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={18}
              color={isDark ? '#FFD600' : '#6366F1'}
            />
          </TouchableOpacity>

          {/* Logo with glow ring */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoAnim }] }]}>
            <View style={[styles.logoGlow, { backgroundColor: colors.primary + '15' }]}>
              <View style={[styles.logoRing, { borderColor: colors.primary + '30' }]} />
              <LinearGradient
                colors={[colors.bgCard, colors.bgElevated]}
                style={[styles.logoBg, { borderColor: colors.primary + '40' }]}
              >
                <Ionicons name="ear" size={40} color={colors.primary} />
              </LinearGradient>
            </View>
            <View style={styles.titleRow}>
              <Text style={[styles.appName, { color: colors.text }]}>Audiogram</Text>
              <Text style={[styles.appNameAccent, { color: colors.primary }]}>Analyzer</Text>
            </View>
          </Animated.View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {isRegister ? t.createAcc : t.welcomeBack}
            </Text>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>
              {isRegister ? t.signUpSub : t.signInSub}
            </Text>

            {isRegister && (
              <View style={[styles.inputWrap, {
                backgroundColor: colors.bgInput,
                borderColor: inputBorder('name'),
                borderWidth: focusedInput === 'name' ? 1.5 : 1,
              }]}>
                <Ionicons name="person-outline" size={18} color={focusedInput === 'name' ? colors.primary : colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t.fullName}
                  placeholderTextColor={colors.textDim}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onFocus={() => handleFocus('name')}
                  onBlur={handleBlur}
                  onSubmitEditing={() => identifierRef.current?.focus()}
                />
              </View>
            )}

            <View style={[styles.inputWrap, {
              backgroundColor: colors.bgInput,
              borderColor: inputBorder('identifier'),
              borderWidth: focusedInput === 'identifier' ? 1.5 : 1,
            }]}>
              <Ionicons name={identifierIcon} size={18} color={focusedInput === 'identifier' ? colors.primary : colors.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={identifierRef}
                style={[styles.input, { color: colors.text }]}
                placeholder={t.emailPhone}
                placeholderTextColor={colors.textDim}
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onFocus={() => handleFocus('identifier')}
                onBlur={handleBlur}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View style={[styles.inputWrap, {
              backgroundColor: colors.bgInput,
              borderColor: inputBorder('password'),
              borderWidth: focusedInput === 'password' ? 1.5 : 1,
            }]}>
              <Ionicons name="lock-closed-outline" size={18} color={focusedInput === 'password' ? colors.primary : colors.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { flex: 1, color: colors.text }]}
                placeholder={t.password}
                placeholderTextColor={colors.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                returnKeyType="done"
                onFocus={() => handleFocus('password')}
                onBlur={handleBlur}
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '30' }]}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={[colors.primary, isDark ? '#00B8A3' : colors.primary + 'CC']}
                style={styles.submitGrad}
              >
                {loading
                  ? <ActivityIndicator color={isDark ? colors.bg : '#fff'} />
                  : <Text style={[styles.submitText, { color: isDark ? colors.bg : '#fff' }]}>
                      {isRegister ? t.createAcc : t.signIn}
                    </Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setIsRegister(v => !v); setError(''); }} style={styles.toggleBtn}>
              <Text style={[styles.toggleText, { color: colors.textMuted }]}>
                {isRegister ? t.haveAccount : t.noAccount}
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {isRegister ? t.signIn : t.signUp}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, overflow: 'hidden' },
  bgOrb1:        { position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: 150 },
  bgOrb2:        { position: 'absolute', bottom: -60, left: -60, width: 250, height: 250, borderRadius: 125 },
  scroll:        { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  inner:         { alignItems: 'center' },
  themeToggle:   { position: 'absolute', top: 12, right: 0, width: 40, height: 40, borderRadius: RADIUS.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Logo
  logoWrap:      { alignItems: 'center', marginBottom: 28 },
  logoGlow:      { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoRing:      { position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 51, borderWidth: 2 },
  logoBg:        { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  titleRow:      { flexDirection: 'row', gap: 5 },
  appName:       { fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  appNameAccent: { fontSize: 26, fontWeight: '800', letterSpacing: -1 },

  // Card
  card:          { width: '100%', borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1 },
  cardTitle:     { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSub:       { fontSize: 14, marginBottom: 24 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, paddingHorizontal: 14, marginBottom: 12, height: 52 },
  inputIcon:     { marginRight: 10 },
  input:         { flex: 1, fontSize: 15, outlineStyle: 'none' },
  eyeBtn:        { padding: 4 },
  errorBox:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.sm, padding: 10, marginBottom: 12, borderWidth: 1 },
  errorText:     { fontSize: 13, flex: 1 },
  submitBtn:     { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: 4 },
  submitGrad:    { height: 52, alignItems: 'center', justifyContent: 'center' },
  submitText:    { fontSize: 16, fontWeight: '800' },
  toggleBtn:     { marginTop: 16, alignItems: 'center' },
  toggleText:    { fontSize: 14 },
});
