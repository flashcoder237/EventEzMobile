import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useGoogleAuth, useAppleAuth } from '../../hooks/useSocialAuth';
import { AuthStackParamList } from '../../types';
import {
  Colors,
  Gradients,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';
import { extractErrorMessage } from '../../lib/utils/errorHandling';
import { validators, FormErrors } from '../../lib/validation';
import { LinearGradient } from 'expo-linear-gradient';
import GradientButton from '../../components/ui/GradientButton';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import DotPattern from '../../components/ui/DotPattern';

const REMEMBER_ME_KEY = 'eventez_remember_me';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login, isLoading, setUser } = useAuth();
  const { showError } = useAlert();
  const { colors, isDark, gradients } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors<'email' | 'password'>>({});

  useEffect(() => {
    const loadRememberMe = async () => {
      try {
        const saved = await SecureStore.getItemAsync(REMEMBER_ME_KEY);
        if (saved !== null) {
          setRememberMe(saved === 'true');
        }
      } catch (error) {
        console.warn('Erreur lors du chargement de la préférence:', error);
      }
    };
    loadRememberMe();
  }, []);

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

  const handleGoogleSignIn = async () => {
    const result = await googleSignIn();
    if (result.success && result.user) {
      await setUser(result.user);
    } else if (result.error && result.error !== 'Connexion annulée') {
      showError('Erreur Google', result.error);
    }
  };

  const handleAppleSignIn = async () => {
    const result = await appleSignIn();
    if (result.success && result.user) {
      await setUser(result.user);
    } else if (result.error && result.error !== 'Connexion annulée') {
      showError('Erreur Apple', result.error);
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
    try {
      await SecureStore.setItemAsync(REMEMBER_ME_KEY, rememberMe.toString());
      await login(email.trim().toLowerCase(), password, rememberMe);
    } catch (error: any) {
      console.log('[Login] Error:', error.response?.status, error.response?.data);
      const message = extractErrorMessage(error);
      showError('Erreur de connexion', message);
    }
  };

  const getInputStyle = (field: string, hasError: boolean) => {
    if (hasError) return styles.inputError;
    if (focusedField === field) return styles.inputFocused;
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Dot pattern background */}
      <DotPattern opacity={isDark ? 0.02 : 0.04} />

      {/* Top accent bar — gradient violet→pink */}
      <LinearGradient
        colors={gradients.brand as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAwareScrollView
          style={styles.keyboardView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={20}
        >
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
            <Text style={[styles.title, { color: colors.gray900 }]}>Bon retour !</Text>
            <Text style={[styles.subtitle, { color: colors.gray500 }]}>
              Connectez-vous pour découvrir les meilleurs événements
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
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
            >
              <View style={[styles.checkbox, { borderColor: colors.gray300, backgroundColor: isDark ? colors.gray100 : colors.white }, rememberMe && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                )}
              </View>
              <Text style={[styles.rememberMeText, { color: colors.gray600 }]}>Se souvenir de moi</Text>
            </AnimatedPressable>

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
              disabled={!googleReady || googleLoading || isLoading}
              animationType="lift"
              scaleValue={0.98}
              haptic="light"
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
                disabled={appleLoading || isLoading}
                animationType="lift"
                scaleValue={0.98}
                haptic="light"
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

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={[styles.registerText, { color: colors.gray500 }]}>Pas encore de compte ?</Text>
            <AnimatedPressable
              onPress={() => navigation.navigate('Register')}
              animationType="scale"
              scaleValue={0.95}
            >
              <Text style={[styles.registerLink, { color: colors.primary }]}> Créer un compte</Text>
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
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
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
  loginButton: {
    marginTop: Spacing.sm,
    ...Shadows.coloredPrimary,
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
});
