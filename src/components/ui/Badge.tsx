import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

function BadgeComponent({ label, variant = 'default', size = 'md', style, textStyle }: BadgeProps) {
  const { colors, isDark } = useTheme();

  const getVariantStyles = (): { bg: string; text: string; border?: string } => {
    switch (variant) {
      case 'default':
        return { bg: colors.primaryBg, text: colors.primary };
      case 'secondary':
        return { bg: colors.gray100, text: colors.gray700 };
      case 'destructive':
        return { bg: colors.errorBg, text: colors.error };
      case 'outline':
        return { bg: 'transparent', text: colors.gray700, border: colors.border };
      case 'success':
        return { bg: colors.successLight, text: isDark ? colors.successDark : colors.successDark };
      case 'warning':
        return { bg: colors.warningLight, text: isDark ? colors.warningDark : colors.warningDark };
      case 'info':
        return { bg: colors.infoLight, text: isDark ? colors.infoDark : colors.infoDark };
    }
  };

  const variantStyles = getVariantStyles();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyles.bg,
          paddingHorizontal: isSmall ? Spacing.sm : Spacing.md,
          paddingVertical: isSmall ? 2 : 4,
          borderWidth: variantStyles.border ? 1 : 0,
          borderColor: variantStyles.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: variantStyles.text,
            fontSize: isSmall ? FontSizes.xs : FontSizes.sm,
          },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.2,
  },
});

export const Badge = memo(BadgeComponent);
export default Badge;
