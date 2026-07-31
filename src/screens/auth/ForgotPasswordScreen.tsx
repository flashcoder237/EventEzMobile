import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showError } = useAlert();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = () => {
    if (!email.trim()) {
      setError(t('auth.emailRequired'));
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('auth.emailInvalid'));
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      await authAPI.requestPasswordReset(email.trim().toLowerCase());
      setIsSuccess(true);
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.email) {
        showError(t('common.error'), Array.isArray(errorData.email) ? errorData.email[0] : errorData.email);
      } else if (errorData?.detail) {
        showError(t('common.error'), errorData.detail);
      } else {
        // On affiche un succès même si l'email n'existe pas (sécurité)
        setIsSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <EditorialCanvas>
        <WatermarkNumeral>OK</WatermarkNumeral>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.gray50 }]}>
            <Ionicons name="mail-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.accent, textAlign: 'center' }]}>{t('auth.resetSuccessEyebrow')}</Text>
          <Text style={[styles.successTitle, { color: colors.gray900 }]}>{t('auth.resetSuccessTitle')}</Text>
          <Text style={[styles.successText, { color: colors.gray600 }]}>
            {t('auth.resetSuccessText', { email })}
          </Text>
          <Text style={[styles.successHint, { color: colors.gray400 }]}>
            {t('auth.resetSuccessHint')}
          </Text>
          <View style={styles.successButtonWrap}>
            <EditorialPillCTA
              eyebrow={t('auth.resetBackAction')}
              label={t('auth.resetBack')}
              onPress={() => navigation.navigate('Login')}
              icon="arrow-back"
            />
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas>
      <WatermarkNumeral>03</WatermarkNumeral>
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
            >
              <Ionicons name="arrow-back" size={24} color={colors.gray800} />
            </AnimatedPressable>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.gray50 }]}>
                <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
              </View>
            </View>

            {/* Header */}
            <View style={styles.headerContainer}>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('auth.resetEyebrow')}</Text>
              <Text style={[styles.title, { color: colors.gray900 }]}>{t('auth.resetTitle')}</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                {t('auth.forgotPasswordSubtitle')}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.gray700 }]}>{t('auth.email')}</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }, error && [styles.inputError, { backgroundColor: colors.errorLight }]]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="mail-outline" size={20} color={colors.gray400} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: colors.gray900 }]}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={colors.gray400}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) setError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                  />
                </View>
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                  </View>
                )}
              </View>

              <View style={styles.submitButtonWrap}>
                <EditorialPillCTA
                  eyebrow={t('auth.sendLinkAction')}
                  label={t('auth.sendLink')}
                  onPress={handleSubmit}
                  loading={isLoading}
                  icon="send"
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
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    ...centeredContent(480),
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray50,
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
  successHint: {
    fontSize: FontSizes.sm,
    color: Colors.gray400,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  successButton: {
    marginTop: Spacing.lg,
  },
});
