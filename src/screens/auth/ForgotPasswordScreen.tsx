import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../api/client';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AuthStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontFamily,
  TextStyles,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import GradientButton from '../../components/ui/GradientButton';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import DotPattern from '../../components/ui/DotPattern';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showError } = useAlert();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = () => {
    if (!email.trim()) {
      setError('L\'email est requis');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email invalide');
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
        showError('Erreur', Array.isArray(errorData.email) ? errorData.email[0] : errorData.email);
      } else if (errorData?.detail) {
        showError('Erreur', errorData.detail);
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.gray50 }]}>
            <Ionicons name="mail-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.successTitle, { color: colors.gray900 }]}>Email envoyé !</Text>
          <Text style={[styles.successText, { color: colors.gray600 }]}>
            Si un compte existe avec l'adresse {email}, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
          </Text>
          <Text style={[styles.successHint, { color: colors.gray400 }]}>
            Vérifiez également votre dossier spam.
          </Text>
          <GradientButton
            title="Retour à la connexion"
            onPress={() => navigation.navigate('Login')}
            style={styles.successButton}
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Dot pattern background */}
      <DotPattern opacity={isDark ? 0.02 : 0.04} />

      {/* Top accent bar */}
      <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />

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
              <Text style={[styles.title, { color: colors.gray900 }]}>Mot de passe oublié ?</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.gray700 }]}>Email</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }, error && [styles.inputError, { backgroundColor: colors.errorLight }]]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="mail-outline" size={20} color={colors.gray400} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: colors.gray900 }]}
                    placeholder="votre@email.com"
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

              <GradientButton
                onPress={handleSubmit}
                title="Envoyer le lien"
                loading={isLoading}
                icon={<Ionicons name="send" size={20} color={Colors.white} />}
                size="xl"
                fullWidth
                style={styles.submitButton}
              />
            </View>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.gray500 }]}>Vous vous souvenez ?</Text>
              <AnimatedPressable
                onPress={() => navigation.navigate('Login')}
                animationType="scale"
                scaleValue={0.95}
              >
                <Text style={[styles.loginLink, { color: colors.primary }]}> Se connecter</Text>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
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
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
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
