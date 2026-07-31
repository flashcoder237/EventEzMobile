import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../../api';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import { EditorialCanvas, EditorialPillCTA, WatermarkNumeral } from '../../components/ui/editorial';
import { centeredContent } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type RouteProps = RouteProp<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { showError, showSuccess } = useAlert();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { token } = route.params;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setIsValidating(true);
    try {
      await authAPI.validateResetToken(token);
      setIsTokenValid(true);
    } catch (err: any) {
      setIsTokenValid(false);
      showError(
        t('auth.resetPasswordExpiredTitle2'),
        t('auth.resetPasswordExpiredHelp')
      );
    } finally {
      setIsValidating(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password.trim()) {
      newErrors.password = t('auth.resetPasswordRequiredField');
    } else if (password.length < 8) {
      newErrors.password = t('auth.resetPasswordTooShort');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = t('auth.resetPasswordRule');
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('auth.resetPasswordConfirmRequired');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDontMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setIsSuccess(true);
      showSuccess(t('auth.resetPasswordSuccessShort'));
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.password) {
        const msg = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        setErrors({ password: msg });
      } else if (errorData?.token) {
        showError(t('common.error'), t('auth.resetPasswordTokenExpiredError'));
      } else if (errorData?.detail) {
        showError(t('common.error'), errorData.detail);
      } else {
        showError(t('common.error'), t('errors.generic'));
      }
    } finally {
      setIsLoading(false);
      // Sécurité : on retire le token des route.params une fois consommé pour
      // qu'il ne traîne pas dans la navigation state (back stack visible si
      // l'app est ouverte sur device volé). Voir AUDIT §3.4.
      navigation.setParams({ token: undefined } as never);
    }
  };

  // Loading state - validating token
  if (isValidating) {
    return (
      <EditorialCanvas>
        <WatermarkNumeral>04</WatermarkNumeral>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.eyebrow, { color: colors.accent, marginTop: Spacing.lg }]}>{t('auth.resetPasswordValidatingEyebrow')}</Text>
          <Text style={[styles.loadingText, { color: colors.gray500 }]}>{t('auth.resetPasswordValidating')}</Text>
        </View>
      </EditorialCanvas>
    );
  }

  // Invalid token state
  if (!isTokenValid) {
    return (
      <EditorialCanvas>
        <WatermarkNumeral>NO</WatermarkNumeral>
        <View style={styles.centerContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.gray50 }]}>
            <Ionicons name="close-circle-outline" size={48} color={colors.error} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('auth.resetPasswordExpiredEyebrow')}</Text>
          <Text style={[styles.successTitle, { color: colors.gray900 }]}>{t('auth.resetPasswordExpiredTitle')}</Text>
          <Text style={[styles.successText, { color: colors.gray600 }]}>
            {t('auth.resetPasswordExpiredText')}
          </Text>
          <View style={styles.successButtonWrap}>
            <EditorialPillCTA
              eyebrow={t('auth.resetPasswordExpiredAction')}
              label={t('auth.resetPasswordExpiredCTA')}
              onPress={() => navigation.navigate('ForgotPassword')}
              icon="refresh"
            />
          </View>
          <AnimatedPressable
            onPress={() => navigation.navigate('Login')}
            animationType="scale"
            scaleValue={0.95}
            style={styles.linkContainer}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>{t('auth.resetBack')}</Text>
          </AnimatedPressable>
        </View>
      </EditorialCanvas>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <EditorialCanvas>
        <WatermarkNumeral>OK</WatermarkNumeral>
        <View style={styles.centerContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('auth.resetPasswordSuccessEyebrow')}</Text>
          <Text style={[styles.successTitle, { color: colors.gray900 }]}>{t('auth.resetPasswordSuccessTitle')}</Text>
          <Text style={[styles.successText, { color: colors.gray600 }]}>
            {t('auth.resetPasswordSuccessText')}
          </Text>
          <View style={styles.successButtonWrap}>
            <EditorialPillCTA
              eyebrow={t('auth.resetPasswordSuccessAction')}
              label={t('auth.resetPasswordSuccessCTA')}
              onPress={() => navigation.navigate('Login')}
              icon="log-in"
            />
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  // Main form
  return (
    <EditorialCanvas>
      <WatermarkNumeral>04</WatermarkNumeral>
      <KeyboardAwareScrollView
        style={styles.keyboardView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // bottomOffset à 100 pour garder le pill CTA visible au-dessus du clavier
        bottomOffset={100}
      >
        {/* Back Button */}
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.gray50 }]}
          animationType="scale"
          scaleValue={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray800} />
        </AnimatedPressable>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.gray50 }]}>
            <Ionicons name="key-outline" size={40} color={colors.primary} />
          </View>
        </View>

        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('auth.resetPasswordEyebrow')}</Text>
          <Text style={[styles.title, { color: colors.gray900 }]}>{t('auth.resetPasswordTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            {t('auth.resetPasswordSubtitle')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Password Field */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.gray700 }]}>{t('auth.newPassword')}</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }, errors.password && [styles.inputError, { backgroundColor: colors.errorLight }]]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.gray400} />
              </View>
              <TextInput
                style={[styles.input, { color: colors.gray900 }]}
                placeholder={t('auth.resetPasswordPlaceholder')}
                placeholderTextColor={colors.gray400}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
              />
              <AnimatedPressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                animationType="scale"
                scaleValue={0.9}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.gray400}
                />
              </AnimatedPressable>
            </View>
            {errors.password && (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={[styles.fieldErrorText, { color: colors.error }]}>{errors.password}</Text>
              </View>
            )}
          </View>

          {/* Confirm Password Field */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.gray700 }]}>{t('auth.confirmPassword')}</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }, errors.confirmPassword && [styles.inputError, { backgroundColor: colors.errorLight }]]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.gray400} />
              </View>
              <TextInput
                style={[styles.input, { color: colors.gray900 }]}
                placeholder={t('auth.resetPasswordConfirmPlaceholder')}
                placeholderTextColor={colors.gray400}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
              />
              <AnimatedPressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
                animationType="scale"
                scaleValue={0.9}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.gray400}
                />
              </AnimatedPressable>
            </View>
            {errors.confirmPassword && (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={[styles.fieldErrorText, { color: colors.error }]}>{errors.confirmPassword}</Text>
              </View>
            )}
          </View>

          {/* Password requirements */}
          <View style={[styles.requirementsContainer, { backgroundColor: colors.gray50 }]}>
            <Text style={[styles.requirementsTitle, { color: colors.gray700 }]}>{t('auth.resetPasswordRequirementsTitle')}</Text>
            <PasswordRequirement
              met={password.length >= 8}
              text={t('auth.resetPasswordReq1')}
            />
            <PasswordRequirement
              met={/[A-Z]/.test(password)}
              text={t('auth.resetPasswordReq2')}
            />
            <PasswordRequirement
              met={/[a-z]/.test(password)}
              text={t('auth.resetPasswordReq3')}
            />
            <PasswordRequirement
              met={/\d/.test(password)}
              text={t('auth.resetPasswordReq4')}
            />
          </View>

          <View style={styles.submitButtonWrap}>
            <EditorialPillCTA
              eyebrow={t('auth.resetPasswordAction')}
              label={t('auth.resetPasswordSubmit')}
              onPress={handleSubmit}
              loading={isLoading}
              icon="checkmark"
            />
          </View>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: colors.gray500 }]}>{t('auth.rememberQuestion')}</Text>
          <AnimatedPressable
            onPress={() => navigation.navigate('Login')}
            animationType="scale"
            scaleValue={0.95}
          >
            <Text style={[styles.loginLink, { color: colors.primary }]}> {t('auth.loginButton')}</Text>
          </AnimatedPressable>
        </View>
      </KeyboardAwareScrollView>
    </EditorialCanvas>
  );
}

// Password requirement indicator component
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.requirementRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? Colors.success : colors.gray400}
      />
      <Text style={[styles.requirementText, { color: colors.gray500 }, met && styles.requirementMet]}>
        {text}
      </Text>
    </View>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    ...centeredContent(480),
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    ...centeredContent(480),
  },
  loadingText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    marginTop: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  headerContainer: {
    marginBottom: Spacing.xl,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    lineHeight: FontSizes.base * 1.5,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    gap: Spacing.xs,
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
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    overflow: 'hidden',
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
    color: Colors.gray900,
  },
  eyeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  fieldErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  fieldErrorText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  requirementsContainer: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  requirementsTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  requirementText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  requirementMet: {
    color: Colors.success,
  },
  submitButtonWrap: {
    marginTop: Spacing.md,
    flexDirection: 'row',
  },
  successButtonWrap: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing['3xl'],
  },
  loginText: {
    color: Colors.gray500,
    fontSize: FontSizes.md,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
  },
  linkContainer: {
    marginTop: Spacing.lg,
  },
  linkText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  // Success state
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: FontSizes['3xl'],
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  successText: {
    fontSize: FontSizes.base,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: FontSizes.base * 1.5,
    marginBottom: Spacing.md,
  },
});
