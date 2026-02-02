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
} from '../../constants/theme';
import GradientButton from '../../components/ui/GradientButton';
import AnimatedPressable from '../../components/ui/AnimatedPressable';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login, isLoading } = useAuth();
  const { showError } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email invalide';
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error: any) {
      console.log('[Login] Error:', error.response?.status, error.response?.data);

      let message = 'Email ou mot de passe incorrect';
      const errorData = error.response?.data;

      if (errorData) {
        if (errorData.detail) {
          message = errorData.detail;
        } else if (errorData.email) {
          message = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
        } else if (errorData.password) {
          message = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        } else if (errorData.non_field_errors) {
          message = Array.isArray(errorData.non_field_errors)
            ? errorData.non_field_errors[0]
            : errorData.non_field_errors;
        } else if (error.response?.status === 400) {
          message = 'Données de connexion invalides. Vérifiez votre email et mot de passe.';
        } else if (error.response?.status === 401) {
          message = 'Email ou mot de passe incorrect';
        }
      } else if (error.message?.includes('Network Error')) {
        message = 'Erreur de connexion au serveur. Vérifiez votre connexion internet.';
      }

      showError('Erreur de connexion', message);
    }
  };

  const getInputStyle = (field: string, hasError: boolean) => {
    if (hasError) return styles.inputError;
    if (focusedField === field) return styles.inputFocused;
    return null;
  };

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
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Welcome Text */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.title}>Bon retour !</Text>
              <Text style={styles.subtitle}>
                Connectez-vous pour découvrir les meilleurs événements
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    getInputStyle('email', !!errors.email),
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={focusedField === 'email' ? Colors.primary : Colors.gray400}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="votre@email.com"
                    placeholderTextColor={Colors.gray400}
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
                  />
                </View>
                {errors.email && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={Colors.error} />
                    <Text style={styles.errorText}>{errors.email}</Text>
                  </View>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Mot de passe</Text>
                  <AnimatedPressable
                    onPress={() => navigation.navigate('ForgotPassword')}
                    animationType="scale"
                    scaleValue={0.95}
                  >
                    <Text style={styles.forgotPasswordText}>Oublié ?</Text>
                  </AnimatedPressable>
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    getInputStyle('password', !!errors.password),
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={focusedField === 'password' ? Colors.primary : Colors.gray400}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.gray400}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
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
                      color={Colors.gray400}
                    />
                  </AnimatedPressable>
                </View>
                {errors.password && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={Colors.error} />
                    <Text style={styles.errorText}>{errors.password}</Text>
                  </View>
                )}
              </View>

              {/* Login Button */}
              <GradientButton
                onPress={handleLogin}
                title="Se connecter"
                loading={isLoading}
                icon={<Ionicons name="arrow-forward" size={20} color={Colors.white} />}
                size="xl"
                fullWidth
                style={styles.loginButton}
              />
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou continuer avec</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login */}
            <View style={styles.socialButtons}>
              <AnimatedPressable
                style={styles.socialButton}
                animationType="lift"
                scaleValue={0.98}
              >
                <Ionicons name="logo-google" size={22} color="#DB4437" />
                <Text style={styles.socialButtonText}>Google</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.socialButton}
                animationType="lift"
                scaleValue={0.98}
              >
                <Ionicons name="logo-apple" size={22} color={Colors.gray900} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </AnimatedPressable>
            </View>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Pas encore de compte ?</Text>
              <AnimatedPressable
                onPress={() => navigation.navigate('Register')}
                animationType="scale"
                scaleValue={0.95}
              >
                <Text style={styles.registerLink}> Créer un compte</Text>
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logo: {
    width: 200,
    height: 65,
  },
  welcomeContainer: {
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: FontSizes['4xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
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
  loginButton: {
    marginTop: Spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing['2xl'],
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
    ...Shadows.sm,
  },
  socialButtonText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
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
});
