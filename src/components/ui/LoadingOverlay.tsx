/**
 * LoadingOverlay - Full-screen loading overlay for blocking operations.
 *
 * USAGE: Only for operations where the user MUST wait (payments, form submissions).
 * For non-blocking loading, prefer Skeleton or inline ActivityIndicator.
 */

import React, { memo } from 'react';

import BrandLoader from './BrandLoader';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, FontFamily, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface LoadingOverlayProps {
  /** Afficher l'overlay */
  visible: boolean;
  /** Message de chargement */
  message?: string;
  /** Utiliser un modal (plein ecran) */
  fullScreen?: boolean;
  /** Taille de l'indicateur */
  size?: 'small' | 'large';
  /** Couleur de l'indicateur */
  color?: string;
  /** Style personnalise */
  style?: ViewStyle;
  /** Fond transparent */
  transparent?: boolean;
}

function LoadingOverlayComponent({
  visible,
  message,
  fullScreen = true,
  size = 'large',
  color,
  style,
  transparent = true,
}: LoadingOverlayProps) {
  const { colors, isDark } = useTheme();
  const indicatorColor = color || colors.primary;

  if (!visible) return null;

  const content = (
    <View style={[styles.content, { backgroundColor: colors.card }, !transparent && [styles.contentSolid, { backgroundColor: colors.card }]]}>
      <ActivityIndicator size={size} color={indicatorColor} />
      {message && <Text style={[styles.message, { color: colors.gray700 }]}>{message}</Text>}
    </View>
  );

  if (fullScreen) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={[styles.overlay, style]}>
          {content}
        </View>
      </Modal>
    );
  }

  return (
    <View style={[styles.inlineContainer, style]}>
      {content}
    </View>
  );
}

/**
 * Composant de chargement inline simple
 */
interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  style?: ViewStyle;
}

export function LoadingSpinner({
  size = 'large',
  color,
  message,
  style,
}: LoadingSpinnerProps) {
  // ANIMATION DE MARQUE au lieu de la roue du système.
  //
  // DEMANDE (2026-10-07) : « Animation de chargement d'écran ». Tous les
  // écrans affichaient l'`ActivityIndicator` d'Android — la même roue grise
  // que dans n'importe quelle application. On branche ici plutôt que de
  // modifier la centaine d'appelants : chaque écran en bénéficie sans
  // changement.
  return (
    <BrandLoader
      message={message}
      dotSize={size === 'small' ? 7 : 10}
      style={style}
      color={color}
    />
  );
}

/**
 * Composant de chargement pour les listes (footer)
 */
interface ListLoadingFooterProps {
  visible: boolean;
}

export function ListLoadingFooter({ visible }: ListLoadingFooterProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.listFooter}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

/**
 * Composant de chargement pour pull-to-refresh
 */
interface RefreshIndicatorProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export function useRefreshControl({ refreshing, onRefresh }: RefreshIndicatorProps) {
  const { colors } = useTheme();

  return {
    refreshing,
    onRefresh,
    tintColor: colors.primary,
    colors: [colors.primary],
    progressBackgroundColor: colors.card,
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    ...Shadows.xl,
    minWidth: 120,
  },
  contentSolid: {
    backgroundColor: Colors.white,
  },
  message: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  inlineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
  },
  spinnerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  spinnerMessage: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  listFooter: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export const LoadingOverlay = memo(LoadingOverlayComponent);
export default LoadingOverlay;
