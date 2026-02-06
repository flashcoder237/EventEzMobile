/**
 * Composant ErrorState
 * Affiche un etat d'erreur standardise avec option de retry
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import GradientButton from './GradientButton';

interface ErrorStateProps {
  /** Titre de l'erreur */
  title?: string;
  /** Message d'erreur detaille */
  message?: string;
  /** Callback pour reessayer */
  onRetry?: () => void;
  /** Texte du bouton retry */
  retryLabel?: string;
  /** Icone a afficher */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Taille de l'icone */
  iconSize?: number;
  /** Style personnalise */
  style?: ViewStyle;
  /** Afficher dans une carte */
  withCard?: boolean;
  /** Afficher le bouton retry */
  showRetry?: boolean;
}

function ErrorStateComponent({
  title = 'Oups !',
  message = 'Une erreur est survenue. Veuillez reessayer.',
  onRetry,
  retryLabel = 'Reessayer',
  icon = 'alert-circle-outline',
  iconSize = 64,
  style,
  withCard = false,
  showRetry = true,
}: ErrorStateProps) {
  const content = (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={iconSize} color={Colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {showRetry && onRetry && (
        <View style={styles.actionContainer}>
          <GradientButton
            title={retryLabel}
            onPress={onRetry}
            variant="outline"
            size="md"
            iconLeft="refresh-outline"
          />
        </View>
      )}
    </>
  );

  if (withCard) {
    return (
      <View style={[styles.card, style]}>
        {content}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['3xl'],
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error + '20',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.error + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: Spacing.xl,
  },
});

export const ErrorState = memo(ErrorStateComponent);
export default ErrorState;
