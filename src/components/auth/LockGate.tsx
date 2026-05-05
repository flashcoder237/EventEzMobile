// ============================================
// LockGate — overlay biométrique tant que l'app est en état 'locked'
// ============================================
//
// Wrap l'app après les autres providers. Si useAppLock retourne 'locked',
// affiche un écran plein écran qui demande à l'utilisateur de s'authentifier.
// Une fois authentifié, l'overlay disparaît et l'app reprend.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppLock } from '../../hooks/useAppLock';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

interface Props {
  children: React.ReactNode;
}

export default function LockGate({ children }: Props) {
  const { status, authenticate } = useAppLock();
  const { colors } = useTheme();

  // Tente l'auth automatiquement dès que l'écran lock est affiché. Si la
  // biométrie échoue ou l'utilisateur annule, on reste sur cet écran avec un
  // bouton "Réessayer".
  useEffect(() => {
    if (status === 'locked') {
      void authenticate();
    }
  }, [status, authenticate]);

  // États non-bloquants : on render directement les enfants
  if (status === 'idle' || status === 'unlocked' || status === 'unsupported') {
    return <>{children}</>;
  }

  // Status === 'locked' → overlay
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name="lock-closed" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>VERROUILLÉ</Text>
      <Text style={[styles.title, { color: colors.text }]}>EventEz est verrouillé</Text>
      <Text style={[styles.subtitle, { color: colors.gray500 }]}>
        Pour ta sécurité, utilise FaceID, l'empreinte digitale ou ton code de
        déverrouillage.
      </Text>
      <TouchableOpacity
        style={[styles.cta, { backgroundColor: colors.primary }]}
        onPress={authenticate}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Déverrouiller l'application"
      >
        <Ionicons name="finger-print" size={18} color={Colors.white} />
        <Text style={styles.ctaText}>Déverrouiller</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
    marginBottom: Spacing['2xl'],
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
  },
  ctaText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    color: Colors.white,
    letterSpacing: 0.4,
  },
});
