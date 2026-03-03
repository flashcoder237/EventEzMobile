import React, { memo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}

function ChartWrapper({ title, subtitle, children, rightAction }: ChartWrapperProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, Shadows.card]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.gray900 }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.gray500 }]}>{subtitle}</Text>}
        </View>
        {rightAction}
      </View>
      <View style={styles.chartArea}>
        {children}
      </View>
    </View>
  );
}

export { SCREEN_WIDTH };
export default memo(ChartWrapper);

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  chartArea: {
    alignItems: 'center',
  },
});
