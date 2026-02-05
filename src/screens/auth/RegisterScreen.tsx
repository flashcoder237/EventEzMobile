import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

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
  const { register, isLoading } = useAuth();
  const { showError } = useAlert();
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

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Le prénom est requis';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Le nom est requis';
    }

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

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      await register({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        phone_number: formData.phone_number.trim() || undefined,
        password: formData.password,
        confirm_password: formData.confirm_password,
      });
    } catch (error: any) {
      const errorData = error.response?.data;
      let message = 'Une erreur est survenue lors de l\'inscription';

      if (errorData) {
        if (errorData.email) {
          message = Array.isArray(errorData.email) ? errorData.email[0] : 'Cet email est déjà utilisé';
        } else if (errorData.username) {
          message = Array.isArray(errorData.username) ? errorData.username[0] : 'Ce nom d\'utilisateur est déjà pris';
        } else if (errorData.password) {
          message = Array.isArray(errorData.password)
            ? errorData.password.join('\n')
            : errorData.password;
        } else if (errorData.detail) {
          message = errorData.detail;
        } else if (errorData.non_field_errors) {
          message = Array.isArray(errorData.non_field_errors)
            ? errorData.non_field_errors[0]
            : errorData.non_field_errors;
        }
      }

      showError('Erreur d\'inscription', message);
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
        getInputStyle(field, !!errors[field]),
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Background decoration */}
      <View style={styles.backgroundDecoration}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>
                Rejoignez EventEz et découvrez les meilleurs événements
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
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

              {/* Phone */}
              <View style={styles.inputContainer}>
                {renderInput('phone_number', 'Téléphone (optionnel)', 'call-outline', {
                  keyboardType: 'phone-pad',
                })}
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

              {/* Register Button */}
              <GradientButton
                onPress={handleRegister}
                title="Créer mon compte"
                loading={isLoading}
                icon={<Ionicons name="arrow-forward" size={20} color={Colors.white} />}
                size="xl"
                fullWidth
                style={styles.registerButton}
              />
            </View>

            {/* Organizer Registration Link */}
            <View style={styles.organizerContainer}>
              <AnimatedPressable
                onPress={() => navigation.navigate('RegisterOrganizer')}
                style={styles.organizerButton}
                animationType="lift"
                scaleValue={0.98}
              >
                <View style={styles.organizerIconContainer}>
                  <Ionicons name="megaphone" size={24} color={Colors.secondary} />
                </View>
                <View style={styles.organizerTextContainer}>
                  <Text style={styles.organizerTitle}>Vous êtes organisateur ?</Text>
                  <Text style={styles.organizerSubtitle}>Créez et gérez vos événements</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
              </AnimatedPressable>
            </View>

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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.primary,
    opacity: 0.05,
  },
  decorativeCircle2: {
    position: 'absolute',
    top: 50,
    left: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.secondary,
    opacity: 0.04,
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
    marginBottom: Spacing.xl,
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
  registerButton: {
    marginTop: Spacing.lg,
  },
  organizerContainer: {
    marginTop: Spacing['2xl'],
  },
  organizerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
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
    ...TextStyles.body,
    color: Colors.gray500,
  },
  loginLink: {
    ...TextStyles.bodyBold,
    color: Colors.primary,
  },
});
