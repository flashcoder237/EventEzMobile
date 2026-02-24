/**
 * Composant EmptyState
 * Affiche un etat vide standardise avec icone, titre et action optionnelle
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import GradientButton from './GradientButton';

interface EmptyStateProps {
  /** Nom de l'icone Ionicons */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Titre principal */
  title: string;
  /** Description secondaire */
  description?: string;
  /** Texte du bouton d'action */
  actionLabel?: string;
  /** Callback du bouton d'action */
  onAction?: () => void;
  /** Variante du bouton */
  actionVariant?: 'primary' | 'secondary' | 'outline';
  /** Taille de l'icone */
  iconSize?: number;
  /** Couleur de l'icone */
  iconColor?: string;
  /** Style personnalise pour le container */
  style?: ViewStyle;
  /** Afficher dans une carte */
  withCard?: boolean;
}

function EmptyStateComponent({
  icon = 'folder-open-outline',
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  iconSize = 64,
  iconColor = Colors.gray300,
  style,
  withCard = false,
}: EmptyStateProps) {
  const content = (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={iconSize} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <GradientButton
            title={actionLabel}
            onPress={onAction}
            variant={actionVariant}
            size="md"
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
    ...Shadows.md,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray700,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: Spacing.xl,
  },
});

export const EmptyState = memo(EmptyStateComponent);
export default EmptyState;
