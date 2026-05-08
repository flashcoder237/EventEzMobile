import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

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
import { authAPI } from '../../api';
import { extractErrorMessage } from '../../lib/utils/errorHandling';
import { validators } from '../../lib/validation';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import { EditorialCanvas, EditorialPillCTA, WatermarkNumeral } from '../../components/ui/editorial';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;
type RouteProps = RouteProp<RootStackParamList, 'Register'>;

/**
 * Mapping field → hints autofill. Sur Android, sans ces hints, le Credential
 * Manager / Smart Lock ne propose pas d'enregistrer le mot de passe créé.
 *
 * Spécificité : sur un formulaire d'INSCRIPTION, on doit utiliser
 * `autoComplete="new-password"` (et non "password"), sinon Android pense
 * qu'on veut un mot de passe existant et ne propose pas d'enregistrer.
 */
const getAutofillHints = (field: string): {
  autoComplete?: any;
  textContentType?: any;
} => {
  switch (field) {
    case 'first_name':
      return { autoComplete: 'given-name', textContentType: 'givenName' };
    case 'last_name':
      return { autoComplete: 'family-name', textContentType: 'familyName' };
    case 'username':
      return { autoComplete: 'username-new', textContentType: 'username' };
    case 'email':
      return { autoComplete: 'email', textContentType: 'emailAddress' };
    case 'phone_number':
      return { autoComplete: 'tel', textContentType: 'telephoneNumber' };
    case 'password':
    case 'confirm_password':
      return { autoComplete: 'new-password', textContentType: 'newPassword' };
    default:
      return {};
  }
};

