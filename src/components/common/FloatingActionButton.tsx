/**
 * FloatingActionButton — boutons flottants calés AU-DESSUS du dock (tab bar).
 *
 * Deux exports :
 *  - `ScrollTopFab`  : bouton « remonter en haut » (chevron), à afficher quand
 *    `visible` (piloté par le scroll). Discret, secondaire.
 *  - `PrimaryFab`    : bouton d'action principal (style WhatsApp « nouveau
 *    message »), toujours visible, coloré primary.
 *
 * Le positionnement `bottom` tient compte du dock custom du MainTabNavigator
 * (DOCK_HEIGHT 64 + safe-area) pour ne JAMAIS chevaucher le menu. Sur les écrans
 * SANS tab bar (poussés dans un stack), passer `hasTabBar={false}`.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../contexts/ThemeContext';
import { Shadows, Spacing } from '../../constants/theme';

// Hauteur du dock custom (cf. MainTabNavigator DOCK_HEIGHT).
const DOCK_HEIGHT = 64;

/**
 * @param hasTabBar        l'écran a le dock (tab bar) → remonter au-dessus.
 * @param safeAreaHandled  le conteneur applique DÉJÀ le safe-area bottom
 *   (ex. SafeAreaView edges=['bottom']) → ne pas re-compter insets.bottom.
 */
function useBottomOffset(hasTabBar: boolean, safeAreaHandled: boolean, extra: number) {
  const insets = useSafeAreaInsets();
  const safe = safeAreaHandled ? 0 : Math.max(insets.bottom, 12);
  if (hasTabBar) {
    // Au-dessus du dock : dock + (safe area) + marges internes du dock.
    return DOCK_HEIGHT + safe + 20 + extra;
  }
  return safe + Spacing.lg + extra;
}

interface ScrollTopFabProps {
  visible: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  hasTabBar?: boolean;
  safeAreaHandled?: boolean;
  /** Décalage vertical additionnel (ex. pour empiler au-dessus d'un PrimaryFab). */
  extraBottom?: number;
}

export function ScrollTopFab({
  visible, onPress, accessibilityLabel, hasTabBar = true, safeAreaHandled = false, extraBottom = 0,
}: ScrollTopFabProps) {
  const { colors } = useTheme();
  const bottom = useBottomOffset(hasTabBar, safeAreaHandled, 8 + extraBottom);
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      style={[styles.fabWrap, { bottom }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={[styles.scrollTopBtn, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="chevron-up" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface PrimaryFabProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  hasTabBar?: boolean;
  safeAreaHandled?: boolean;
  style?: ViewStyle;
}

export function PrimaryFab({
  onPress, icon, accessibilityLabel, hasTabBar = true, safeAreaHandled = false, style,
}: PrimaryFabProps) {
  const { colors } = useTheme();
  const bottom = useBottomOffset(hasTabBar, safeAreaHandled, 8);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[styles.fabWrap, styles.primaryBtn, { bottom, backgroundColor: colors.primary }, Shadows.dramatic, style]}
    >
      <Ionicons name={icon} size={26} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: Spacing.lg,
  },
  scrollTopBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.dramatic,
  },
  primaryBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
