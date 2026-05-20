import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  AppState,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTranslation } from 'react-i18next';
import { authAPI, usersAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { dispatchAfterAuth } from '../../lib/utils/authNavigation';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import { EditorialCanvas, EditorialPillCTA, WatermarkNumeral } from '../../components/ui/editorial';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'VerifyEmail'>;
type RoutePropType = RouteProp<RootStackParamList, 'VerifyEmail'>;

const RESEND_COOLDOWN = 60;

// Activer LayoutAnimation sur Android (no-op iOS)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── 6-digit OTP input ────────────────────────────────────────────────────────
function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<Array<TextInput | null>>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleChange = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = clean;
    onChange(next.join(''));
    if (clean && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyPress = (i: number, key: string) => {
    if (key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  return (
    <View style={otpStyles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          style={[otpStyles.box, d ? otpStyles.boxFilled : undefined]}
          value={d}
          onChangeText={(v) => handleChange(i, v)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const otpStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box: {
    width: 44,
    height: 54,
    borderWidth: 2,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.bold,
    color: Colors.gray900,
  },
  boxFilled: { borderColor: '#7C3AED' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function VerifyEmailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { email, skippable, returnScreen, returnParams } = route.params || {};
  const { colors, gradients } = useTheme();
  const { showSuccess, showError } = useAlert();
  const { refreshUser } = useAuth();
  const { t } = useTranslation();

  const handleSkipForLater = useCallback(() => {
    if (returnScreen) {
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' as never },
          { name: returnScreen as never, params: returnParams as never },
        ],
      });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Main' as never }] });
    }
  }, [navigation, returnScreen, returnParams]);

  // Email resend
  const [resendLoading, setResendLoading] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Détection de la vérification email. Quand l'utilisateur clique le lien
  // dans son email (browser ou autre device), il revient ici : sans cette
  // boucle l'écran restait mort. On vérifie l'état du compte (a) au retour
  // au premier plan, (b) sur appui manuel "J'ai vérifié mon email".
  const [emailVerified, setEmailVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  const checkEmailVerified = useCallback(async (silent: boolean): Promise<boolean> => {
    if (!silent) setCheckingVerification(true);
    try {
      const res = await usersAPI.getCurrentUser();
      const verified = Boolean(res.data?.email_verified);
      if (verified) {
        setEmailVerified(true);
        await refreshUser();
      } else if (!silent) {
        showError(t('auth.verifyEmailNotYetTitle'), t('auth.verifyEmailNotYetDetail'));
      }
      return verified;
    } catch {
      return false;
    } finally {
      if (!silent) setCheckingVerification(false);
    }
  }, [refreshUser, showError, t]);

  // Refresh silencieux à chaque retour au premier plan : couvre le cas
  // "l'utilisateur quitte vers son app mail, clique le lien, revient".
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !emailVerified) {
        checkEmailVerified(true);
      }
    });
    return () => sub.remove();
  }, [emailVerified, checkEmailVerified]);

  // Phone OTP
  type PhoneStep = 'idle' | 'sending' | 'otp' | 'verifying' | 'done';
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('idle');
  // Section SMS collapsed par defaut — email reste la voie principale. L'user
  // tape "Verifier par SMS" pour expand le flow phone inline.
  // Si l'admin a desactive l'OTP telephone via /api/settings/public/,
  // on cache entierement la section SMS — pas de toggle, pas de form.
  const { flags: featureFlags } = useFeatureFlags();
  const phoneOtpAvailable = featureFlags.phone_otp_enabled;
  const [phoneExpanded, setPhoneExpanded] = useState(false);
  const togglePhoneSection = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPhoneExpanded((prev) => !prev);
  }, []);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Si l'admin desactive l'OTP pendant que l'user a la section expanded,
  // on collapse pour eviter d'afficher un formulaire qui ne marche plus.
  useEffect(() => {
    if (!phoneOtpAvailable && phoneExpanded) {
      setPhoneExpanded(false);
    }
  }, [phoneOtpAvailable, phoneExpanded]);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setTimeout(() => setEmailCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const t = setTimeout(() => setPhoneCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneCooldown]);

  const maskedEmail = (() => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.length > 2 ? local.slice(0, 2) : local[0] || '';
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
  })();

  const handleResendEmail = useCallback(async () => {
    if (resendLoading || emailCooldown > 0 || !email) return;
    setResendLoading(true);
    try {
      await authAPI.resendVerificationEmail(email);
      showSuccess(t('auth.verifyEmailResentTitle'), t('auth.verifyEmailResentDetail', { email }));
      setEmailCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        t('auth.verifyEmailResentError');
      showError(t('common.error'), message);
    } finally {
      setResendLoading(false);
    }
  }, [email, resendLoading, emailCooldown, showSuccess, showError]);

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError(t('auth.verifyByPhoneEnterNumber'));
      return;
    }
    setPhoneError(null);
    setPhoneStep('sending');
    try {
      await authAPI.phoneSendAccountVerification(phoneNumber.trim());
      setOtpPhone(phoneNumber.trim());
      setPhoneStep('otp');
      setPhoneCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.phone_number?.[0] ||
        t('auth.verifyByPhoneSMSError');
      setPhoneError(msg);
      setPhoneStep('idle');
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) return;
    setPhoneStep('verifying');
    setPhoneError(null);
    try {
      await authAPI.phoneVerifyAccount(otpPhone, otpCode);
      // Rafraîchir l'état local du user (#2) avant de naviguer
      await refreshUser();
      setPhoneStep('done');
      showSuccess(t('auth.verifyByPhoneSuccessShortTitle'), t('auth.verifyByPhoneSuccessShortDetail'));
    } catch (error: any) {
      const msg =
        error.response?.data?.detail ||
        t('auth.verifyByPhoneCodeError');
      setPhoneError(msg);
      setPhoneStep('otp');
    }
  };

  const handleResendOTP = async () => {
    if (phoneCooldown > 0) return;
    setPhoneError(null);
    setPhoneStep('sending');
    try {
      await authAPI.phoneSendAccountVerification(otpPhone);
      setPhoneStep('otp');
      setOtpCode('');
      setPhoneCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      const msg = error.response?.data?.detail || t('auth.verifyByPhoneResendError');
      setPhoneError(msg);
      setPhoneStep('otp');
    }
  };

  return (
    <EditorialCanvas>
      <WatermarkNumeral>✓</WatermarkNumeral>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // bottomOffset à 100 pour garder le pill CTA visible au-dessus du clavier
        bottomOffset={100}
        extraKeyboardSpace={20}
      >
          {/* Back button — goBack() ramène à Main (pas navigate vers Login qui empilerait) (#4) */}
          <AnimatedPressable
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.gray50 }]}
            animationType="scale"
            scaleValue={0.9}
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray800} />
          </AnimatedPressable>

          {/* État succès — affiché dès que la vérification email est détectée
              (retour au premier plan ou appui manuel). */}
          {emailVerified && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
              <View style={styles.successContent}>
                <LinearGradient colors={['#10B981', '#34D399']} style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={40} color={Colors.white} />
                </LinearGradient>
                <Text style={[styles.eyebrow, { color: '#10B981' }]}>{t('auth.verifyEmailVerifiedEyebrow')}</Text>
                <Text style={[styles.cardTitle, { color: colors.gray900 }]}>{t('auth.verifyEmailVerified')}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
                  {t('auth.verifyEmailVerifiedSubtitle')}
                </Text>
                <AnimatedPressable
                  onPress={() => {
                    if (returnScreen) {
                      navigation.reset({
                        index: 1,
                        routes: [
                          { name: 'Main' as never },
                          { name: returnScreen as never, params: returnParams as never },
                        ],
                      });
                    } else {
                      navigation.reset({ index: 0, routes: [{ name: 'Main' as never }] });
                    }
                  }}
                  style={styles.successButton}
                  animationType="scale"
                  scaleValue={0.97}
                >
                  <LinearGradient colors={['#10B981', '#34D399']} style={styles.successButtonGradient}>
                    <Text style={styles.successButtonText}>{t('auth.verifyByPhoneSuccessCTA')}</Text>
                  </LinearGradient>
                </AnimatedPressable>
              </View>
            </View>
          )}

          {!emailVerified && <>
          {/* Badge : "obligatoire" quand non-skippable, "recommandée" sinon (#7) */}
          <View style={[styles.mandatoryBadge, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <Text style={[styles.mandatoryText, { color: colors.success }]}>
              {skippable ? t('auth.verifyMandatoryRecommended') : t('auth.verifyMandatoryRequired')}
            </Text>
          </View>

          {/* ── Email card — masquée quand le téléphone est déjà vérifié (#8) ── */}
          {phoneStep !== 'done' && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
              <LinearGradient
                colors={[...gradients.brand] as [string, string]}
                style={styles.iconGradient}
              >
                <Ionicons name="mail" size={32} color={Colors.white} />
              </LinearGradient>
            </View>

            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('auth.verifyByEmailEyebrow')}</Text>
            <Text style={[styles.cardTitle, { color: colors.gray900 }]}>{t('auth.verifyByEmailTitle')}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
              {t('auth.verifyByEmailSubtitle')}{' '}
              <Text style={{ fontFamily: FontFamily.semiBold, color: colors.gray700 }}>{maskedEmail}</Text>{t('auth.verifyByEmailSubtitleSuffix')}
            </Text>

            {/* Spam hint */}
            <View style={[styles.hintCard, { backgroundColor: colors.warningLight, borderColor: colors.warning + '30' }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
              <Text style={[styles.hintText, { color: colors.warning }]}>
                {t('auth.verifyEmailSpamHint')}
              </Text>
            </View>

            {/* Resend email */}
            {emailCooldown > 0 ? (
              <View style={[styles.cooldownBadge, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="time-outline" size={14} color={colors.gray500} />
                <Text style={[styles.cooldownText, { color: colors.gray500 }]}>
                  {t('auth.verifyEmailRetryIn', { seconds: emailCooldown })}
                </Text>
              </View>
            ) : (
              <EditorialPillCTA
                eyebrow={t('auth.verifyEmailResendAction')}
                label={resendLoading ? t('auth.verifyEmailResending') : t('auth.verifyEmailResendLabel')}
                onPress={handleResendEmail}
                disabled={resendLoading}
                loading={resendLoading}
                icon="refresh"
              />
            )}

            {/* "J'ai vérifié mon email" — relance la vérification manuellement
                (en plus du refresh auto au retour au premier plan). */}
            <TouchableOpacity
              style={styles.checkVerifiedRow}
              onPress={() => checkEmailVerified(false)}
              disabled={checkingVerification}
              accessibilityRole="button"
              accessibilityLabel={t('auth.verifyEmailCheckButton')}
            >
              {checkingVerification ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
              )}
              <Text style={[styles.checkVerifiedText, { color: colors.primary }]}>
                {t('auth.verifyEmailCheckButton')}
              </Text>
            </TouchableOpacity>
          </View>
          )}

          {/* ── Divider — masqué aussi quand téléphone vérifié OU OTP désactivé admin ── */}
          {phoneOtpAvailable && phoneStep !== 'done' && (
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.gray200 }]} />
            <Text style={[styles.dividerText, { color: colors.gray400 }]}>{t('auth.verifyOr')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.gray200 }]} />
          </View>
          )}

          {/* ── Bouton secondaire "Verifier par SMS" — collapsed par defaut.
                 Au tap, expand inline pour reveler le flow phone (input → OTP).
                 Cache si OTP desactive cote admin. ── */}
          {phoneOtpAvailable && phoneStep !== 'done' && !phoneExpanded && (
            <AnimatedPressable
              onPress={togglePhoneSection}
              style={[styles.smsToggle, { backgroundColor: colors.card, borderColor: colors.gray200 }]}
              animationType="scale"
              scaleValue={0.97}
              accessibilityRole="button"
              accessibilityLabel={t('auth.verifyByPhoneSwitchToSms')}
            >
              <View style={[styles.smsToggleIcon, { backgroundColor: '#4F46E515' }]}>
                <Ionicons name="phone-portrait" size={20} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.smsToggleTitle, { color: colors.gray900 }]}>
                  {t('auth.verifyByPhoneSwitchToSms')}
                </Text>
                <Text style={[styles.smsToggleHint, { color: colors.gray500 }]}>
                  {t('auth.verifyByPhoneSwitchToSmsHint')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
            </AnimatedPressable>
          )}

          {/* ── Phone OTP card — visible quand expanded OU verification reussie.
               Cache aussi si OTP desactive cote admin (filet de securite : si
               le toggle bascule a OFF pendant que l'user etait expanded). ── */}
          {phoneOtpAvailable && (phoneExpanded || phoneStep === 'done') && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
            {phoneStep === 'done' ? (
              /* Success */
              <View style={styles.successContent}>
                <LinearGradient
                  colors={['#10B981', '#34D399']}
                  style={styles.successIcon}
                >
                  <Ionicons name="checkmark-circle" size={40} color={Colors.white} />
                </LinearGradient>
                <Text style={[styles.eyebrow, { color: '#10B981' }]}>{t('auth.verifyByPhoneSuccessEyebrow')}</Text>
                <Text style={[styles.cardTitle, { color: colors.gray900 }]}>{t('auth.verifyByPhoneSuccessTitle')}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
                  {t('auth.verifyByPhoneSuccessSubtitle')}
                </Text>
                <AnimatedPressable
                  onPress={() => {
                    // Naviguer vers returnScreen ou Main — jamais Login (#1)
                    if (returnScreen) {
                      navigation.reset({
                        index: 1,
                        routes: [
                          { name: 'Main' as never },
                          { name: returnScreen as never, params: returnParams as never },
                        ],
                      });
                    } else {
                      navigation.reset({ index: 0, routes: [{ name: 'Main' as never }] });
                    }
                  }}
                  style={styles.successButton}
                  animationType="scale"
                  scaleValue={0.97}
                >
                  <LinearGradient colors={['#10B981', '#34D399']} style={styles.successButtonGradient}>
                    <Text style={styles.successButtonText}>{t('auth.verifyByPhoneSuccessCTA')}</Text>
                  </LinearGradient>
                </AnimatedPressable>
              </View>
            ) : (
              <>
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: '#4F46E515' }]}>
                  <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="phone-portrait" size={32} color={Colors.white} />
                  </LinearGradient>
                </View>

                <Text style={[styles.eyebrow, { color: '#4F46E5' }]}>
                  {phoneStep === 'otp' || phoneStep === 'verifying' ? t('auth.verifyByPhoneEyebrowEnter') : t('auth.verifyByPhoneEyebrowSend')}
                </Text>
                <Text style={[styles.cardTitle, { color: colors.gray900 }]}>{t('auth.verifyByPhoneTitle')}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
                  {phoneStep === 'otp' || phoneStep === 'verifying'
                    ? t('auth.verifyByPhoneSubtitleSent', { phone: otpPhone })
                    : t('auth.verifyByPhoneSubtitleEnter')}
                </Text>

                {phoneError && (
                  <View style={[styles.errorCard, { backgroundColor: colors.errorLight, borderColor: colors.error + '30' }]}>
                    <Ionicons name="alert-circle" size={14} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.error }]}>{phoneError}</Text>
                  </View>
                )}

                {(phoneStep === 'idle' || phoneStep === 'sending') && (
                  <>
                    <TextInput
                      style={[styles.phoneInput, { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.background }]}
                      placeholder={t('auth.verifyByPhonePlaceholder')}
                      placeholderTextColor={colors.gray400}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                    />
                    <Text style={[styles.formatHint, { color: colors.gray400 }]}>
                      {t('auth.verifyByPhoneFormatHint')}
                    </Text>
                    <AnimatedPressable
                      onPress={handleSendOTP}
                      disabled={phoneStep === 'sending' || !phoneNumber.trim()}
                      style={[styles.sendButton, (phoneStep === 'sending' || !phoneNumber.trim()) && styles.disabledButton]}
                      animationType="scale"
                      scaleValue={0.97}
                    >
                      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.sendButtonGradient}>
                        {phoneStep === 'sending' ? (
                          <ActivityIndicator color={Colors.white} size="small" />
                        ) : (
                          <>
                            <Ionicons name="send" size={16} color={Colors.white} />
                            <Text style={styles.sendButtonText}>{t('auth.verifyByPhoneSend')}</Text>
                          </>
                        )}
                      </LinearGradient>
                    </AnimatedPressable>
                  </>
                )}

                {(phoneStep === 'otp' || phoneStep === 'verifying') && (
                  <>
                    <View style={styles.otpContainer}>
                      <OTPInput value={otpCode} onChange={setOtpCode} />
                    </View>

                    <AnimatedPressable
                      onPress={handleVerifyOTP}
                      disabled={otpCode.length !== 6 || phoneStep === 'verifying'}
                      style={[styles.sendButton, (otpCode.length !== 6 || phoneStep === 'verifying') && styles.disabledButton]}
                      animationType="scale"
                      scaleValue={0.97}
                    >
                      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.sendButtonGradient}>
                        {phoneStep === 'verifying' ? (
                          <ActivityIndicator color={Colors.white} size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                            <Text style={styles.sendButtonText}>{t('auth.verifyByPhoneConfirm')}</Text>
                          </>
                        )}
                      </LinearGradient>
                    </AnimatedPressable>

                    <View style={styles.otpActions}>
                      <TouchableOpacity onPress={() => { setPhoneStep('idle'); setOtpCode(''); setPhoneError(null); }}>
                        <Text style={[styles.otpActionText, { color: colors.gray500 }]}>{t('auth.verifyByPhoneChangeNumber')}</Text>
                      </TouchableOpacity>
                      {phoneCooldown > 0 ? (
                        <Text style={[styles.otpActionText, { color: colors.gray400 }]}>{t('auth.verifyByPhoneResendIn', { seconds: phoneCooldown })}</Text>
                      ) : (
                        <TouchableOpacity onPress={handleResendOTP}>
                          <Text style={[styles.otpActionText, { color: '#7C3AED', fontFamily: FontFamily.semiBold }]}>
                            {t('auth.verifyByPhoneResend')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </View>
          )}

          {/* Lien "Revenir a l'email" : visible quand phone expanded mais pas
              encore verifie — permet de collapse pour revenir au flow principal. */}
          {phoneExpanded && phoneStep !== 'done' && (
            <TouchableOpacity
              style={styles.collapsePhoneBtn}
              onPress={togglePhoneSection}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={14} color={colors.gray500} />
              <Text style={[styles.collapsePhoneText, { color: colors.gray500 }]}>
                {t('auth.verifyByPhoneBackToEmail')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Mauvais email → Register avec l'email pré-rempli (l'utilisateur
              corrige une faute de frappe sans retaper tout le formulaire). */}
          <TouchableOpacity
            style={styles.wrongEmailRow}
            onPress={() => navigation.replace('Register', { prefillEmail: email, returnScreen: returnScreen ?? undefined, returnParams })}
          >
            <Text style={[styles.wrongEmailText, { color: colors.gray500 }]}>{t('auth.verifyWrongEmail')}</Text>
            <Text style={[styles.wrongEmailLink, { color: colors.primary }]}>{t('auth.verifyWrongEmailLink')}</Text>
          </TouchableOpacity>

          {/* Skip for later — visible uniquement quand le user vient de se connecter
              et que la verification n'est pas obligatoire pour l'action en cours. */}
          {skippable && (
            <TouchableOpacity
              style={[styles.skipBtn, { borderColor: colors.gray200, backgroundColor: colors.surface }]}
              onPress={handleSkipForLater}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('auth.verifySkipAccessibility')}
            >
              <Ionicons name="time-outline" size={16} color={colors.gray700} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.skipBtnText, { color: colors.gray900 }]}>
                  {t('auth.verifySkipTitle')}
                </Text>
                <Text style={[styles.skipBtnHint, { color: colors.gray500 }]}>
                  {t('auth.verifySkipHint')}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.gray400} />
            </TouchableOpacity>
          )}
          </>}
      </KeyboardAwareScrollView>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  mandatoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    alignSelf: 'center',
  },
  mandatoryText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
  },
  card: {
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  iconGradient: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayExtraBold,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  cardSubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  hintText: {
    flex: 1,
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    lineHeight: FontSizes.xs * 1.6,
  },
  cooldownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  cooldownText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: '100%',
    marginBottom: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
  },
  phoneInput: {
    width: '100%',
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    marginBottom: Spacing.xs,
  },
  formatHint: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  sendButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  sendButtonText: {
    color: Colors.white,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  disabledButton: {
    opacity: 0.6,
  },
  otpContainer: {
    marginBottom: Spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.md,
  },
  otpActionText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
  },
  successContent: {
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.lg,
  },
  successButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonText: {
    color: Colors.white,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  smsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    ...Shadows.sm,
  },
  smsToggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsToggleTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  smsToggleHint: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  collapsePhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  collapsePhoneText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
  },
  checkVerifiedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  checkVerifiedText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
  },
  wrongEmailRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  wrongEmailText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
  },
  wrongEmailLink: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  skipBtnText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  skipBtnHint: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
});
