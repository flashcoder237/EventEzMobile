import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../api/client';
import { useAlert } from '../../contexts/AlertContext';
import { AuthStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import GradientButton from '../../components/ui/GradientButton';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import DotPattern from '../../components/ui/DotPattern';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type RouteProps = RouteProp<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { showError, showSuccess } = useAlert();
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
        'Lien invalide',
        'Ce lien de reinitialisation est invalide ou a expire. Veuillez faire une nouvelle demande.'
      );
    } finally {
      setIsValidating(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password.trim()) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'La confirmation est requise';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
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
      showSuccess('Mot de passe modifie avec succes !');
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.password) {
        const msg = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        setErrors({ password: msg });
      } else if (errorData?.token) {
        showError('Erreur', 'Le lien a expire. Veuillez faire une nouvelle demande.');
      } else if (errorData?.detail) {
        showError('Erreur', errorData.detail);
      } else {
        showError('Erreur', 'Une erreur est survenue. Veuillez reessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state - validating token
  if (isValidating) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Verification du lien...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Invalid token state
  if (!isTokenValid) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.centerContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="close-circle-outline" size={48} color={Colors.error} />
          </View>
          <Text style={styles.errorTitle}>Lien invalide</Text>
          <Text style={styles.errorDescription}>
            Ce lien de reinitialisation est invalide ou a expire. Veuillez faire une nouvelle demande de reinitialisation de mot de passe.
          </Text>
          <GradientButton
            title="Nouvelle demande"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.actionButton}
            fullWidth
          />
          <AnimatedPressable
            onPress={() => navigation.navigate('Login')}
            animationType="scale"
            scaleValue={0.95}
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>Retour a la connexion</Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.centerContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Mot de passe modifie !</Text>
          <Text style={styles.successText}>
            Votre mot de passe a ete reinitialise avec succes. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </Text>
          <GradientButton
            title="Se connecter"
            onPress={() => navigation.navigate('Login')}
            style={styles.actionButton}
            icon={<Ionicons name="log-in-outline" size={20} color={Colors.white} />}
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  // Main form
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

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={40} color={Colors.primary} />
            </View>
          </View>

          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>
              Choisissez un nouveau mot de passe securise pour votre compte.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.gray400} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Minimum 8 caracteres"
                  placeholderTextColor={Colors.gray400}
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
                    color={Colors.gray400}
                  />
                </AnimatedPressable>
              </View>
              {errors.password && (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={14} color={Colors.error} />
                  <Text style={styles.fieldErrorText}>{errors.password}</Text>
                </View>
              )}
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.gray400} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Retapez le mot de passe"
                  placeholderTextColor={Colors.gray400}
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
                    color={Colors.gray400}
                  />
                </AnimatedPressable>
              </View>
              {errors.confirmPassword && (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={14} color={Colors.error} />
                  <Text style={styles.fieldErrorText}>{errors.confirmPassword}</Text>
                </View>
              )}
            </View>

            {/* Password requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Le mot de passe doit contenir :</Text>
              <PasswordRequirement
                met={password.length >= 8}
                text="Au moins 8 caracteres"
              />
              <PasswordRequirement
                met={/[A-Z]/.test(password)}
                text="Une lettre majuscule"
              />
              <PasswordRequirement
                met={/[a-z]/.test(password)}
                text="Une lettre minuscule"
              />
              <PasswordRequirement
                met={/\d/.test(password)}
                text="Un chiffre"
              />
            </View>

            <GradientButton
              onPress={handleSubmit}
              title="Reinitialiser le mot de passe"
              loading={isLoading}
              icon={<Ionicons name="checkmark-circle" size={20} color={Colors.white} />}
              size="xl"
              fullWidth
              style={styles.submitButton}
            />
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Vous vous souvenez ?</Text>
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

// Password requirement indicator component
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.requirementRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? Colors.success : Colors.gray400}
      />
      <Text style={[styles.requirementText, met && styles.requirementMet]}>
        {text}
      </Text>
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
    paddingBottom: Spacing['2xl'],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    marginTop: Spacing.md,
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
  title: {
    fontSize: FontSizes['3xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
    textAlign: 'center',
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
  submitButton: {
    marginTop: Spacing.md,
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
  // Error state (invalid token)
  errorTitle: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: FontSizes.base * 1.5,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    marginTop: Spacing.lg,
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
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: FontSizes.base,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: FontSizes.base * 1.5,
    marginBottom: Spacing.md,
  },
});
