import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useGoogleAuth, useAppleAuth, usePhoneAuth } from '../../hooks/useSocialAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { dispatchAfterAuth, isAuthScreen } from '../../lib/utils/authNavigation';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { extractErrorMessage } from '../../lib/utils/errorHandling';
import { validators, FormErrors } from '../../lib/validation';
import { eventBus } from '../../lib/eventBus';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import { EditorialCanvas, EditorialPillCTA, WatermarkNumeral, editorial } from '../../components/ui/editorial';

const REMEMBER_ME_KEY = 'eventez_remember_me';

type AuthTab = 'email' | 'phone';
type PhoneStep = 'phone' | 'otp';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type LoginRouteProp = RouteProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LoginRouteProp>();
  const { eventTitle, returnScreen, returnParams, eventIsFree } = route.params || {};
  const { login, isLoading, setUser, guestRegister, user } = useAuth();
  const { showError, showSuccess } = useAlert();
  const { colors, isDark } = useTheme();
  const { flags: featureFlags } = useFeatureFlags();
  const phoneOtpAvailable = featureFlags.phone_otp_enabled;
  // Si returnScreen est un ecran auth (login/register/verify/forgot), on l'ignore
  // pour ne pas y rediriger apres connexion reussie.
  const safeReturnScreen = returnScreen && !isAuthScreen(returnScreen) ? returnScreen : null;

  const emailInputRef = useRef<TextInput>(null);

  // Email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Décoché par défaut — opt-in conscient pour la persistance de session
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors<'email' | 'password'>>({});
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [retryInfo, setRetryInfo] = useState<{ attempt: number; maxRetries: number } | null>(null);

  // Tab & phone form. Si l'OTP est desactive cote admin, on force email.
  const [activeTab, setActiveTab] = useState<AuthTab>('email');

  useEffect(() => {
    if (!phoneOtpAvailable && activeTab === 'phone') setActiveTab('email');
  }, [phoneOtpAvailable, activeTab]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [otpPhone, setOtpPhone] = useState(''); // normalized phone after send
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<TextInput>(null);

  // Guest checkout (only when eventIsFree=true)
  const [guestModal, setGuestModal] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    const loadRememberMe = async () => {
      try {
        const saved = await SecureStore.getItemAsync(REMEMBER_ME_KEY);
        if (saved !== null) {
          setRememberMe(saved === 'true');
        }
      } catch (error) {
        if (__DEV__) console.warn('Erreur lors du chargement de la préférence:', error);
      }
    };
    loadRememberMe();
    // Auto-focus du champ email à l'arrivée sur l'onglet email
    const focusTimer = setTimeout(() => emailInputRef.current?.focus(), 250);
    return () => clearTimeout(focusTimer);
  }, []);

  const handleGuestCheckout = useCallback(async () => {
    const email = guestEmail.trim().toLowerCase();
    const firstName = guestFirstName.trim();
    if (!email.includes('@') || !email.includes('.')) {
      showError('Email invalide', 'Entre une adresse email valide');
      return;
    }
    if (firstName.length < 2) {
      showError('Prénom requis', 'Entre au moins 2 caractères pour ton prénom');
      return;
    }
    setGuestLoading(true);
    try {
      const guestUser = await guestRegister({ email, first_name: firstName });
      setGuestModal(false);
      // Guest accounts skipent toujours la verif — direct au returnScreen ou Main
      dispatchAfterAuth(navigation, guestUser as any, safeReturnScreen, returnParams);
    } catch (error: any) {
      // 409 = email déjà rattaché à un compte complet → on bascule vers login
      if (error?.response?.status === 409) {
        setGuestModal(false);
        setEmail(email);
        showError(
          'Compte existant',
          'Un compte existe déjà avec cet email. Connecte-toi avec ton mot de passe.',
        );
      } else {
        const msg = extractErrorMessage(error);
        showError('Erreur', msg);
      }
    } finally {
      setGuestLoading(false);
    }
  }, [guestEmail, guestFirstName, guestRegister, navigation, safeReturnScreen, returnParams, showError]);

  // Redirection après auth réussie. Logique centralisée dans dispatchAfterAuth :
  // - compte non verifie → VerifyEmail (avec skip)
  // - sinon, returnScreen non-auth → reset stack + nav
  // - sinon → reset stack vers Main
  const dismissAfterLogin = useCallback((freshUser?: any) => {
    dispatchAfterAuth(navigation, freshUser ?? user, safeReturnScreen, returnParams);
  }, [navigation, safeReturnScreen, returnParams, user]);

  // Écouter les événements de retry API pendant le login
  useEffect(() => {
    const unsubscribe = eventBus.on('api-retry', (data: { attempt: number; maxRetries: number; endpoint: string }) => {
      if (isLoading) {
        setRetryInfo({ attempt: data.attempt, maxRetries: data.maxRetries });
      }
    });
    return unsubscribe;
  }, [isLoading]);

  const {
    signIn: googleSignIn,
    isLoading: googleLoading,
    isReady: googleReady,
  } = useGoogleAuth();

  const {
    signIn: appleSignIn,
    isLoading: appleLoading,
    isAvailable: appleAvailable,
  } = useAppleAuth();

  const {
    sendOTP,
    verifyOTP,
    isLoading: phoneLoading,
  } = usePhoneAuth();

  // Resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleGoogleSignIn = async () => {
    const result = await googleSignIn();
    if (result.success && result.user) {
      await setUser(result.user);
      dismissAfterLogin(result.user);
    } else if (result.error && result.error !== 'Connexion annulée') {
      showError('Erreur Google', result.error);
    }
  };

  const handleAppleSignIn = async () => {
    const result = await appleSignIn();
    if (result.success && result.user) {
      await setUser(result.user);
      dismissAfterLogin(result.user);
    } else if (result.error && result.error !== 'Connexion annulée') {
      showError('Erreur Apple', result.error);
    }
  };

  const handleSendOTP = async () => {
    const raw = phoneNumber.trim();
    if (!raw) { showError('Numéro manquant', 'Entrez votre numéro de téléphone'); return; }
    const formatted = raw.startsWith('+') ? raw : `+${raw}`;
    const result = await sendOTP(formatted);
    if (result.success) {
      setOtpPhone(result.normalizedPhone || formatted);
      setPhoneStep('otp');
      setOtpCode('');
      setResendCooldown(60);
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } else {
      showError('Erreur SMS', result.error || 'Impossible d\'envoyer le SMS');
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.replace(/\D/g, '').length < 6) {
      showError('Code incomplet', 'Entrez le code à 6 chiffres');
      return;
    }
    const result = await verifyOTP(otpPhone, otpCode);
    if (result.success && result.user) {
      await setUser(result.user);
      dismissAfterLogin(result.user);
    } else {
      showError('Code invalide', result.error || 'Code incorrect ou expiré');
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    const result = await sendOTP(otpPhone);
    if (result.success) {
      setOtpCode('');
      setResendCooldown(60);
      showSuccess('Code renvoyé', 'Un nouveau code a été envoyé');
    } else {
      showError('Erreur', result.error || 'Impossible de renvoyer le code');
    }
  };

  const validate = () => {
    const newErrors: FormErrors<'email' | 'password'> = {};
    const emailError = validators.email(email);
    if (emailError) newErrors.email = emailError;
    const passwordError = validators.password(password, 6);
    if (passwordError) newErrors.password = passwordError;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setRetryInfo(null);
    setLoginInProgress(true);
    try {
      await SecureStore.setItemAsync(REMEMBER_ME_KEY, rememberMe.toString());

      // Les comptes non vérifiés peuvent se connecter — les restrictions sont
      // appliquées côté backend (IsEmailVerified) avec un bandeau UI.
      const loggedInUser = await login(email.trim().toLowerCase(), password, rememberMe);
      setRetryInfo(null);
      dismissAfterLogin(loggedInUser);
    } catch (error: any) {
      setRetryInfo(null);
      const message = extractErrorMessage(error);
      showError('Erreur de connexion', message);
    } finally {
      setLoginInProgress(false);
    }
  };

  const getInputStyle = (field: string, hasError: boolean) => {
    if (hasError) return [styles.inputError, { backgroundColor: colors.errorLight }];
    if (focusedField === field) return [styles.inputFocused, { backgroundColor: colors.surface, borderColor: colors.primary }];
    return null;
  };

  return (
    <EditorialCanvas>
      {/* Watermark letter behind form — editorial backdrop */}
      <WatermarkNumeral>E</WatermarkNumeral>

      <KeyboardAwareScrollView
        style={styles.keyboardView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // bottomOffset = espace gardé sous l'input focusé (au-dessus du clavier).
        // 100 = hauteur du pill CTA "Se connecter" + un peu de marge pour rester visible.
        // Sans ça, le bouton restait caché derrière le clavier (parité EventCreateScreen).
        bottomOffset={100}
      >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>Connexion / 01</Text>
            <Text style={[styles.title, { color: colors.gray900 }]}>Bon retour !</Text>
            <Text style={[styles.subtitle, { color: colors.gray500 }]}>
              {eventTitle
                ? `Encore une étape avant ton billet pour « ${eventTitle} »`
                : returnScreen
                ? 'Connecte-toi pour continuer'
                : 'Connecte-toi pour découvrir les meilleurs événements'}
            </Text>
          </View>

          {/* Context banner — visible quand on vient d'une action protégée */}
          {(eventTitle || returnScreen) && (
            <View style={[styles.contextBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
              <View style={[styles.contextBannerIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="lock-closed" size={14} color="#fff" />
              </View>
              <Text style={[styles.contextBannerText, { color: colors.gray700 }]} numberOfLines={2}>
                {eventTitle
                  ? `🎫 Connecte-toi pour réserver « ${eventTitle} »`
                  : 'Connecte-toi pour finaliser ton action'}
              </Text>
            </View>
          )}

          {/* Tabs — phone tab masque si l'admin a desactive l'OTP SMS */}
          {phoneOtpAvailable ? (
            <View style={styles.tabsRow}>
              <TouchableOpacity
                onPress={() => { setActiveTab('email'); setPhoneStep('phone'); setOtpCode(''); }}
                style={[styles.tabBtn, activeTab === 'email' && { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'email' }}
              >
                <Ionicons name="mail-outline" size={14} color={activeTab === 'email' ? '#fff' : colors.gray500} />
                <Text style={[styles.tabBtnText, { color: activeTab === 'email' ? '#fff' : colors.gray500 }]}>Email</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('phone')}
                style={[styles.tabBtn, activeTab === 'phone' && { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'phone' }}
              >
                <Ionicons name="phone-portrait-outline" size={14} color={activeTab === 'phone' ? '#fff' : colors.gray500} />
                <Text style={[styles.tabBtnText, { color: activeTab === 'phone' ? '#fff' : colors.gray500 }]}>Téléphone</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* ── Phone tab content ── */}
            {activeTab === 'phone' && phoneStep === 'phone' && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.gray700 }]}>Numéro de téléphone</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }, focusedField === 'phone' && { backgroundColor: colors.surface, borderColor: colors.primary, ...Shadows.sm }]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="phone-portrait-outline" size={20} color={focusedField === 'phone' ? colors.primary : colors.gray400} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: colors.gray900 }]}
                    placeholder="+237 6 12 34 56 78"
                    placeholderTextColor={colors.gray400}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    accessibilityLabel="Numéro de téléphone avec indicatif pays"
                  />
                </View>
                <Text style={[styles.fieldHint, { color: colors.gray400 }]}>
                  Inclure l'indicatif pays : +33, +237, +1…
                </Text>
                <AnimatedPressable
                  style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: Spacing.sm }]}
                  onPress={handleSendOTP}
                  disabled={phoneLoading}
                  animationType="scale"
                  haptic="medium"
                  accessibilityRole="button"
                  accessibilityLabel="Recevoir le code SMS"
                >
                  {phoneLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.primaryButtonText}>Recevoir le code SMS</Text>}
                </AnimatedPressable>

              </View>
            )}

            {activeTab === 'phone' && phoneStep === 'otp' && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.gray700, textAlign: 'center' }]}>
                  Code envoyé au {otpPhone}
                </Text>
                <TextInput
                  ref={otpInputRef}
                  style={[styles.otpInput, { color: colors.gray900, borderColor: colors.gray200, backgroundColor: colors.gray50 }]}
                  placeholder="123456"
                  placeholderTextColor={colors.gray400}
                  value={otpCode}
                  onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  accessibilityLabel="Code OTP à 6 chiffres"
                />
                <AnimatedPressable
                  style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: Spacing.sm }, (otpCode.length < 6 || phoneLoading) && { opacity: 0.6 }]}
                  onPress={handleVerifyOTP}
                  disabled={otpCode.length < 6 || phoneLoading}
                  animationType="scale"
                  haptic="medium"
                  accessibilityRole="button"
                  accessibilityLabel="Vérifier le code"
                >
                  {phoneLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.primaryButtonText}>Vérifier le code</Text>}
                </AnimatedPressable>
                <View style={styles.otpActions}>
                  <TouchableOpacity onPress={() => { setPhoneStep('phone'); setOtpCode(''); }}>
                    <Text style={[styles.otpLink, { color: colors.gray500 }]}>← Changer de numéro</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleResendOTP} disabled={resendCooldown > 0}>
                    <Text style={[styles.otpLink, { color: resendCooldown > 0 ? colors.gray400 : colors.primary }]}>
                      {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer le code'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Email tab content ── */}
            {activeTab === 'email' && <>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.gray700 }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }, getInputStyle('email', !!errors.email)]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={focusedField === 'email' ? colors.primary : colors.gray400}
                  />
                </View>
                <TextInput
                  ref={emailInputRef}
                  style={[styles.input, { color: colors.gray900 }]}
                  placeholder="votre@email.com"
                  placeholderTextColor={colors.gray400}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  accessibilityLabel="Adresse email"
                />
              </View>
              {errors.email && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: colors.gray700 }]}>Mot de passe</Text>
                <AnimatedPressable
                  onPress={() => navigation.navigate('ForgotPassword')}
                  animationType="scale"
                  scaleValue={0.95}
                  accessibilityRole="link"
                  accessibilityLabel="Mot de passe oublie"
                >
                  <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Oublié ?</Text>
                </AnimatedPressable>
              </View>
              <View style={[styles.inputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }, getInputStyle('password', !!errors.password)]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={focusedField === 'password' ? colors.primary : colors.gray400}
                  />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.gray900 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.gray400}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  accessibilityLabel="Mot de passe"
                />
                <AnimatedPressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  animationType="scale"
                  scaleValue={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.gray400}
                  />
                </AnimatedPressable>
              </View>
              {errors.password && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={styles.errorText}>{errors.password}</Text>
                </View>
              )}
            </View>

            {/* Remember Me */}
            <AnimatedPressable
              onPress={() => setRememberMe(!rememberMe)}
              style={styles.rememberMeContainer}
              animationType="scale"
              scaleValue={0.98}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
              accessibilityLabel="Se souvenir de moi"
            >
              <View style={[styles.checkbox, { borderColor: colors.gray300, backgroundColor: isDark ? colors.gray100 : colors.white }, rememberMe && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                )}
              </View>
              <Text style={[styles.rememberMeText, { color: colors.gray600 }]}>Rester connecté pendant 30 jours</Text>
            </AnimatedPressable>

            {/* Login Button — editorial pill CTA */}
            <View style={styles.loginButtonWrap}>
              <EditorialPillCTA
                eyebrow="Entrer"
                label="Se connecter"
                onPress={handleLogin}
                loading={loginInProgress || isLoading}
                disabled={loginInProgress || isLoading}
              />
            </View>

            {/* Retry Indicator */}
            {retryInfo && (
              <View style={[styles.retryBanner, { backgroundColor: colors.warningBg }]}>
                <ActivityIndicator size="small" color={colors.warning} />
                <Text style={[styles.retryText, { color: colors.warningDark }]}>
                  Tentative de connexion {retryInfo.attempt}/{retryInfo.maxRetries}...
                </Text>
              </View>
            )}

            </>}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.gray200 }]} />
            <Text style={[styles.dividerText, { color: colors.gray400 }]}>ou continuer avec</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.gray200 }]} />
          </View>

          {/* Social Login */}
          <View style={styles.socialButtons}>
            <AnimatedPressable
              style={[
                styles.socialButton,
                { borderColor: colors.gray200, backgroundColor: colors.surface },
                (!googleReady || googleLoading) && styles.socialButtonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={!googleReady || googleLoading || isLoading || loginInProgress}
              animationType="lift"
              scaleValue={0.98}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="Connexion avec Google"
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#DB4437" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={22} color="#DB4437" />
                  <Text style={[styles.socialButtonText, { color: colors.gray700 }]}>Google</Text>
                </>
              )}
            </AnimatedPressable>

            {appleAvailable && (
              <AnimatedPressable
                style={[
                  styles.socialButton,
                  { borderColor: colors.gray200, backgroundColor: colors.surface },
                  appleLoading && styles.socialButtonDisabled,
                ]}
                onPress={handleAppleSignIn}
                disabled={appleLoading || isLoading || loginInProgress}
                animationType="lift"
                scaleValue={0.98}
                haptic="light"
                accessibilityRole="button"
                accessibilityLabel="Connexion avec Apple"
              >
                {appleLoading ? (
                  <ActivityIndicator size="small" color={Colors.gray900} />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={22} color={colors.gray900} />
                    <Text style={[styles.socialButtonText, { color: colors.gray700 }]}>Apple</Text>
                  </>
                )}
              </AnimatedPressable>
            )}
          </View>

          {/* Terms & Privacy */}
          <Text style={[styles.termsText, { color: colors.gray500 }]}>
            En te connectant, tu acceptes nos{' '}
            <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => Linking.openURL('https://eventez.online/terms')}>Conditions d'utilisation</Text> et notre{' '}
            <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => Linking.openURL('https://eventez.online/privacy')}>Politique de confidentialité</Text>
          </Text>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={[styles.registerText, { color: colors.gray500 }]}>Pas encore de compte ?</Text>
            <AnimatedPressable
              onPress={() => navigation.replace('Register', { returnScreen: safeReturnScreen, returnParams })}
              animationType="scale"
              scaleValue={0.95}
              accessibilityRole="link"
              accessibilityLabel="Creer un compte"
            >
              <Text style={[styles.registerLink, { color: colors.primary }]}> Créer un compte</Text>
            </AnimatedPressable>
          </View>

          {/* Guest checkout — toujours visible. Le copy s'adapte selon le contexte. */}
          <View style={styles.guestSection}>
            <View style={styles.guestDivider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.gray200 }]} />
              <Text style={[styles.dividerText, { color: colors.gray400 }]}>ou</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.gray200 }]} />
            </View>
            <TouchableOpacity
              style={[styles.guestButton, { borderColor: colors.gray200, backgroundColor: colors.surface }]}
              onPress={() => setGuestModal(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continuer en invité (sans créer de compte)"
            >
              <Ionicons name="flash-outline" size={16} color={colors.gray700} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.guestButtonText, { color: colors.gray900 }]}>
                  Continuer en invité
                </Text>
                <Text style={[styles.guestButtonHint, { color: colors.gray500 }]}>
                  {eventIsFree
                    ? 'Juste prénom + email · pas de mot de passe'
                    : 'Juste prénom + email · idéal pour les events gratuits'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.gray400} />
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>

      {/* === GUEST CHECKOUT MODAL === */}
      <Modal
        visible={guestModal}
        transparent
        animationType="fade"
        onRequestClose={() => setGuestModal(false)}
      >
        <Pressable style={styles.guestModalBackdrop} onPress={() => setGuestModal(false)}>
          <Pressable
            style={[styles.guestModalCard, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.guestModalEyebrow, { color: colors.accent }]}>
              SANS COMPTE
            </Text>
            <Text style={[styles.guestModalTitle, { color: colors.gray900 }]}>
              Récupère ton billet en 2 secondes
            </Text>
            <Text style={[styles.guestModalSubtitle, { color: colors.gray500 }]}>
              {eventTitle
                ? `Pour « ${eventTitle} ». Tu pourras créer ton compte plus tard.`
                : 'Tu pourras créer ton compte plus tard.'}
            </Text>

            <View style={styles.guestModalField}>
              <Text style={[styles.inputLabel, { color: colors.gray700 }]}>Prénom</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="person-outline" size={18} color={colors.gray400} />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.gray900 }]}
                  placeholder="Alice"
                  placeholderTextColor={colors.gray400}
                  value={guestFirstName}
                  onChangeText={setGuestFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  accessibilityLabel="Prénom"
                />
              </View>
            </View>

            <View style={styles.guestModalField}>
              <Text style={[styles.inputLabel, { color: colors.gray700 }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="mail-outline" size={18} color={colors.gray400} />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.gray900 }]}
                  placeholder="alice@email.com"
                  placeholderTextColor={colors.gray400}
                  value={guestEmail}
                  onChangeText={setGuestEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Email"
                />
              </View>
            </View>

            <Text style={[styles.guestModalLegal, { color: colors.gray400 }]}>
              En continuant tu acceptes nos{' '}
              <Text style={{ color: colors.primary }} onPress={() => Linking.openURL('https://eventez.online/terms')}>
                Conditions d'utilisation
              </Text>
              .
            </Text>

            <View style={styles.guestModalActions}>
              <TouchableOpacity
                style={[styles.guestModalBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => setGuestModal(false)}
                disabled={guestLoading}
                activeOpacity={0.85}
              >
                <Text style={[styles.guestModalBtnText, { color: colors.gray700 }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.guestModalBtn, { backgroundColor: colors.primary }, guestLoading && { opacity: 0.6 }]}
                onPress={handleGuestCheckout}
                disabled={guestLoading}
                activeOpacity={0.85}
              >
                {guestLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.guestModalBtnText, { color: '#fff' }]}>Continuer</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 180,
    height: 58,
  },
  headerContainer: {
    marginBottom: Spacing.xl,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: FontSizes['4xl'],
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
    letterSpacing: -1.5,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    lineHeight: FontSizes.base * 1.5,
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  inputIconContainer: {
    paddingLeft: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },
  eyeButton: {
    padding: Spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberMeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  loginButtonWrap: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  dividerText: {
    color: Colors.gray400,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  socialButtonText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing['2xl'],
  },
  registerText: {
    color: Colors.gray500,
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
  },
  registerLink: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
  },
  retryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  retryText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
  },
  termsText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: FontSizes.xs * 1.6,
    marginTop: Spacing.lg,
  },
  termsLink: {
    fontFamily: FontFamily.semiBold,
  },
  // Ghost link: switch between email ↔ phone auth
  methodSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  methodSwitchText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
  },
  // Context banner — visible when login is triggered from a protected action
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  contextBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextBannerText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    lineHeight: FontSizes.sm * 1.4,
  },
  // Tabs (email / phone)
  tabsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  tabBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  // Guest checkout (only when eventIsFree=true)
  guestSection: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  guestDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  guestButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  guestButtonHint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 2,
  },
  // Guest modal
  guestModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  guestModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  guestModalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  guestModalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
    marginBottom: Spacing.xs,
  },
  guestModalSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  guestModalField: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  guestModalLegal: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  guestModalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  guestModalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestModalBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  // Phone OTP styles
  fieldHint: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    marginTop: Spacing.xs,
  },
  primaryButton: {
    borderRadius: BorderRadius['2xl'],
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  otpInput: {
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1.5,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.bold,
    textAlign: 'center',
    letterSpacing: 8,
    marginVertical: Spacing.sm,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  otpLink: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
  },
});
