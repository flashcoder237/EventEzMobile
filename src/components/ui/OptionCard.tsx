import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, BorderRadius, Spacing } from '../../constants/theme';

interface OptionCardProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  active: boolean;
  onPress: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Card selector for multi-choice fields (visibility, payment method, ticket category...).
 * Icon in a circular wrap on top, bold semibold label, small description.
 * Active state fills icon-wrap with primary color, tints border + background.
 * Used across event creation (visibility) and any form needing a "pick one of N" pattern.
 */
function OptionCardComponent({
  icon,
  label,
  description,
  active,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
}: OptionCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint || description}
      style={[
        styles.card,
        {
          backgroundColor: active
            ? (isDark ? colors.primaryBg : colors.primaryBgLight)
            : colors.card,
          borderColor: active ? colors.primary : colors.gray200,
          shadowColor: isDark ? '#000000' : colors.primary,
          shadowOpacity: active ? (isDark ? 0.25 : 0.14) : 0,
        },
        style,
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: active ? colors.primary : colors.gray100 },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={active ? '#FFFFFF' : colors.gray500}
          />
        </View>
      ) : null}
      <Text
        style={[
          styles.label,
          {
            color: active ? colors.primary : colors.gray800,
            fontFamily: active ? FontFamily.bold : FontFamily.semiBold,
          },
        ]}
      >
        {label}
      </Text>
      {description ? (
        <Text
          style={[
            styles.description,
            { color: active ? colors.primary : colors.gray500 },
          ]}
        >
          {description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 0,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12.5,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: 'center',
  },
});

export const OptionCard = memo(OptionCardComponent);
export default OptionCard;
