/**
 * Composant ErrorState
 * Affiche un etat d'erreur standardise avec option de retry
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FontFamily, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import GradientButton from './GradientButton';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  style?: ViewStyle;
  withCard?: boolean;
  showRetry?: boolean;
  /** Label d'accessibilite personnalise */
  accessibilityLabel?: string;
}

function ErrorStateComponent({
  title,
  message,
  onRetry,
  retryLabel,
  icon = 'alert-circle-outline',
  iconSize = 64,
  style,
  withCard = false,
  showRetry = true,
  accessibilityLabel: a11yLabel,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const resolvedTitle = title ?? t('componentsUI.errorTitle');
  const resolvedMessage = message ?? t('componentsUI.errorMessage');
  const resolvedRetryLabel = retryLabel ?? t('componentsUI.errorRetry');

  const content = (
    <>
      <View style={[styles.iconContainer, { backgroundColor: colors.errorBg }]}>
        <Ionicons name={icon} size={iconSize} color={colors.error} />
      </View>
      <Text style={[styles.title, { color: colors.gray900 }]}>{resolvedTitle}</Text>
      <Text style={[styles.message, { color: colors.gray600 }]}>{resolvedMessage}</Text>
      {showRetry && onRetry && (
        <View style={styles.actionContainer}>
          <GradientButton
            title={resolvedRetryLabel}
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
      <View
        accessibilityRole="alert"
        accessibilityLabel={a11yLabel || `${resolvedTitle}. ${resolvedMessage}`}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.error + '20' }, style]}
      >
        {content}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={a11yLabel || `${resolvedTitle}. ${resolvedMessage}`}
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
    borderWidth: 1,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  message: {
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

export const ErrorState = memo(ErrorStateComponent);
export default ErrorState;
