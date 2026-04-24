import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

type Tone = 'accent' | 'primary' | 'success' | 'warning';

interface EncouragementTipProps {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
}

const toneMap = (
  tone: Tone,
  colors: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
): { border: string; bg: string; fg: string } => {
  switch (tone) {
    case 'primary':
      return {
        border: colors.primary,
        bg: isDark ? colors.primaryBg : colors.primaryBgLight,
        fg: colors.primary,
      };
    case 'success':
      return {
        border: colors.success,
        bg: colors.successLight,
        fg: colors.success,
      };
    case 'warning':
      return {
        border: colors.warning,
        bg: colors.warningBg,
        fg: colors.warningDark,
      };
    case 'accent':
    default:
      return {
        border: colors.accent,
        bg: isDark ? colors.accentBg : '#FFF0F0',
        fg: colors.accent,
      };
  }
};

export default function EncouragementTip({
  title,
  message,
  icon = 'sparkles',
  tone = 'accent',
}: EncouragementTipProps) {
  const { colors, isDark } = useTheme();
  const { border, bg, fg } = toneMap(tone, colors, isDark);

  return (
    <View style={[styles.container, { backgroundColor: bg, borderLeftColor: border }]}>
      <Ionicons name={icon} size={18} color={fg} style={styles.icon} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.gray900 }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.gray700 }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm + 2,
    padding: Spacing.base,
    borderRadius: BorderRadius['2xl'],
    borderLeftWidth: 4,
  },
  icon: {
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    letterSpacing: -0.1,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs + 1,
    lineHeight: 18,
    marginTop: 2,
  },
});
