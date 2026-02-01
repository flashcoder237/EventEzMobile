// EventEz Design System - Clean & Minimal
// Typography: Funnel Display (titles), Montserrat (body)

export const Colors = {
  // Primary - Clean violet accent (used sparingly)
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',

  // Secondary - Subtle accent
  secondary: '#EC4899',

  // Neutrals - White focused
  white: '#FFFFFF',
  black: '#000000',

  // Grays - Soft palette
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Semantic Colors
  success: '#22C55E',
  successLight: '#DCFCE7',
  successDark: '#16A34A',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',

  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#DC2626',

  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoDark: '#2563EB',

  // Background - Clean white
  background: '#FFFFFF',
  backgroundSecondary: '#FAFAFA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#F0F0F0',

  // Text
  text: '#212121',
  textSecondary: '#757575',
  textLight: '#9E9E9E',
  textInverse: '#FFFFFF',

  // Primary tints (very subtle)
  primaryBg: '#F5F3FF',
  primaryBgLight: '#FAFAFE',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Legacy support
  gradientStart: '#7C3AED',
  gradientMiddle: '#A855F7',
  gradientEnd: '#EC4899',
};

export const FontFamily = {
  // Titles - Funnel Display
  displayBold: 'FunnelDisplay-Bold',
  displaySemiBold: 'FunnelDisplay-SemiBold',
  displayMedium: 'FunnelDisplay-Medium',
  displayRegular: 'FunnelDisplay-Regular',

  // Body - Montserrat
  bold: 'Montserrat_700Bold',
  semiBold: 'Montserrat_600SemiBold',
  medium: 'Montserrat_500Medium',
  regular: 'Montserrat_400Regular',
  light: 'Montserrat_300Light',
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
};

export const FontWeights = {
  light: '300' as const,
  normal: '400' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
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
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  xl: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
};

// Gradients (use very sparingly)
export const Gradients = {
  primary: [Colors.primary, Colors.primaryDark] as const,
  subtle: ['rgba(124, 58, 237, 0.03)', 'rgba(124, 58, 237, 0.01)'] as const,
  dark: ['transparent', 'rgba(0,0,0,0.7)'] as const,
  light: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'] as const,
};

// Safe area padding for Android
export const SafeArea = {
  top: 24, // Status bar height approximation
  bottom: 24, // Navigation bar height approximation
};

const theme = {
  colors: Colors,
  fontFamily: FontFamily,
  fontSizes: FontSizes,
  fontWeights: FontWeights,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  gradients: Gradients,
  safeArea: SafeArea,
};

export default theme;
