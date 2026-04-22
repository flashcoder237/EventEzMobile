import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import type { AIUsage } from '../../types';

interface AIUsageBadgeProps {
  usage: AIUsage | null;
}

export default function AIUsageBadge({ usage }: AIUsageBadgeProps) {
  const { colors, isDark } = useTheme();

  if (!usage) return null;

  const isUnlimited = usage.daily_limit === 0;
  const remaining = isUnlimited ? Infinity : usage.daily_limit - usage.daily_count;
  const ratio = isUnlimited ? 1 : remaining / usage.daily_limit;

  let bgColor = colors.successLight;
  let textColor = colors.successDark;
  if (!isUnlimited) {
    if (ratio <= 0) {
      bgColor = colors.errorLight;
      textColor = colors.errorDark;
    } else if (ratio <= 0.25) {
      bgColor = colors.warningLight;
      textColor = colors.warningDark;
    }
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Ionicons name="sparkles" size={12} color={textColor} />
      <Text style={[styles.text, { color: textColor }]}>
        {isUnlimited
          ? 'IA illimitée'
          : remaining <= 0
            ? 'Limite IA atteinte'
            : `${usage.daily_count}/${usage.daily_limit} IA`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
  },
  text: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
