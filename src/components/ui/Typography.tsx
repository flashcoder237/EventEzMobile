import React from 'react';
import { Text, TextProps, TextStyle, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSizes } from '../../constants/theme';

type TypographyVariant =
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

/**
 * Composant Typography unifié
 *
 * Règles de polices (comme sur le web):
 * - Funnel Display: h1, h2, et tout texte "bold" (titres principaux)
 * - Montserrat: body, small, caption, labels (texte courant)
 *
 * Usage:
 * <Typography variant="h1">Titre principal</Typography>
 * <Typography variant="body">Texte normal</Typography>
 * <Typography variant="bodyBold">Texte important</Typography>
 */
export default function Typography({
  variant = 'body',
  color,
  center,
  style,
  children,
  ...props
}: TypographyProps) {
  const variantStyle = styles[variant];

  return (
    <Text
      style={[
        variantStyle,
        color && { color },
        center && { textAlign: 'center' },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  // ===== HEADINGS - Funnel Display =====
  h1: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['4xl'],
    color: Colors.gray900,
    lineHeight: FontSizes['4xl'] * 1.2,
  },
  h2: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    color: Colors.gray900,
    lineHeight: FontSizes['2xl'] * 1.2,
  },
  h3: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.xl,
    color: Colors.gray900,
    lineHeight: FontSizes.xl * 1.3,
  },
  h4: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
    lineHeight: FontSizes.lg * 1.3,
  },

  // ===== BODY - Montserrat =====
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray700,
    lineHeight: FontSizes.base * 1.5,
  },
  bodyBold: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    lineHeight: FontSizes.base * 1.5,
  },
  small: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: FontSizes.sm * 1.4,
  },
  smallBold: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    lineHeight: FontSizes.sm * 1.4,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    lineHeight: FontSizes.xs * 1.4,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    lineHeight: FontSizes.sm * 1.4,
  },
  button: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});

// Export des styles pour utilisation directe si besoin
export const TypographyStyles = styles;
