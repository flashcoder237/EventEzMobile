/**
 * Suggestion d'un état vide (R3 W2) : une phrase + une vraie action.
 *
 * Utilisée par `EmptyState` (prop `suggestion`) et sous les états vides
 * illustrés existants, pour que tous les vides parlent de la même façon.
 * `pulse` : ligne « 12 réservations à Douala aujourd'hui », fournie seulement
 * quand le serveur l'a renvoyée au-dessus de son seuil.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing } from '../../constants/theme';

export interface EmptySuggestionProps {
  text?: string | null;
  pulse?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

function EmptySuggestionComponent({ text, pulse, actionLabel, onAction, actionIcon = 'arrow-forward', style }: EmptySuggestionProps) {
  const { colors } = useTheme();
  if (!text && !pulse && !(actionLabel && onAction)) return null;
  return (
    <View style={[styles.wrap, style]} testID="empty-suggestion">
      {!!text && <Text style={[styles.text, { color: colors.gray500 }]}>{text}</Text>}
      {!!pulse && (
        <View style={styles.pulseRow}>
          <Ionicons name="pulse-outline" size={13} color={colors.accent} />
          <Text style={[styles.pulse, { color: colors.gray600 }]} numberOfLines={2}>
            {pulse}
          </Text>
        </View>
      )}
      {!!actionLabel && !!onAction && (
        <TouchableOpacity
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.action}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>{actionLabel}</Text>
          <Ionicons name={actionIcon} size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: 6,
    maxWidth: 300,
    alignSelf: 'center',
  },
  text: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  pulseRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulse: { fontFamily: FontFamily.medium, fontSize: 13, flexShrink: 1, textAlign: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  actionText: { fontFamily: FontFamily.semiBold, fontSize: 14 },
});

export const EmptySuggestion = memo(EmptySuggestionComponent);
export default EmptySuggestion;
