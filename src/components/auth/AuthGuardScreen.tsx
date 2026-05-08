import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { EditorialButton } from '../ui/editorial';
import { RootStackParamList } from '../../types';
import {
  SaveToBookmarks,
  OnlinePayments,
  Authentication,
  NewMessage,
  AnimatedIllustration,
} from '../illustrations';

type IllustrationKey = 'bookmark' | 'ticket' | 'profile' | 'message';

const illustrationMap: Record<IllustrationKey, React.FC<{ color: string; size: number }>> = {
  bookmark: SaveToBookmarks,
  ticket: OnlinePayments,
  profile: Authentication,
  message: NewMessage,
};

interface AuthGuardScreenProps {
  illustration?: IllustrationKey;
  /** Override du titre. Si absent, on utilise la clé i18n par défaut selon `illustration`. */
  title?: string;
  /** Override du sous-titre. Si absent, on utilise la clé i18n par défaut. */
  subtitle?: string;
}

// Mapping illustration → clé i18n par défaut. Permet aux callers de juste passer
// `illustration` et de récupérer un titre+sous-titre cohérents (utile pour les
// 4 wrappers de tabs qui ont chacun leur copy dédiée dans authGuard.*).
const defaultI18nKeys: Record<IllustrationKey, { title: string; subtitle: string }> = {
  bookmark: { title: 'authGuard.savedTitle', subtitle: 'authGuard.savedSubtitle' },
  message: { title: 'authGuard.messagesTitle', subtitle: 'authGuard.messagesSubtitle' },
  ticket: { title: 'authGuard.ticketsTitle', subtitle: 'authGuard.ticketsSubtitle' },
  profile: { title: 'authGuard.profileTitle', subtitle: 'authGuard.profileSubtitle' },
};

export default function AuthGuardScreen({ illustration = 'profile', title, subtitle }: AuthGuardScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();

  const Illustration = illustrationMap[illustration];
  const defaults = defaultI18nKeys[illustration];
  const displayTitle = title ?? t(defaults.title);
  const displaySubtitle = subtitle ?? t(defaults.subtitle);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <AnimatedIllustration entry="scaleIn" idle="float">
          <View style={[styles.illustrationContainer, { backgroundColor: colors.primaryBg }]}>
            <Illustration color={colors.primary} size={140} />
          </View>
        </AnimatedIllustration>

        <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('authGuard.eyebrow')}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{displayTitle}</Text>
        <Text style={[styles.subtitle, { color: colors.gray500 }]}>{displaySubtitle}</Text>

        <View style={styles.actions}>
          {/* Cohérence avec LoginScreen : style éditorial pilule + eyebrow.
              "Entrer" / "Se connecter" — même couple que le CTA du LoginScreen
              pour une transition visuelle continue. */}
          <EditorialButton
            label={t('authGuard.loginCta')}
            eyebrow={t('componentsAuth.guardEnter')}
            onPress={() => navigation.navigate('Login')}
            variant="primary"
            fullWidth
          />
          <EditorialButton
            label={t('authGuard.registerCta')}
            onPress={() => navigation.navigate('Register')}
            variant="secondary"
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
  illustrationContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
});
