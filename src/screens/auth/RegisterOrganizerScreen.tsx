import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { authAPI, setTokens } from '../../api/client';
import { usersAPI } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { AuthStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';
import GradientButton from '../../components/ui/GradientButton';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import DotPattern from '../../components/ui/DotPattern';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'RegisterOrganizer'>;

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
  const { showError, showSuccess } = useAlert();
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
        newErrors.first_name = 'Le prénom est requis';
      }
      if (!formData.last_name.trim()) {
        newErrors.last_name = 'Le nom est requis';
      }
    } else {
      if (!formData.company_name.trim()) {
        newErrors.company_name = 'Le nom de l\'entreprise est requis';
      }
      if (!formData.registration_number.trim()) {
        newErrors.registration_number = 'Le numéro SIRET/RC est requis';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: FormErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Le nom d\'utilisateur est requis';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Minimum 3 caractères';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Lettres, chiffres et _ uniquement';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Minimum 8 caractères';
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Les mots de passe ne correspondent pas';
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

      // Inscription organisateur
      const response = await authAPI.registerOrganizer(registrationData);

      // Connexion automatique
      const loginResponse = await authAPI.login(formData.email.trim().toLowerCase(), formData.password);
      const { access, refresh } = loginResponse.data;
      await setTokens(access, refresh);

      // Récupérer l'utilisateur
      const userResponse = await usersAPI.getCurrentUser();
      await setUser(userResponse.data);

      showSuccess('Bienvenue !', 'Votre compte organisateur a été créé avec succès.');
    } catch (error: any) {
      const errorData = error.response?.data;
      let message = 'Une erreur est survenue lors de l\'inscription';

      if (errorData) {
        if (errorData.email) {
          message = Array.isArray(errorData.email) ? errorData.email[0] : 'Cet email est déjà utilisé';
        } else if (errorData.username) {
          message = Array.isArray(errorData.username) ? errorData.username[0] : 'Ce nom d\'utilisateur est déjà pris';
        } else if (errorData.password) {
          message = Array.isArray(errorData.password) ? errorData.password.join('\n') : errorData.password;
        } else if (errorData.detail) {
          message = errorData.detail;
        } else if (errorData.non_field_errors) {
          message = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
        }
      }

      showError('Erreur d\'inscription', message);
    } finally {
      setIsLoading(false);
    }
  };

  const getInputStyle = (field: string, hasError: boolean) => {
    if (hasError) return styles.inputError;
    if (focusedField === field) return styles.inputFocused;
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
        getInputStyle(field, !!errors[field as keyof FormErrors]),
      ]}
    >
      <View style={styles.inputIconContainer}>
        <Ionicons
          name={icon}
          size={20}
          color={focusedField === field ? Colors.primary : Colors.gray400}
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray400}
        value={formData[field]}
        onChangeText={options?.onChangeText || ((text) => updateField(field, text))}
        onFocus={() => setFocusedField(field)}
        onBlur={() => setFocusedField(null)}
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
            color={Colors.gray400}
          />
        </AnimatedPressable>
      )}
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.typeSelectorContainer}>
      <Text style={styles.sectionLabel}>Type d'organisateur</Text>
      <View style={styles.typeOptions}>
        <AnimatedPressable
          onPress={() => updateField('organizer_type', 'individual')}
          style={[
            styles.typeOption,
            formData.organizer_type === 'individual' && styles.typeOptionSelected,
          ]}
          animationType="scale"
          scaleValue={0.98}
        >
          <View style={[
            styles.typeIconContainer,
            formData.organizer_type === 'individual' && styles.typeIconContainerSelected,
          ]}>
            <Ionicons
              name="person"
              size={24}
              color={formData.organizer_type === 'individual' ? Colors.white : Colors.gray500}
            />
          </View>
          <Text style={[
            styles.typeOptionTitle,
            formData.organizer_type === 'individual' && styles.typeOptionTitleSelected,
          ]}>
            Particulier
          </Text>
          <Text style={styles.typeOptionDescription}>
            Organisateur indépendant
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => updateField('organizer_type', 'organization')}
          style={[
            styles.typeOption,
            formData.organizer_type === 'organization' && styles.typeOptionSelected,
          ]}
          animationType="scale"
          scaleValue={0.98}
        >
          <View style={[
            styles.typeIconContainer,
            formData.organizer_type === 'organization' && styles.typeIconContainerSelected,
          ]}>
            <Ionicons
              name="business"
              size={24}
              color={formData.organizer_type === 'organization' ? Colors.white : Colors.gray500}
            />
          </View>
          <Text style={[
            styles.typeOptionTitle,
            formData.organizer_type === 'organization' && styles.typeOptionTitleSelected,
          ]}>
            Organisation
          </Text>
          <Text style={styles.typeOptionDescription}>
            Entreprise / Association
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
              {renderInput('first_name', 'Prénom', 'person-outline', {
                autoCapitalize: 'words',
              })}
              {errors.first_name && (
                <Text style={styles.errorText}>{errors.first_name}</Text>
              )}
            </View>
            <View style={styles.halfInput}>
              {renderInput('last_name', 'Nom', 'person-outline', {
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
            {renderInput('company_name', 'Nom de l\'entreprise', 'business-outline', {
              autoCapitalize: 'words',
            })}
            {errors.company_name && (
              <Text style={styles.errorText}>{errors.company_name}</Text>
            )}
          </View>

          {/* Registration Number */}
          <View style={styles.inputContainer}>
            {renderInput('registration_number', 'Numéro SIRET / RC', 'document-text-outline')}
            {errors.registration_number && (
              <Text style={styles.errorText}>{errors.registration_number}</Text>
            )}
          </View>
        </>
      )}

      {/* Phone */}
      <View style={styles.inputContainer}>
        {renderInput('phone', 'Téléphone', 'call-outline', {
          keyboardType: 'phone-pad',
        })}
        {errors.phone && (
          <Text style={styles.errorText}>{errors.phone}</Text>
        )}
      </View>

      <GradientButton
        onPress={handleNextStep}
        title="Continuer"
        icon={<Ionicons name="arrow-forward" size={20} color={Colors.white} />}
        size="xl"
        fullWidth
        style={styles.submitButton}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.form}>
      {/* Username */}
      <View style={styles.inputContainer}>
        {renderInput('username', 'Nom d\'utilisateur', 'at-outline')}
        {errors.username && (
          <Text style={styles.errorText}>{errors.username}</Text>
        )}
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        {renderInput('email', 'votre@email.com', 'mail-outline', {
          keyboardType: 'email-address',
          onChangeText: handleEmailChange,
        })}
        {errors.email && (
          <Text style={styles.errorText}>{errors.email}</Text>
        )}
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        {renderInput('password', 'Mot de passe', 'lock-closed-outline', {
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
        {renderInput('confirm_password', 'Confirmer le mot de passe', 'lock-closed-outline', {
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
      <Text style={styles.termsText}>
        En vous inscrivant, vous acceptez nos{' '}
        <Text style={styles.termsLink}>Conditions d'utilisation</Text> et notre{' '}
        <Text style={styles.termsLink}>Politique de confidentialité</Text>
      </Text>

      <View style={styles.buttonRow}>
        <AnimatedPressable
          onPress={() => setStep(1)}
          style={styles.backStepButton}
          animationType="scale"
          scaleValue={0.95}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.gray600} />
          <Text style={styles.backStepText}>Retour</Text>
        </AnimatedPressable>

        <GradientButton
          onPress={handleRegister}
          title="Créer mon compte"
          loading={isLoading}
          icon={<Ionicons name="checkmark" size={20} color={Colors.white} />}
          size="lg"
          style={styles.submitButtonFlex}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Dot pattern background */}
      <DotPattern />

      {/* Top accent bar */}
      <View style={styles.accentBar} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAwareScrollView
          style={styles.keyboardView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={20}
          >
            {/* Back Button */}
            <AnimatedPressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              animationType="scale"
              scaleValue={0.9}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.gray800} />
            </AnimatedPressable>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Header */}
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Devenir Organisateur</Text>
              <Text style={styles.subtitle}>
                Créez et gérez vos propres événements sur EventEz
              </Text>
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
              </View>
              <Text style={styles.progressText}>Étape {step} sur 2</Text>
            </View>

            {step === 1 ? renderStep1() : renderStep2()}

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Déjà un compte ?</Text>
              <AnimatedPressable
                onPress={() => navigation.navigate('Login')}
                animationType="scale"
                scaleValue={0.95}
              >
                <Text style={styles.loginLink}> Se connecter</Text>
              </AnimatedPressable>
            </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
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
  title: {
    ...TextStyles.h1,
    fontSize: FontSizes['3xl'],
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
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
    backgroundColor: Colors.primaryLight,
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
  submitButton: {
    marginTop: Spacing.lg,
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
