/**
 * Composant LoadingOverlay
 * Affiche un overlay de chargement plein ecran ou inline
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ViewStyle,
} from 'react-native';
import { Colors, FontFamily, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

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
  color = Colors.primary,
  style,
  transparent = true,
}: LoadingOverlayProps) {
  if (!visible) return null;

  const content = (
    <View style={[styles.content, !transparent && styles.contentSolid]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
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
  color = Colors.primary,
  message,
  style,
}: LoadingSpinnerProps) {
  return (
    <View style={[styles.spinnerContainer, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.spinnerMessage}>{message}</Text>}
    </View>
  );
}

/**
 * Composant de chargement pour les listes (footer)
 */
interface ListLoadingFooterProps {
  visible: boolean;
}

export function ListLoadingFooter({ visible }: ListLoadingFooterProps) {
  if (!visible) return null;

  return (
    <View style={styles.listFooter}>
      <ActivityIndicator size="small" color={Colors.primary} />
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
  return {
    refreshing,
    onRefresh,
    tintColor: Colors.primary,
    colors: [Colors.primary],
    progressBackgroundColor: Colors.white,
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
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
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
