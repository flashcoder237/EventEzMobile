import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import type { AIUsage } from '../../types';

interface AIUsageBadgeProps {
  usage: AIUsage | null;
}

export default function AIUsageBadge({ usage }: AIUsageBadgeProps) {
  if (!usage) return null;

  const isUnlimited = usage.daily_limit === 0;
  const remaining = isUnlimited ? Infinity : usage.daily_limit - usage.daily_count;
  const ratio = isUnlimited ? 1 : remaining / usage.daily_limit;

  let bgColor = '#DCFCE7';
  let textColor = '#16A34A';
  if (!isUnlimited) {
    if (ratio <= 0) {
      bgColor = '#FEE2E2';
      textColor = '#DC2626';
    } else if (ratio <= 0.25) {
      bgColor = '#FEF3C7';
      textColor = '#D97706';
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },
});
