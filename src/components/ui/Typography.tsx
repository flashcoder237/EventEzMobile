import React from 'react';
import { Text, TextProps, TextStyle, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSizes } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type TypographyVariant =
  | 'hero'
  | 'heroSm'
  | 'editorial'
  | 'eyebrow'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'bodyBold'
  | 'small'
  | 'smallBold'
  | 'caption'
  | 'label'
  | 'button';

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  center?: boolean;
  children: React.ReactNode;
}

// Color mapping per variant: which theme color key to use
const variantColorMap: Record<TypographyVariant, 'gray900' | 'gray700' | 'gray600' | 'gray500' | 'accent' | 'white'> = {
  hero: 'gray900',
  heroSm: 'gray900',
  editorial: 'gray900',
  eyebrow: 'accent',
  h1: 'gray900',
  h2: 'gray900',
  h3: 'gray900',
  h4: 'gray900',
  body: 'gray700',
  bodyBold: 'gray900',
  small: 'gray600',
  smallBold: 'gray700',
  caption: 'gray500',
  label: 'gray700',
  button: 'white',
};

export default function Typography({
  variant = 'body',
  color,
  center,
  style,
  children,
  ...props
}: TypographyProps) {
  const { colors } = useTheme();
  const variantStyle = baseStyles[variant];
  const themeColor = color || colors[variantColorMap[variant]];

  return (
    <Text
      style={[
        variantStyle,
        { color: themeColor },
        center && { textAlign: 'center' },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const baseStyles = StyleSheet.create({
  // ===== EDITORIAL - Dramatic display styles =====
  hero: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: -2,
  },
  heroSm: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.5,
  },
  editorial: {
    fontFamily: FontFamily.displayBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
  },
  eyebrow: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ===== HEADINGS - Funnel Display =====
  h1: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['4xl'],
    lineHeight: FontSizes['4xl'] * 1.2,
    letterSpacing: -1,
  },
  h2: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    lineHeight: FontSizes['2xl'] * 1.2,
    letterSpacing: -0.5,
  },
  h3: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.xl,
    lineHeight: FontSizes.xl * 1.3,
  },
  h4: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    lineHeight: FontSizes.lg * 1.3,
  },

  // ===== BODY - Montserrat =====
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    lineHeight: FontSizes.base * 1.5,
  },
  bodyBold: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    lineHeight: FontSizes.base * 1.5,
  },
  small: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    lineHeight: FontSizes.sm * 1.4,
  },
  smallBold: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    lineHeight: FontSizes.sm * 1.4,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    lineHeight: FontSizes.xs * 1.4,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    lineHeight: FontSizes.sm * 1.4,
  },
  button: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    letterSpacing: 0.3,
  },
});

// Export styles for direct use if needed
export const TypographyStyles = baseStyles;
