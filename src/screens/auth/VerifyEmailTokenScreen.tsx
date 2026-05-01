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
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

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
  const { isAuthenticated, user } = useAuth();
  const { showError } = useAlert();

  const [state, setState] = useState<VerifyState>('loading');
  const [resending, setResending] = useState(false);

  const verify = useCallback(async () => {
    if (!token) {
      setState('invalid');
      return;
    }
    try {
      await authAPI.verifyEmail(token);
      setState('success');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      setState(code === 'token_expired' ? 'expired' : 'invalid');
    }
  }, [token]);

  useEffect(() => {
    verify();
  }, [verify]);

  const goToLogin = useCallback(() => {
    // L'utilisateur peut déjà être authentifié sur l'app (cas où il a vérifié
    // son email depuis un autre device). On le renvoie alors directement sur
    // l'accueil, sinon sur Login.
    if (isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' as never }] });
    } else {
      navigation.navigate('Login');
    }
  }, [navigation, isAuthenticated]);

  const handleResend = useCallback(async () => {
    // On a un token expiré mais pas l'email associé. Si l'utilisateur est
    // connecté, on prend son email ; sinon on l'envoie sur l'écran de relance
    // qui lui demandera son email.
    const email = user?.email;
    if (!email) {
      navigation.navigate('VerifyEmail', {});
      return;
    }
    setResending(true);
    try {
      await authAPI.resendVerificationEmail(email);
      navigation.navigate('VerifyEmail', { email });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Impossible de renvoyer le lien.';
      showError('Erreur', msg);
    } finally {
      setResending(false);
    }
  }, [navigation, user?.email, showError]);

  return (
    <EditorialCanvas>
      <WatermarkNumeral>{state === 'success' ? '✓' : '!'}</WatermarkNumeral>
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
          {state === 'loading' && (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.eyebrow, { color: colors.accent }]}>VÉRIFICATION</Text>
              <Text style={[styles.title, { color: colors.gray900 }]}>Un instant…</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                On confirme ton adresse email avec le serveur.
              </Text>
            </>
          )}

          {state === 'success' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
              <Text style={[styles.eyebrow, { color: '#10B981' }]}>COMPTE ACTIVÉ</Text>
              <Text style={[styles.title, { color: colors.gray900 }]}>Email vérifié !</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                Ton adresse email est maintenant confirmée. Tu peux te connecter
                et accéder à ton compte.
              </Text>
              <View style={styles.ctaWrap}>
                <EditorialPillCTA
                  eyebrow="Continuer"
                  label={isAuthenticated ? 'Aller à l\'accueil' : 'Se connecter'}
                  onPress={goToLogin}
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
              <Text style={[styles.eyebrow, { color: '#F59E0B' }]}>LIEN EXPIRÉ</Text>
              <Text style={[styles.title, { color: colors.gray900 }]}>Trop tard…</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                Ce lien de vérification n'est plus valide. On peut t'en envoyer
                un nouveau immédiatement.
              </Text>
              <View style={styles.ctaWrap}>
                <EditorialPillCTA
                  eyebrow="Nouveau lien"
                  label={resending ? 'Envoi…' : 'Recevoir un nouveau lien'}
                  onPress={handleResend}
                  loading={resending}
                  disabled={resending}
                  icon="refresh"
                  tone="primary"
                />
              </View>
              <TouchableOpacity onPress={goToLogin} style={styles.secondaryLink}>
                <Text style={[styles.secondaryLinkText, { color: colors.gray500 }]}>
                  Retour à la connexion
                </Text>
              </TouchableOpacity>
            </>
          )}

          {state === 'invalid' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="close-circle" size={48} color="#EF4444" />
              </View>
              <Text style={[styles.eyebrow, { color: '#EF4444' }]}>LIEN INVALIDE</Text>
              <Text style={[styles.title, { color: colors.gray900 }]}>Hum…</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                Ce lien est invalide. Il a peut-être déjà été utilisé, ou il
                provient d'une ancienne adresse email.
              </Text>
              <View style={styles.ctaWrap}>
                <EditorialPillCTA
                  eyebrow="Continuer"
                  label="Retour à la connexion"
                  onPress={goToLogin}
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
