/**
 * Composant EmptyState
 * Affiche un etat vide standardise avec icone, titre et action optionnelle
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import GradientButton from './GradientButton';

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
}: EmptyStateProps) {
  const { colors } = useTheme();
  const resolvedIconColor = iconColor || colors.gray300;

  const content = (
    <>
      {illustration ? (
        <View style={styles.illustrationContainer}>{illustration}</View>
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: colors.gray50 }]}>
          <Ionicons name={icon} size={iconSize} color={resolvedIconColor} />
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
    </>
  );

  if (withCard) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.md, style]}>
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
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.lg,
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
