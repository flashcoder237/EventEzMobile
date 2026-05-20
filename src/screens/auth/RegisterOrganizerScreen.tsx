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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { authAPI, setTokens } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
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
  TextStyles,
} from '../../constants/theme';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import { EditorialCanvas, EditorialPillCTA, WatermarkNumeral } from '../../components/ui/editorial';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RegisterOrganizer'>;

type OrganizerType = 'individual' | 'organization';

interface FormData {
  // Étape 1 - Type et infos
  organizer_type: OrganizerType;
  first_name: string;
  last_name: string;
  company_name: string;
  registration_number: string;
  phone: string;
  // Étape 2 - Identifiants
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  registration_number?: string;
  phone?: string;
  username?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
}

export default function RegisterOrganizerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { setUser } = useAuth();
  const { showError, showAlert } = useAlert();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    organizer_type: 'individual',
    first_name: '',
    last_name: '',
    company_name: '',
    registration_number: '',
    phone: '',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field as keyof FormErrors]) {
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

  const validateStep1 = () => {
    const newErrors: FormErrors = {};

    if (formData.organizer_type === 'individual') {
      if (!formData.first_name.trim()) {
        newErrors.first_name = t('validation.firstNameRequired');
      }
      if (!formData.last_name.trim()) {
        newErrors.last_name = t('validation.lastNameRequired');
      }
    } else {
      if (!formData.company_name.trim()) {
        newErrors.company_name = t('auth.registerOrganizerErrorCompanyRequired');
      }
      if (!formData.registration_number.trim()) {
        newErrors.registration_number = t('auth.registerOrganizerErrorSiretRequired');
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('auth.registerOrganizerErrorPhoneRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: FormErrors = {};

    // Username OPTIONNEL : on ne valide le format que si l'utilisateur a saisi
    // quelque chose. Vide → le backend génère un username unique depuis l'email.
    if (formData.username.trim()) {
      if (formData.username.length < 3) {
        newErrors.username = t('auth.registerOrganizerErrorUsernameShort');
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = t('auth.registerOrganizerErrorUsernameInvalid');
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('auth.registerOrganizerErrorPasswordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.registerOrganizerErrorPasswordShort');
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = t('auth.passwordsDontMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;

    setIsLoading(true);
    try {
      const registrationData = {
        organizer_type: formData.organizer_type,
        first_name: formData.organizer_type === 'individual' ? formData.first_name.trim() : formData.company_name.trim(),
        last_name: formData.organizer_type === 'individual' ? formData.last_name.trim() : '',
        company_name: formData.organizer_type === 'organization' ? formData.company_name.trim() : undefined,
        registration_number: formData.organizer_type === 'organization' ? formData.registration_number.trim() : undefined,
        phone: formData.phone.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      };

      // Inscription organisateur. Le backend renvoie directement
      // {access, refresh, user, requires_verification} → pas besoin d'un
      // login() + getCurrentUser() séparés (évite 2 appels API redondants
      // et le risque qu'un échoue APRÈS la création du compte, laissant
      // l'utilisateur avec un compte mais une erreur à l'écran).
      const response = await authAPI.registerOrganizer(registrationData);
      const { access, refresh, user } = response.data || {};
      if (access && refresh) {
        await setTokens(access, refresh);
      }
      if (user) {
        await setUser(user);
      }

      // L'alerte de succès doit déclencher la navigation vers l'écran de
      // vérification email sur OK — showSuccess() n'expose pas de callback,
      // donc on passe par showAlert() avec un bouton onPress. Sans ça
      // l'utilisateur tape OK et reste bloqué sur le formulaire.
      const targetEmail = response.data?.email ?? user?.email ?? formData.email.trim().toLowerCase();
      showAlert(
        t('auth.registerOrganizerSuccessTitle'),
        t('auth.registerOrganizerSuccessDetail'),
        [{
          text: t('common.ok'),
          onPress: () => {
            navigation.replace('VerifyEmail', { email: targetEmail, skippable: true });
          },
        }],
        'success',
      );
    } catch (error: any) {
      const errorData = error.response?.data;
      let message = t('auth.registerOrganizerErrorGeneric');

      if (errorData) {
        if (errorData.email) {
          message = Array.isArray(errorData.email) ? errorData.email[0] : t('auth.registerOrganizerErrorEmailUsed');
        } else if (errorData.username) {
          message = Array.isArray(errorData.username) ? errorData.username[0] : t('auth.registerOrganizerErrorUsernameTaken');
        } else if (errorData.password) {
          message = Array.isArray(errorData.password) ? errorData.password.join('\n') : errorData.password;
        } else if (errorData.detail) {
          message = errorData.detail;
        } else if (errorData.non_field_errors) {
          message = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
        }
      }

      showError(t('auth.registerError'), message);
    } finally {
      setIsLoading(false);
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
      style={[
        styles.inputWrapper,
        { backgroundColor: colors.gray50, borderColor: colors.gray200 },
        getInputStyle(field, !!errors[field as keyof FormErrors]),
      ]}
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
      />
      {options?.showPasswordToggle && (
        <AnimatedPressable
          onPress={options.onTogglePassword}
          style={styles.eyeButton}
          animationType="scale"
          scaleValue={0.9}
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

  const renderTypeSelector = () => (
    <View style={styles.typeSelectorContainer}>
      <Text style={[styles.sectionLabel, { color: colors.gray700 }]}>{t('auth.registerOrganizerTypeLabel')}</Text>
      <View style={styles.typeOptions}>
        <AnimatedPressable
          onPress={() => updateField('organizer_type', 'individual')}
          style={[
            styles.typeOption,
            { borderColor: colors.gray200, backgroundColor: colors.card },
            formData.organizer_type === 'individual' && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
          ]}
          animationType="scale"
          scaleValue={0.98}
        >
          <View style={[
            styles.typeIconContainer,
            { backgroundColor: colors.gray100 },
            formData.organizer_type === 'individual' && { backgroundColor: colors.primary },
          ]}>
            <Ionicons
              name="person"
              size={24}
              color={formData.organizer_type === 'individual' ? colors.white : colors.gray500}
            />
          </View>
          <Text style={[
            styles.typeOptionTitle,
            { color: colors.gray700 },
            formData.organizer_type === 'individual' && { color: colors.primary },
          ]}>
            {t('auth.registerOrganizerIndividual')}
          </Text>
          <Text style={[styles.typeOptionDescription, { color: colors.gray500 }]}>
            {t('auth.registerOrganizerIndividualSubtitle')}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => updateField('organizer_type', 'organization')}
          style={[
            styles.typeOption,
            { borderColor: colors.gray200, backgroundColor: colors.card },
            formData.organizer_type === 'organization' && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
          ]}
          animationType="scale"
          scaleValue={0.98}
        >
          <View style={[
            styles.typeIconContainer,
            { backgroundColor: colors.gray100 },
            formData.organizer_type === 'organization' && { backgroundColor: colors.primary },
          ]}>
            <Ionicons
              name="business"
              size={24}
              color={formData.organizer_type === 'organization' ? colors.white : colors.gray500}
            />
          </View>
          <Text style={[
            styles.typeOptionTitle,
            { color: colors.gray700 },
            formData.organizer_type === 'organization' && { color: colors.primary },
          ]}>
            {t('auth.registerOrganizerCompany')}
          </Text>
          <Text style={[styles.typeOptionDescription, { color: colors.gray500 }]}>
            {t('auth.registerOrganizerCompanySubtitle')}
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.form}>
      {renderTypeSelector()}

      {formData.organizer_type === 'individual' ? (
        <>
          {/* Name Row */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              {renderInput('first_name', t('auth.firstName'), 'person-outline', {
                autoCapitalize: 'words',
              })}
              {errors.first_name && (
                <Text style={styles.errorText}>{errors.first_name}</Text>
              )}
            </View>
            <View style={styles.halfInput}>
              {renderInput('last_name', t('auth.lastName'), 'person-outline', {
                autoCapitalize: 'words',
              })}
              {errors.last_name && (
                <Text style={styles.errorText}>{errors.last_name}</Text>
              )}
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Company Name */}
          <View style={styles.inputContainer}>
            {renderInput('company_name', t('auth.registerOrganizerCompanyName'), 'business-outline', {
              autoCapitalize: 'words',
            })}
            {errors.company_name && (
              <Text style={styles.errorText}>{errors.company_name}</Text>
            )}
          </View>

          {/* Registration Number */}
          <View style={styles.inputContainer}>
            {renderInput('registration_number', t('auth.registerOrganizerSiret'), 'document-text-outline')}
            {errors.registration_number && (
              <Text style={styles.errorText}>{errors.registration_number}</Text>
            )}
          </View>
        </>
      )}

      {/* Phone */}
      <View style={styles.inputContainer}>
        {renderInput('phone', t('auth.phone'), 'call-outline', {
          keyboardType: 'phone-pad',
        })}
        {errors.phone && (
          <Text style={styles.errorText}>{errors.phone}</Text>
        )}
      </View>

      <View style={styles.submitButtonWrap}>
        <EditorialPillCTA
          eyebrow={t('auth.registerOrganizerNextEyebrow')}
          label={t('auth.registerOrganizerNext')}
          onPress={handleNextStep}
          icon="arrow-forward"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.form}>
      {/* Username — optionnel, pré-rempli depuis l'email */}
      <View style={styles.inputContainer}>
        {renderInput('username', t('auth.usernameOptional'), 'at-outline')}
        {errors.username && (
          <Text style={styles.errorText}>{errors.username}</Text>
        )}
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        {renderInput('email', t('auth.emailPlaceholder'), 'mail-outline', {
          keyboardType: 'email-address',
          onChangeText: handleEmailChange,
        })}
        {errors.email && (
          <Text style={styles.errorText}>{errors.email}</Text>
        )}
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
          <Text style={styles.errorText}>{errors.password}</Text>
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
          <Text style={styles.errorText}>{errors.confirm_password}</Text>
        )}
      </View>

      {/* Terms */}
      <Text style={[styles.termsText, { color: colors.gray500 }]}>
        {t('auth.termsAcceptRegister')}{' '}
        <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => navigation.navigate('Terms')}>{t('auth.termsLink')}</Text> {t('auth.termsAnd')}{' '}
        <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => navigation.navigate('Privacy')}>{t('auth.privacyLink')}</Text>
      </Text>

      <View style={styles.buttonRow}>
        <AnimatedPressable
          onPress={() => setStep(1)}
          style={[styles.backStepButton, { backgroundColor: colors.gray100 }]}
          animationType="scale"
          scaleValue={0.95}
        >
          <Ionicons name="arrow-back" size={20} color={colors.gray600} />
          <Text style={[styles.backStepText, { color: colors.gray600 }]}>{t('auth.registerOrganizerStepBack')}</Text>
        </AnimatedPressable>

        <View style={styles.submitButtonFlex}>
          <EditorialPillCTA
            eyebrow={t('auth.registerOrganizerSubmitEyebrow')}
            label={t('auth.registerOrganizerSubmit')}
            onPress={handleRegister}
            loading={isLoading}
            icon="checkmark"
          />
        </View>
      </View>
    </View>
  );

  return (
    <EditorialCanvas>
      <WatermarkNumeral>PRO</WatermarkNumeral>
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
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('auth.registerOrganizerEyebrowStep', { step })}</Text>
          <Text style={[styles.title, { color: colors.gray900 }]}>{t('auth.registerOrganizerTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            {t('auth.registerOrganizerSubtitle')}
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.gray200 }]}>
            <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%', backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.gray500 }]}>{t('auth.registerOrganizerProgress', { step })}</Text>
        </View>

        {step === 1 ? renderStep1() : renderStep2()}

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: colors.gray500 }]}>{t('auth.hasAccount')}</Text>
          <AnimatedPressable
            onPress={() => navigation.replace('Login')}
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
    paddingBottom: Spacing['3xl'],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
    marginBottom: Spacing.md,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 160,
    height: 52,
  },
  headerContainer: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontFamily: FontFamily.displayExtraBold,
    marginBottom: Spacing.xs,
    letterSpacing: -1,
    lineHeight: 38,
  },
  subtitle: {
    ...TextStyles.body,
    color: Colors.gray500,
  },
  progressContainer: {
    marginBottom: Spacing.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  form: {
    gap: Spacing.md,
  },
  typeSelectorContainer: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeOption: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  typeIconContainerSelected: {
    backgroundColor: Colors.primary,
  },
  typeOptionTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  typeOptionTitleSelected: {
    color: Colors.primary,
  },
  typeOptionDescription: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    textAlign: 'center',
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
    borderRadius: BorderRadius.xl,
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
  errorText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  termsText: {
    ...TextStyles.small,
    color: Colors.gray500,
    lineHeight: FontSizes.sm * 1.6,
    marginTop: Spacing.sm,
  },
  termsLink: {
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
  submitButtonWrap: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  backStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.gray100,
  },
  backStepText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  submitButtonFlex: {
    flex: 1,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
  },
  loginText: {
    ...TextStyles.body,
    color: Colors.gray500,
  },
  loginLink: {
    ...TextStyles.bodyBold,
    color: Colors.primary,
  },
});
