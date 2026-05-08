// ============================================
// RoleGuard — wrapper pour les écrans réservés à un rôle backend
// ============================================
//
// Pattern repris de ModerationScreen.tsx (qui restera tel quel pour l'instant
// car son layout est plus spécifique). À utiliser sur AdminDashboardScreen,
// AuditLogsScreen, PlatformSettingsScreen, Treasury* — tous les écrans qui
// supposaient implicitement que la navigation depuis le profil suffisait.
//
// Ne pas confondre avec useAuthGuard : celui-ci gère l'absence d'auth (redirige
// vers Login). RoleGuard gère un user authentifié mais avec un rôle insuffisant.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { EditorialCanvas, WatermarkNumeral } from '../ui/editorial';
import { AccessDenied, AnimatedIllustration } from '../illustrations';
import { FontFamily, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

type Role = 'admin' | 'moderator' | 'organizer' | 'user';

interface RoleGuardProps {
  /** Rôles autorisés. `is_staff` et `is_superuser` côté backend sont aussi acceptés implicitement comme admin. */
  allow: Role[];
  /** Watermark décoratif (3-4 lettres). Default = premier rôle autorisé en majuscules. */
  watermark?: string;
  /** Eyebrow affiché au-dessus du titre. Default = ACCÈS RESTREINT. */
  eyebrow?: string;
  /** Titre du blocage. Default = Zone réservée. */
  title?: string;
  /** Message d'explication. Adapter selon le rôle pour clarifier qui peut accéder. */
  message?: string;
  children: React.ReactNode;
}

export default function RoleGuard({
  allow,
  watermark,
  eyebrow,
  title,
  message,
  children,
}: RoleGuardProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resolvedEyebrow = eyebrow ?? t('componentsAuth.roleAccessRestrictedEyebrow');
  const resolvedTitle = title ?? t('componentsAuth.roleZoneTitle');

  const userRole = (user?.role || 'user') as Role;
  // is_staff/is_superuser élèvent au rang admin pour les comptes Django créés
  // côté backoffice (ex: équipe support qui n'a pas explicitement role='admin').
  const isStaff = !!(user as any)?.is_staff || !!(user as any)?.is_superuser;
  const allowed = allow.includes(userRole) || (allow.includes('admin') && isStaff);

  if (allowed) {
    return <>{children}</>;
  }

  const wm = watermark || allow[0]?.toUpperCase().slice(0, 3) || 'OFF';
  const defaultMessage =
    allow.includes('admin') && allow.length === 1
      ? t('componentsAuth.roleAdminMessage')
      : allow.includes('moderator')
        ? t('componentsAuth.roleModeratorMessage')
        : t('componentsAuth.roleDefaultMessage');

  return (
    <EditorialCanvas edges={['top', 'bottom']}>
      <WatermarkNumeral>{wm}</WatermarkNumeral>
      <View style={styles.body}>
        <AnimatedIllustration entry="scaleIn" idle="float">
          <AccessDenied color={colors.primary} size={160} />
        </AnimatedIllustration>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>{resolvedEyebrow}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{resolvedTitle}</Text>
        <Text style={[styles.message, { color: colors.gray500 }]}>{message || defaultMessage}</Text>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.text }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('componentsAuth.roleBackA11y')}
        >
          <Text style={[styles.ctaText, { color: colors.background }]}>{t('componentsAuth.roleBack')}</Text>
        </TouchableOpacity>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: 6,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
    marginBottom: Spacing['2xl'],
  },
  cta: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.full,
  },
  ctaText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    letterSpacing: 0.4,
  },
});
