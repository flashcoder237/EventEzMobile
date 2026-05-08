import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { User, RootStackParamList } from '../../types';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Suggestion {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  cta: string;
  /** Plus eleve = plus prioritaire */
  priority: number;
  onPress: (nav: NavigationProp) => void;
}

interface Props {
  user: User | null;
  /** Wallet de l'organisateur, si disponible (pour suggerer config payout) */
  wallet?: { bank_name?: string; mobile_money_number?: string } | null;
  isOrganizer: boolean;
}

/**
 * Construit la liste des suggestions selon l'etat du compte.
 * Plus la priorite est haute, plus c'est critique.
 */
function buildSuggestions(
  user: User | null,
  wallet: Props['wallet'],
  isOrganizer: boolean,
  t: (k: string, opts?: any) => string,
): Suggestion[] {
  if (!user) return [];

  const list: Suggestion[] = [];

  // Critique : organisateur sans wallet configure → ne peut pas recevoir d'argent
  if (
    isOrganizer &&
    wallet &&
    !wallet.bank_name?.trim() &&
    !wallet.mobile_money_number?.trim()
  ) {
    list.push({
      id: 'wallet-config',
      icon: 'wallet-outline',
      title: t('componentsProfile.suggestWalletTitle'),
      message: t('componentsProfile.suggestWalletMessage'),
      cta: t('componentsProfile.suggestWalletCta'),
      priority: 100,
      onPress: (nav) => nav.navigate('Wallet'),
    });
  }

  // Important : compte non verifie → bloque la creation d'evenements pour les organisateurs
  if (!user.is_verified) {
    list.push({
      id: 'verify-account',
      icon: 'shield-checkmark-outline',
      title: t('componentsProfile.suggestVerifyTitle'),
      message: isOrganizer
        ? t('componentsProfile.suggestVerifyMessageOrganizer')
        : t('componentsProfile.suggestVerifyMessageDefault'),
      cta: t('componentsProfile.suggestVerifyCta'),
      priority: 90,
      onPress: (nav) => nav.navigate('Verification'),
    });
  }

  // Bonus : profil incomplet (pas de photo)
  if (!user.profile_picture && !(user as any).image) {
    list.push({
      id: 'add-photo',
      icon: 'camera-outline',
      title: t('componentsProfile.suggestPhotoTitle'),
      message: t('componentsProfile.suggestPhotoMessage'),
      cta: t('componentsProfile.suggestPhotoCta'),
      priority: 30,
      onPress: (nav) => nav.navigate('EditProfile'),
    });
  }

  // Bonus : pas de bio / phone
  if (!(user as any).bio?.trim?.() && !(user as any).phone_number?.trim?.()) {
    list.push({
      id: 'complete-profile',
      icon: 'person-outline',
      title: t('componentsProfile.suggestCompleteTitle'),
      message: t('componentsProfile.suggestCompleteMessage'),
      cta: t('componentsProfile.suggestCompleteCta'),
      priority: 20,
      onPress: (nav) => nav.navigate('EditProfile'),
    });
  }

  return list.sort((a, b) => b.priority - a.priority);
}

/**
 * Compte le nombre d'etapes "completion profil" remplies sur le total.
 * Sert a afficher la progression dans le bandeau.
 */
function profileCompleteness(user: User | null, wallet: Props['wallet'], isOrganizer: boolean) {
  if (!user) return { done: 0, total: 1 };

  const checks: boolean[] = [
    !!user.email,
    !!(user.first_name?.trim() || user.last_name?.trim()),
    !!(user.profile_picture || (user as any).image),
    !!(user as any).phone_number?.trim?.(),
    !!user.is_verified,
  ];

  if (isOrganizer) {
    checks.push(!!(wallet?.bank_name?.trim() || wallet?.mobile_money_number?.trim()));
  }

  return {
    done: checks.filter(Boolean).length,
    total: checks.length,
  };
}

export default function ProfileSuggestionBanner({ user, wallet, isOrganizer }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const suggestions = useMemo(
    () => buildSuggestions(user, wallet, isOrganizer, t),
    [user, wallet, isOrganizer, t]
  );

  const { done, total } = useMemo(
    () => profileCompleteness(user, wallet, isOrganizer),
    [user, wallet, isOrganizer]
  );

  if (suggestions.length === 0) return null;

  const top = suggestions[0];
  const progressPct = total > 0 ? (done / total) * 100 : 0;
  const accentColor = top.priority >= 90 ? '#F59E0B' : top.priority >= 50 ? '#0EA5E9' : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isDark ? `${accentColor}1F` : `${accentColor}12`,
          borderColor: `${accentColor}33`,
        },
      ]}
      onPress={() => top.onPress(navigation)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${top.title}. ${top.message}. ${top.cta}.`}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>
          <Ionicons name={top.icon} size={20} color="#FFFFFF" />
        </View>

        <View style={styles.textCol}>
          <View style={styles.headerRow}>
            <Text style={[styles.eyebrow, { color: accentColor }]}>{t('componentsProfile.suggestEyebrow')}</Text>
            <Text style={[styles.completeness, { color: colors.gray500 }]}>
              {t('componentsProfile.suggestStepsLabel', { done, total })}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.gray900 }]} numberOfLines={1}>
            {top.title}
          </Text>
          <Text style={[styles.message, { color: colors.gray600 }]} numberOfLines={2}>
            {top.message}
          </Text>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: `${accentColor}22` }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: accentColor, width: `${progressPct}%` },
              ]}
            />
          </View>
        </View>

        <View style={[styles.cta, { backgroundColor: accentColor }]}>
          <Text style={styles.ctaText}>{top.cta}</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  completeness: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