interface FormData {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone_number: string;
  password: string;
  confirm_password: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  phone_number?: string;
  password?: string;
  confirm_password?: string;
}

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { returnScreen, returnParams } = route.params || {};
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showError } = useAlert();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleEmailChange = (email: string) => {
    updateField('email', email);
    if (!formData.username && email.includes('@')) {
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      setFormData((prev) => ({ ...prev, email, username }));
    }
  };

  const validate = () => {
    const newErrors: FormErrors = {};
    const firstNameError = validators.required(formData.first_name, t('auth.firstName'));
    if (firstNameError) newErrors.first_name = firstNameError;
    const lastNameError = validators.required(formData.last_name, t('auth.lastName'));
    if (lastNameError) newErrors.last_name = lastNameError;
    const usernameError = validators.username(formData.username, 3);
    if (usernameError) newErrors.username = usernameError;
    const emailError = validators.email(formData.email);
    if (emailError) newErrors.email = emailError;
    const passwordError = validators.password(formData.password, 8);
    if (passwordError) newErrors.password = passwordError;
    const confirmError = validators.confirmPassword(formData.confirm_password, formData.password);
    if (confirmError) newErrors.confirm_password = confirmError;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      // Appel API direct (pas AuthContext.register() qui set isLoading → unmount navigator)
      const response = await authAPI.register({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        phone_number: formData.phone_number.trim() || undefined,
        password: formData.password,
        confirm_password: formData.confirm_password,
      });
      setIsSubmitting(false);
      const targetEmail = response.data?.email ?? formData.email.trim().toLowerCase();
      // Navigation vers VerifyEmail. On passe `skippable=true` pour que l'utilisateur
      // puisse explorer l'app sans verifier tout de suite (la verification reste
      // obligatoire pour acheter un billet — les bandeaux UI le rappellent ailleurs).
      navigation.replace('VerifyEmail', {
        email: targetEmail,
        skippable: true,
        returnScreen,
        returnParams,
      });
    } catch (error: any) {
      setIsSubmitting(false);
      const message = extractErrorMessage(error);
      showError(t('auth.registerError'), message);
    }
  };

  const getInputStyle = (field: string, hasError: boolean) => {
    if (hasError) return [styles.inputError, { backgroundColor: colors.errorLight }];
    if (focusedField === field) return [styles.inputFocused, { backgroundColor: colors.surface, borderColor: colors.primary }];
    return null;
  };

  const renderInput = (
    field: keyof FormData,
    placeholder: string,
    icon: keyof typeof Ionicons.glyphMap,
    options?: {
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      autoCapitalize?: 'none' | 'words';
      secureTextEntry?: boolean;
      onChangeText?: (text: string) => void;
      showPasswordToggle?: boolean;
      showPassword?: boolean;
      onTogglePassword?: () => void;
    }
  ) => (
    <View
      style={[styles.inputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }, getInputStyle(field, !!errors[field])]}
    >
      <View style={styles.inputIconContainer}>
        <Ionicons
          name={icon}
          size={20}
          color={focusedField === field ? colors.primary : colors.gray400}
        />
      </View>
      <TextInput
        style={[styles.input, { color: colors.gray900 }]}
        placeholder={placeholder}
        placeholderTextColor={colors.gray400}
        value={formData[field]}
        onChangeText={options?.onChangeText || ((text) => updateField(field, text))}
        onFocus={() => setFocusedField(field)}
        onBlur={() => {
          setFocusedField(null);
          const current = formData[field];
          if (typeof current === 'string' && current !== current.trim()) {
            updateField(field, current.trim());
          }
        }}
        keyboardType={options?.keyboardType || 'default'}
        autoCapitalize={options?.autoCapitalize || 'none'}
        secureTextEntry={options?.secureTextEntry}
        autoCorrect={false}
        // Hints autofill dérivés du nom du champ — sans ça, Android ne
        // propose pas d'enregistrer les credentials après inscription.
        {...getAutofillHints(field)}
        importantForAutofill="yes"
      />
      {options?.showPasswordToggle && (
        <AnimatedPressable
          onPress={options.onTogglePassword}
          style={styles.eyeButton}
          animationType="scale"
          scaleValue={0.9}
          accessibilityRole="button"
          accessibilityLabel={options.showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
        >
          <Ionicons
            name={options.showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.gray400}
          />
        </AnimatedPressable>
      )}
    </View>
  );

  return (
    <EditorialCanvas>
      <WatermarkNumeral>02</WatermarkNumeral>
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
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('auth.registerEyebrow')}</Text>
            <Text style={[styles.title, { color: colors.gray900 }]}>{t('auth.registerButton')}</Text>
            <Text style={[styles.subtitle, { color: colors.gray500 }]}>
              {t('auth.registerSubtitle')}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Row */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                {renderInput('first_name', t('auth.firstName'), 'person-outline', {
                  autoCapitalize: 'words',
                })}
                {errors.first_name && (
                  <Text style={[styles.fieldError, { color: colors.error }]}>{errors.first_name}</Text>
                )}
              </View>
              <View style={styles.halfInput}>
                {renderInput('last_name', t('auth.lastName'), 'person-outline', {
                  autoCapitalize: 'words',
                })}
                {errors.last_name && (
                  <Text style={[styles.fieldError, { color: colors.error }]}>{errors.last_name}</Text>
                )}
              </View>
            </View>

            {/* Username */}
            <View style={styles.inputContainer}>
              {renderInput('username', t('auth.username'), 'at-outline')}
              {errors.username && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{errors.username}</Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              {renderInput('email', t('auth.emailPlaceholder'), 'mail-outline', {
                keyboardType: 'email-address',
                onChangeText: handleEmailChange,
              })}
              {errors.email && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{errors.email}</Text>
              )}
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
              {renderInput('phone_number', t('auth.phoneOptional'), 'call-outline', {
                keyboardType: 'phone-pad',
              })}
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              {renderInput('password', t('auth.password'), 'lock-closed-outline', {
                secureTextEntry: !showPassword,
                showPasswordToggle: true,
                showPassword,
                onTogglePassword: () => setShowPassword(!showPassword),
              })}
              {errors.password && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{errors.password}</Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              {renderInput('confirm_password', t('auth.confirmPassword'), 'lock-closed-outline', {
                secureTextEntry: !showConfirmPassword,
                showPasswordToggle: true,
                showPassword: showConfirmPassword,
                onTogglePassword: () => setShowConfirmPassword(!showConfirmPassword),
              })}
              {errors.confirm_password && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{errors.confirm_password}</Text>
              )}
            </View>

            {/* Terms */}
            <Text style={[styles.termsText, { color: colors.gray500 }]}>
              {t('auth.termsAcceptRegister')}{' '}
              <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => navigation.navigate('Terms')}>{t('auth.termsLink')}</Text> {t('auth.termsAnd')}{' '}
              <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => navigation.navigate('Privacy')}>{t('auth.privacyLink')}</Text>
            </Text>

            {/* Register Button — editorial pill CTA */}
            <View style={styles.registerButtonWrap}>
              <EditorialPillCTA
                eyebrow={t('auth.registerEntryAction')}
                label={t('auth.createAccount')}
                onPress={handleRegister}
                loading={isSubmitting}
              />
            </View>
          </View>

          {/* Organizer Link */}
          <View style={styles.organizerContainer}>
            <AnimatedPressable
              onPress={() => navigation.navigate('RegisterOrganizer')}
              style={styles.organizerButton}
              animationType="lift"
              scaleValue={0.98}
              accessibilityRole="link"
              accessibilityLabel={t('auth.registerOrganizerLink')}
            >
              <View style={[styles.organizerIconContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="megaphone" size={24} color={Colors.secondary} />
              </View>
              <View style={styles.organizerTextContainer}>
                <Text style={[styles.organizerTitle, { color: colors.gray800 }]}>{t('auth.becomeOrganizerTitle')}</Text>
                <Text style={[styles.organizerSubtitle, { color: colors.gray500 }]}>{t('auth.becomeOrganizerSubtitle')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </AnimatedPressable>
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.gray500 }]}>{t('auth.hasAccount')}</Text>
            <AnimatedPressable
              onPress={() => navigation.replace('Login', { returnScreen: (returnScreen as keyof RootStackParamList | undefined) ?? undefined, returnParams })}
              animationType="scale"
              scaleValue={0.95}
              accessibilityRole="link"
              accessibilityLabel={t('auth.loginButton')}
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
    paddingBottom: Spacing['3xl'],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 150,
    height: 48,
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
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  inputContainer: {
    gap: Spacing.xs,
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
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },
  eyeButton: {
    padding: Spacing.md,
  },
  fieldError: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  termsText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    lineHeight: FontSizes.sm * 1.6,
    marginTop: Spacing.sm,
  },
  termsLink: {
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
  registerButtonWrap: {
    marginTop: Spacing.md,
    flexDirection: 'row',
  },
  organizerContainer: {
    marginTop: Spacing['2xl'],
  },
  organizerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.secondary + '10',
    borderWidth: 1,
    borderColor: Colors.secondary + '25',
  },
  organizerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  organizerTextContainer: {
    flex: 1,
  },
  organizerTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray800,
  },
  organizerSubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: 2,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
  },
  loginText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  loginLink: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
});
