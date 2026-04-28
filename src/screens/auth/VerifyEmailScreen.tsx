import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { authAPI } from '../../api';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
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
  const { email } = route.params;
  const { colors, gradients } = useTheme();
  const { showSuccess, showError } = useAlert();

  // Email resend
  const [resendLoading, setResendLoading] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Phone OTP
  type PhoneStep = 'idle' | 'sending' | 'otp' | 'verifying' | 'done';
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);

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
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.length > 2 ? local.slice(0, 2) : local[0] || '';
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
  })();

  const handleResendEmail = useCallback(async () => {
    if (resendLoading || emailCooldown > 0) return;
    setResendLoading(true);
    try {
      await authAPI.resendVerificationEmail(email);
      showSuccess('Email envoyé', `Un nouveau lien a été envoyé à ${email}.`);
      setEmailCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        "Impossible d'envoyer l'email. Veuillez réessayer.";
      showError('Erreur', message);
    } finally {
      setResendLoading(false);
    }
  }, [email, resendLoading, emailCooldown, showSuccess, showError]);

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError('Veuillez entrer votre numéro de téléphone.');
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
        'Impossible d\'envoyer le SMS. Vérifiez le numéro.';
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
      setPhoneStep('done');
      showSuccess('Téléphone vérifié !', 'Votre compte est maintenant activé.');
    } catch (error: any) {
      const msg =
        error.response?.data?.detail ||
        'Code incorrect ou expiré.';
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
      const msg = error.response?.data?.detail || 'Impossible de renvoyer le SMS.';
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
        bottomOffset={20}
        extraKeyboardSpace={20}
      >
          {/* Back button */}
          <AnimatedPressable
            onPress={() => navigation.navigate('Login')}
            style={[styles.backButton, { backgroundColor: colors.gray50 }]}
            animationType="scale"
            scaleValue={0.9}
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray800} />
          </AnimatedPressable>

          {/* Mandatory badge */}
          <View style={[styles.mandatoryBadge, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <Text style={[styles.mandatoryText, { color: colors.success }]}>
              Étape obligatoire pour activer votre compte
            </Text>
          </View>

          {/* ── Email card ── */}
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

            <Text style={[styles.eyebrow, { color: colors.accent }]}>Confirme par email</Text>
            <Text style={[styles.cardTitle, { color: colors.gray900 }]}>Vérifier par email</Text>
            <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
              Lien envoyé à{' '}
              <Text style={{ fontFamily: FontFamily.semiBold, color: colors.gray700 }}>{maskedEmail}</Text>.
              Cliquez dessus pour activer.
            </Text>

            {/* Spam hint */}
            <View style={[styles.hintCard, { backgroundColor: colors.warningLight, borderColor: colors.warning + '30' }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
              <Text style={[styles.hintText, { color: colors.warning }]}>
                Vérifiez vos spams si vous ne trouvez pas l'email.
              </Text>
            </View>

            {/* Resend email */}
            {emailCooldown > 0 ? (
              <View style={[styles.cooldownBadge, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="time-outline" size={14} color={colors.gray500} />
                <Text style={[styles.cooldownText, { color: colors.gray500 }]}>
                  Réessayer dans {emailCooldown}s
                </Text>
              </View>
            ) : (
              <EditorialPillCTA
                eyebrow="Renvoyer"
                label={resendLoading ? 'Envoi…' : 'Renvoyer le lien'}
                onPress={handleResendEmail}
                disabled={resendLoading}
                loading={resendLoading}
                icon="refresh"
              />
            )}
          </View>

          {/* ── Divider ── */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.gray200 }]} />
            <Text style={[styles.dividerText, { color: colors.gray400 }]}>ou</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.gray200 }]} />
          </View>

          {/* ── Phone OTP card ── */}
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
                <Text style={[styles.eyebrow, { color: '#10B981' }]}>Compte activé</Text>
                <Text style={[styles.cardTitle, { color: colors.gray900 }]}>Téléphone vérifié !</Text>
                <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
                  Votre numéro a été confirmé. Votre compte est maintenant actif.
                </Text>
                <AnimatedPressable
                  onPress={() => navigation.navigate('Login')}
                  style={styles.successButton}
                  animationType="scale"
                  scaleValue={0.97}
                >
                  <LinearGradient colors={['#10B981', '#34D399']} style={styles.successButtonGradient}>
                    <Text style={styles.successButtonText}>Accéder à mon compte</Text>
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
                  {phoneStep === 'otp' || phoneStep === 'verifying' ? 'Saisis le code' : 'Confirme par SMS'}
                </Text>
                <Text style={[styles.cardTitle, { color: colors.gray900 }]}>Vérifier par SMS</Text>
                <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
                  {phoneStep === 'otp' || phoneStep === 'verifying'
                    ? `Code envoyé au ${otpPhone}`
                    : 'Entrez votre numéro pour recevoir un code de vérification.'}
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
                      placeholder="+237 6XX XXX XXX"
                      placeholderTextColor={colors.gray400}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                    />
                    <Text style={[styles.formatHint, { color: colors.gray400 }]}>
                      Format international requis, ex. +237 6XXXXXXXX
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
                            <Text style={styles.sendButtonText}>Envoyer le code SMS</Text>
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
                            <Text style={styles.sendButtonText}>Confirmer le code</Text>
                          </>
                        )}
                      </LinearGradient>
                    </AnimatedPressable>

                    <View style={styles.otpActions}>
                      <TouchableOpacity onPress={() => { setPhoneStep('idle'); setOtpCode(''); setPhoneError(null); }}>
                        <Text style={[styles.otpActionText, { color: colors.gray500 }]}>Changer de numéro</Text>
                      </TouchableOpacity>
                      {phoneCooldown > 0 ? (
                        <Text style={[styles.otpActionText, { color: colors.gray400 }]}>Renvoyer dans {phoneCooldown}s</Text>
                      ) : (
                        <TouchableOpacity onPress={handleResendOTP}>
                          <Text style={[styles.otpActionText, { color: '#7C3AED', fontFamily: FontFamily.semiBold }]}>
                            Renvoyer le code
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </View>

          {/* Wrong email? */}
          <TouchableOpacity style={styles.wrongEmailRow} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.wrongEmailText, { color: colors.gray500 }]}>Mauvais email ? </Text>
            <Text style={[styles.wrongEmailLink, { color: colors.primary }]}>Retour à la connexion</Text>
          </TouchableOpacity>
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
});
