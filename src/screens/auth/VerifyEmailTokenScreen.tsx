/**
 * VerifyEmailTokenScreen — consomme le token de vérification depuis le deep
 * link `https://eventez.online/verify-email/{token}` (Universal Link iOS /
 * App Link Android — cf. app.json intentFilters et AASA paths).
 *
 * À distinguer de `VerifyEmailScreen` qui est la page intermédiaire affichée
 * juste après l'inscription pour rappeler à l'utilisateur d'aller cliquer sur
 * le lien email. Ici, on est ARRIVÉ via le clic sur le lien, on a un token,
 * on l'envoie à l'API et on affiche le résultat.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { authAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { EditorialCanvas, WatermarkNumeral, EditorialPillCTA } from '../../components/ui/editorial';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'VerifyEmailToken'>;
type RoutePropType = RouteProp<RootStackParamList, 'VerifyEmailToken'>;

type VerifyState = 'loading' | 'success' | 'expired' | 'invalid';

export default function VerifyEmailTokenScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { token } = route.params || {};
  const { colors } = useTheme();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const { showError, showSuccess } = useAlert();
  const { t } = useTranslation();

  const [state, setState] = useState<VerifyState>('loading');
  const [resending, setResending] = useState(false);
  // Champ email inline pour le cas token expiré + non connecté (#5)
  const [fallbackEmail, setFallbackEmail] = useState('');

  const verify = useCallback(async () => {
    if (!token) {
      setState('invalid');
      return;
    }
    try {
      await authAPI.verifyEmail(token);
      setState('success');
      // Rafraîchir l'état local du user si connecté (#2) — évite que les
      // prochains dispatchAfterAuth redirigent encore vers VerifyEmail.
      if (isAuthenticated) {
        await refreshUser();
      }
    } catch (err: any) {
      const code = err?.response?.data?.code;
      setState(code === 'token_expired' ? 'expired' : 'invalid');
    } finally {
      // Sécurité : on retire le token des route.params dès qu'il a été consommé
      // (succès, expiré ou invalide — peu importe). Sans ça, le token persiste
      // dans la navigation state et donc dans le back stack — accessible si
      // l'app est laissée ouverte sur un device volé. Voir AUDIT §3.4.
      navigation.setParams({ token: undefined } as never);
    }
  }, [token, isAuthenticated, refreshUser, navigation]);

  useEffect(() => {
    verify();
  }, [verify]);

  const goHome = useCallback(() => {
    if (isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' as never }] });
    } else {
      navigation.navigate('Login');
    }
  }, [navigation, isAuthenticated]);

  const handleResend = useCallback(async () => {
    // Priorité : email du user connecté, sinon email saisi dans le champ inline.
    const email = user?.email || fallbackEmail.trim();
    if (!email || !email.includes('@')) {
      showError(t('auth.verifyTokenExpiredEmailRequired'), t('auth.verifyTokenExpiredEmailRequiredDetail'));
      return;
    }
    setResending(true);
    try {
      await authAPI.resendVerificationEmail(email);
      showSuccess(t('auth.verifyTokenExpiredResentTitle'), t('auth.verifyTokenExpiredResentDetail', { email }));
      navigation.navigate('VerifyEmail', { email });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || t('auth.verifyTokenExpiredResendError');
      showError(t('common.error'), msg);
    } finally {
      setResending(false);
    }
  }, [navigation, user?.email, fallbackEmail, showError, showSuccess]);

  return (
    <EditorialCanvas>
      <WatermarkNumeral>{state === 'success' ? '✓' : '!'}</WatermarkNumeral>
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
          {state === 'loading' && (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('auth.verifyTokenLoadingEyebrow')}</Text>
              <Text style={[styles.title, { color: colors.gray900 }]}>{t('auth.verifyTokenLoadingTitle')}</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                {t('auth.verifyTokenLoadingSubtitle')}
              </Text>
            </>
          )}

          {state === 'success' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
              <Text style={[styles.eyebrow, { color: '#10B981' }]}>{t('auth.verifyTokenSuccessEyebrow')}</Text>
              <Text style={[styles.title, { color: colors.gray900 }]}>{t('auth.verifyTokenSuccessTitleShort')}</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                {isAuthenticated ? t('auth.verifyTokenSuccessSubtitleAuth') : t('auth.verifyTokenSuccessSubtitleNoAuth')}
              </Text>
              <View style={styles.ctaWrap}>
                <EditorialPillCTA
                  eyebrow={t('auth.verifyTokenSuccessAction')}
                  label={isAuthenticated ? t('auth.verifyTokenSuccessHomeAuth') : t('auth.verifyTokenSuccessHomeNoAuth')}
                  onPress={goHome}
                  icon="arrow-forward"
                  tone="primary"
                />
              </View>
            </>
          )}

          {state === 'expired' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="time-outline" size={48} color="#F59E0B" />
              </View>
              <Text style={[styles.eyebrow, { color: '#F59E0B' }]}>{t('auth.verifyTokenExpiredEyebrow')}</Text>
              <Text style={[styles.title, { color: colors.gray900 }]}>{t('auth.verifyTokenExpiredTitle')}</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                {t('auth.verifyTokenExpiredSubtitle')}
              </Text>
              {/* Champ email inline quand non connecté — évite le tunnel sans issue (#5) */}
              {!isAuthenticated && !user?.email && (
                <TextInput
                  style={[styles.emailInput, { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.gray50 }]}
                  placeholder={t('auth.verifyTokenExpiredFallbackPlaceholder')}
                  placeholderTextColor={colors.gray400}
                  value={fallbackEmail}
                  onChangeText={setFallbackEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t('auth.verifyTokenExpiredFallbackAccessibility')}
                />
              )}
              <View style={styles.ctaWrap}>
                <EditorialPillCTA
                  eyebrow={t('auth.verifyTokenExpiredAction')}
                  label={resending ? t('auth.verifyTokenExpiredCTASending') : t('auth.verifyTokenExpiredCTA')}
                  onPress={handleResend}
                  loading={resending}
                  disabled={resending}
                  icon="refresh"
                  tone="primary"
                />
              </View>
              <TouchableOpacity onPress={goHome} style={styles.secondaryLink}>
                <Text style={[styles.secondaryLinkText, { color: colors.gray500 }]}>
                  {t('auth.verifyTokenExpiredBackToLogin')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {state === 'invalid' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="close-circle" size={48} color="#EF4444" />
              </View>
              <Text style={[styles.eyebrow, { color: '#EF4444' }]}>{t('auth.verifyTokenInvalidEyebrow')}</Text>
              <Text style={[styles.title, { color: colors.gray900 }]}>{t('auth.verifyTokenInvalidTitle')}</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                {t('auth.verifyTokenInvalidSubtitle')}
              </Text>
              <View style={styles.ctaWrap}>
                <EditorialPillCTA
                  eyebrow={t('auth.verifyTokenInvalidAction')}
                  label={t('auth.verifyTokenInvalidCTA')}
                  onPress={goHome}
                  icon="arrow-forward"
                  tone="primary"
                />
              </View>
            </>
          )}
        </View>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  card: {
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayExtraBold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: FontSizes.sm * 1.55,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  ctaWrap: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  emailInput: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    marginBottom: Spacing.sm,
  },
  secondaryLink: {
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  secondaryLinkText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
});
