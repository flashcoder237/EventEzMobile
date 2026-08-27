/**
 * UserBadges — pastilles de statut affichées à côté d'un nom d'utilisateur.
 *
 * POURQUOI : le KYC organisateur (pièces d'identité, 24–48 h de revue) ne
 * produisait AUCUN signal visible pour l'acheteur. La donnée
 * (`organizer_profile.verified_status`) remontait déjà jusqu'au mobile mais
 * n'était rendue nulle part hors écran d'admin — toute la valeur de confiance
 * de la vérification était perdue à l'endroit exact où elle compte : au moment
 * de choisir chez qui acheter un billet.
 *
 * DEUX BADGES DISTINCTS, jamais confondus :
 *  - `verified` : identité contrôlée (KYC). Signal de SÉCURITÉ.
 *  - `pioneer`  : a testé l'app avant son lancement. Signal d'ANCIENNETÉ.
 * Un pionnier sans KYC ne doit hériter d'aucun signal de confiance : les deux
 * sont donc calculés depuis des champs séparés et rendus séparément.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily } from '../../constants/theme';

/** Forme minimale acceptée : on lit à la fois le user et son profil imbriqué. */
export interface BadgeableUser {
  is_verified?: boolean;
  is_pioneer?: boolean;
  organizer_profile?: { verified_status?: boolean; verified?: boolean } | null;
}

export type BadgeSize = 'sm' | 'md';

/**
 * Vrai si l'identité de l'organisateur a été vérifiée.
 *
 * On accepte les trois provenances car l'API ne renvoie pas la même forme
 * partout : `organizer_profile.verified_status` (profil complet),
 * `.verified` (variante abrégée de certains sérialiseurs) et `is_verified`
 * (champ User, synchronisé par signal côté backend).
 */
export function isUserVerified(u?: BadgeableUser | null): boolean {
  if (!u) return false;
  return Boolean(
    u.organizer_profile?.verified_status ||
    u.organizer_profile?.verified ||
    u.is_verified,
  );
}

export function isUserPioneer(u?: BadgeableUser | null): boolean {
  return Boolean(u?.is_pioneer);
}

interface Props {
  user?: BadgeableUser | null;
  size?: BadgeSize;
  /** Masque le libellé : seule l'icône est rendue (listes denses). */
  iconOnly?: boolean;
  style?: ViewStyle;
}

export default function UserBadges({ user, size = 'sm', iconOnly = false, style }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const verified = isUserVerified(user);
  const pioneer = isUserPioneer(user);
  if (!verified && !pioneer) return null;

  const iconSize = size === 'sm' ? 12 : 14;
  const fontSize = size === 'sm' ? 10 : 11;

  const pill = (
    key: string,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    label: string,
  ) => (
    <View
      key={key}
      style={[
        styles.pill,
        { backgroundColor: `${color}1A` },
        iconOnly && styles.pillIconOnly,
      ]}
      // Le badge porte une information de confiance : il doit être annoncé
      // aux lecteurs d'écran même en mode `iconOnly`.
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={iconSize} color={color} />
      {!iconOnly && (
        <Text style={[styles.label, { color, fontSize }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.row, style]}>
      {verified &&
        pill(
          'verified',
          'shield-checkmark',
          colors.success,
          t('badges.verified', { defaultValue: 'Vérifié' }),
        )}
      {pioneer &&
        pill(
          'pioneer',
          'rocket',
          '#A855F7', // violet secondaire de la marque
          t('badges.pioneer', { defaultValue: 'Pionnier' }),
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillIconOnly: {
    paddingHorizontal: 4,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.2,
  },
});
