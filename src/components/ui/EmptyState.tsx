/**
 * Composant EmptyState
 * Affiche un etat vide standardise avec icone, titre et action optionnelle
 */

import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import GradientButton from './GradientButton';
import { GradientIcon } from './motion';
import EmptySuggestion, { type EmptySuggestionProps } from './EmptySuggestion';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  /** Optional illustration ReactNode — replaces the icon when provided */
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'secondary' | 'outline';
  iconSize?: number;
  iconColor?: string;
  style?: ViewStyle;
  withCard?: boolean;
  /** Label d'accessibilite personnalise */
  accessibilityLabel?: string;
  /** R3 W2 — une phrase utile + une vraie action, sous le contenu principal. */
  suggestion?: EmptySuggestionProps;
}

function EmptyStateComponent({
  icon = 'folder-open-outline',
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  iconSize = 64,
  iconColor,
  style,
  withCard = false,
  accessibilityLabel: a11yLabel,
  suggestion,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const resolvedIconColor = iconColor || colors.gray300;
  // E18 — l'icône par défaut (sans couleur imposée) passe du gris au dégradé
  // de marque juste après l'apparition : un seul fondu, puis plus rien.
  const [iconLit, setIconLit] = useState(false);
  useEffect(() => {
    if (iconColor || illustration) return undefined;
    const tm = setTimeout(() => setIconLit(true), 450);
    return () => clearTimeout(tm);
  }, [iconColor, illustration]);

  const content = (
    <>
      {illustration ? (
        <View style={styles.illustrationContainer}>{illustration}</View>
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: colors.gray50 }]}>
          {iconColor ? (
            <Ionicons name={icon} size={iconSize} color={resolvedIconColor} />
          ) : (
            <GradientIcon name={icon} size={iconSize} active={iconLit} color={resolvedIconColor} />
          )}
        </View>
      )}
      <Text style={[styles.title, { color: colors.gray700 }]}>{title}</Text>
      {description && <Text style={[styles.description, { color: colors.gray500 }]}>{description}</Text>}
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
      {suggestion && <EmptySuggestion {...suggestion} />}
    </>
  );

  if (withCard) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={a11yLabel || `${title}${description ? `. ${description}` : ''}`}
        style={[styles.card, { backgroundColor: colors.surface }, Shadows.md, style]}
      >
        {content}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={a11yLabel || `${title}${description ? `. ${description}` : ''}`}
      style={[styles.container, style]}
    >
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
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
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
