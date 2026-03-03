import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: { value: number; label: string };
  subtitle?: string;
}

function KPICard({ title, value, icon, color, trend, subtitle }: KPICardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, Shadows.card]}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.value >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
            <Ionicons
              name={trend.value >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend.value >= 0 ? '#10B981' : '#EF4444'}
            />
            <Text style={[styles.trendText, { color: trend.value >= 0 ? '#10B981' : '#EF4444' }]}>
              {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: colors.gray900 }]}>{value}</Text>
      <Text style={[styles.title, { color: colors.gray500 }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.gray400 }]}>{subtitle}</Text>}
    </View>
  );
}

export default memo(KPICard);

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
  trendText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  value: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
  },
  title: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
});
