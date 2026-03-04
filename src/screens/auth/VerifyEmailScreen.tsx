import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { authAPI } from '../../api/client';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
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
import DotPattern from '../../components/ui/DotPattern';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
type RoutePropType = RouteProp<AuthStackParamList, 'VerifyEmail'>;

const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { email } = route.params;
  const { colors, isDark, gradients } = useTheme();
  const { showSuccess, showError } = useAlert();

  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (resendLoading || cooldown > 0) return;
    setResendLoading(true);
    try {
      await authAPI.resendVerificationEmail(email);
      showSuccess(
        'Email envoyé',
        `Un nouveau lien de vérification a été envoyé à ${email}.`
      );
      setCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Impossible d'envoyer l'email. Veuillez réessayer.";
      showError('Erreur', message);
    } finally {
      setResendLoading(false);
    }
  }, [email, resendLoading, cooldown, showSuccess, showError]);

  const maskedEmail = (() => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.length > 2 ? local.slice(0, 2) : local[0] || '';
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <DotPattern opacity={isDark ? 0.02 : 0.04} />

      {/* Top accent bar */}
      <LinearGradient
        colors={[...gradients.brand] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Back button */}
        <AnimatedPressable
          onPress={() => navigation.navigate('Login')}
          style={[styles.backButton, { backgroundColor: colors.gray50 }]}
          animationType="scale"
          scaleValue={0.9}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray800} />
        </AnimatedPressable>

        <View style={styles.content}>
          {/* Envelope icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
            <LinearGradient
              colors={[...gradients.brand] as [string, string]}
              style={styles.iconGradient}
            >
              <Ionicons name="mail" size={40} color={Colors.white} />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.gray900 }]}>
            Vérifiez votre email
          </Text>
          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            Nous avons envoyé un lien de vérification à
          </Text>
          <View style={[styles.emailBadge, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
            <Ionicons name="mail-outline" size={14} color={colors.primary} />
            <Text style={[styles.emailText, { color: colors.primary }]} numberOfLines={1}>
              {maskedEmail}
            </Text>
          </View>

          {/* Steps */}
          <View style={[styles.stepsCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
            {[
              { icon: 'mail-open-outline', text: 'Ouvrez votre boîte mail' },
              { icon: 'link-outline', text: 'Cliquez sur le lien de vérification' },
              { icon: 'checkmark-circle-outline', text: 'Connectez-vous à votre compte' },
            ].map((step, i) => (
              <View key={i} style={[styles.step, i < 2 && { borderBottomWidth: 1, borderBottomColor: colors.gray100 }]}>
                <View style={[styles.stepIcon, { backgroundColor: `${colors.primary}12` }]}>
                  <Ionicons name={step.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>{step.text}</Text>
              </View>
            ))}
          </View>

          {/* Resend section */}
          <View style={styles.resendSection}>
            <Text style={[styles.resendLabel, { color: colors.gray500 }]}>
              Vous n'avez pas reçu l'email ?
            </Text>

            {cooldown > 0 ? (
              <View style={[styles.cooldownBadge, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="time-outline" size={14} color={colors.gray500} />
                <Text style={[styles.cooldownText, { color: colors.gray500 }]}>
                  Réessayer dans {cooldown}s
                </Text>
              </View>
            ) : (
              <GradientButton
                title={resendLoading ? 'Envoi...' : 'Renvoyer le lien'}
                onPress={handleResend}
                disabled={resendLoading}
                icon={
                  resendLoading
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Ionicons name="refresh" size={18} color={Colors.white} />
                }
                size="md"
                style={styles.resendButton}
              />
            )}
          </View>

          {/* Spam hint */}
          <View style={[styles.hintCard, { backgroundColor: colors.warningLight, borderColor: colors.warning + '30' }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
            <Text style={[styles.hintText, { color: colors.warning }]}>
              Pensez à vérifier vos spams ou courriers indésirables.
            </Text>
          </View>
        </View>

        {/* Wrong email? */}
        <TouchableOpacity
          style={styles.wrongEmailRow}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.wrongEmailText, { color: colors.gray500 }]}>
            Mauvais email ?{' '}
          </Text>
          <Text style={[styles.wrongEmailLink, { color: colors.primary }]}>
            Retour à la connexion
          </Text>
        </TouchableOpacity>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  iconGradient: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontFamily: FontFamily.displayExtraBold,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing['2xl'],
    maxWidth: '90%',
  },
  emailText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
  },
  stepsCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
  },
  resendSection: {
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  resendLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
  },
  resendButton: {
    width: '100%',
  },
  cooldownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  cooldownText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    width: '100%',
  },
  hintText: {
    flex: 1,
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    lineHeight: FontSizes.xs * 1.6,
  },
  wrongEmailRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  wrongEmailText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
  },
  wrongEmailLink: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
  },
});
