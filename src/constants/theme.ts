// EventEz Design System - Modern & Elegant
// Typography: Montserrat (body), System bold for titles

export const Colors = {
  // Primary Gradient (Violet to Rose)
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#8B5CF6',
  secondary: '#D946EF',
  secondaryDark: '#C026D3',
  secondaryLight: '#E879F9',

  // Accent
  accent: '#A855F7',

  // Gradient Colors
  gradientStart: '#7C3AED',
  gradientMiddle: '#A855F7',
  gradientEnd: '#D946EF',
  gradientHoverStart: '#6D28D9',
  gradientHoverEnd: '#C026D3',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Grays - Refined palette
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',

  // Semantic Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',

  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#DC2626',

  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoDark: '#2563EB',

  // Background Colors
  background: '#FAFAFA',
  backgroundDark: '#0F0F0F',
  surface: '#FFFFFF',
  surfaceDark: '#1A1A1A',
  card: '#FFFFFF',
  border: '#E5E5E5',

  // Text
  text: '#171717',
  textSecondary: '#525252',
  textLight: '#737373',
  textInverse: '#FFFFFF',

  // Primary backgrounds
  primaryBg: '#F5F3FF',
  primaryBgLight: '#FAF5FF',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',

  // Violet shadows
  shadowViolet: 'rgba(124, 58, 237, 0.25)',
  shadowVioletStrong: 'rgba(124, 58, 237, 0.35)',
  violetGlow: 'rgba(124, 58, 237, 0.4)',
};

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 14,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
};

export const FontWeights = {
  light: '300' as const,
  normal: '400' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  base: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  full: 9999,
};

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  '2xl': {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  violet: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  violetLg: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHover: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};

// Typography presets (Montserrat style)
export const Typography = {
  // Display - For hero titles
  displayLarge: {
    fontSize: FontSizes['5xl'],
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['5xl'] * 1.1,
    letterSpacing: -1,
  },
  displayMedium: {
    fontSize: FontSizes['4xl'],
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['4xl'] * 1.15,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['3xl'] * 1.2,
    letterSpacing: -0.25,
  },

  // Headlines
  h1: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['3xl'] * 1.2,
    letterSpacing: -0.25,
  },
  h2: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['2xl'] * 1.25,
    letterSpacing: 0,
  },
  h3: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.xl * 1.3,
    letterSpacing: 0,
  },
  h4: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.lg * 1.35,
    letterSpacing: 0.1,
  },

  // Body
  bodyLarge: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.base * 1.6,
    letterSpacing: 0.15,
  },
  body: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.md * 1.5,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.sm * 1.5,
    letterSpacing: 0.4,
  },

  // Labels & Captions
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    lineHeight: FontSizes.sm * 1.4,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    lineHeight: FontSizes.xs * 1.4,
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.xs * 1.4,
    letterSpacing: 0.4,
  },

  // Button text
  button: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.base * 1.2,
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.sm * 1.2,
    letterSpacing: 0.5,
  },
};

// Animation durations
export const Animations = {
  fastest: 100,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
  slowest: 700,
};

// Card presets
export const CardPresets = {
  eventFeatured: {
    width: 300,
    height: 380,
    borderRadius: BorderRadius['2xl'],
  },
  eventCard: {
    width: 280,
    height: 340,
    borderRadius: BorderRadius.xl,
  },
  eventCardSmall: {
    width: 200,
    height: 260,
    borderRadius: BorderRadius.lg,
  },
  eventCardHorizontal: {
    width: '100%' as const,
    height: 140,
    borderRadius: BorderRadius.xl,
  },
  categoryCard: {
    width: 100,
    height: 120,
    borderRadius: BorderRadius.lg,
  },
};

// Gradient presets for LinearGradient
export const Gradients = {
  primary: [Colors.gradientStart, Colors.gradientEnd] as const,
  primaryThree: [Colors.gradientStart, Colors.gradientMiddle, Colors.gradientEnd] as const,
  primaryHover: [Colors.gradientHoverStart, Colors.gradientHoverEnd] as const,
  dark: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'] as const,
  darkStrong: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'] as const,
  light: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)'] as const,
  surface: [Colors.white, Colors.gray50] as const,
};

// Theme object for easy access
const theme = {
  colors: Colors,
  fontSizes: FontSizes,
  fontWeights: FontWeights,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  typography: Typography,
  animations: Animations,
  cardPresets: CardPresets,
  gradients: Gradients,
};

export default theme;
