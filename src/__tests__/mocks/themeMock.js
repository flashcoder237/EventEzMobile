/**
 * Mock for constants/theme module
 */

const Colors = {
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',
  secondary: '#EC4899',
  white: '#FFFFFF',
  black: '#000000',
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
  background: '#FFFFFF',
  backgroundSecondary: '#FAFAFA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#F0F0F0',
  text: '#212121',
  textSecondary: '#757575',
  textLight: '#9E9E9E',
  textInverse: '#FFFFFF',
  primaryBg: '#F5F3FF',
  primaryBgLight: '#FAFAFE',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  gradientStart: '#7C3AED',
  gradientMiddle: '#A855F7',
  gradientEnd: '#EC4899',
};

const FontFamily = {
  displayExtraBold: 'FunnelDisplay_800ExtraBold',
  displayBold: 'FunnelDisplay_700Bold',
  displaySemiBold: 'FunnelDisplay_600SemiBold',
  displayMedium: 'FunnelDisplay_500Medium',
  displayRegular: 'FunnelDisplay_400Regular',
  bold: 'Montserrat_700Bold',
  semiBold: 'Montserrat_600SemiBold',
  medium: 'Montserrat_500Medium',
  regular: 'Montserrat_400Regular',
  light: 'Montserrat_300Light',
};

const FontSizes = {
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

const FontWeights = {
  light: '300',
  normal: '400',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const Spacing = {
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

const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  base: 10,
  lg: 12,
  xl: 14,
  '2xl': 16,
  '3xl': 18,
  full: 9999,
};

const shadowBase = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 1,
};

const Shadows = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  xs: shadowBase,
  sm: shadowBase,
  md: shadowBase,
  lg: shadowBase,
  xl: shadowBase,
  card: shadowBase,
  button: shadowBase,
  buttonPrimary: shadowBase,
  fab: shadowBase,
  bottomBar: shadowBase,
  header: shadowBase,
};

const Gradients = {
  primary: [Colors.primary, Colors.primaryDark],
  subtle: ['rgba(124, 58, 237, 0.03)', 'rgba(124, 58, 237, 0.01)'],
  dark: ['transparent', 'rgba(0,0,0,0.7)'],
  light: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'],
};

const SafeArea = {
  top: 24,
  bottom: 24,
};

const TextStyles = {
  h1: { fontFamily: FontFamily.displayBold, fontSize: FontSizes['4xl'], color: Colors.gray900 },
  h2: { fontFamily: FontFamily.displayBold, fontSize: FontSizes['2xl'], color: Colors.gray900 },
  h3: { fontFamily: FontFamily.displaySemiBold, fontSize: FontSizes.xl, color: Colors.gray900 },
  h4: { fontFamily: FontFamily.displaySemiBold, fontSize: FontSizes.lg, color: Colors.gray900 },
  body: { fontFamily: FontFamily.regular, fontSize: FontSizes.base, color: Colors.gray700 },
  bodyBold: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base, color: Colors.gray900 },
  small: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, color: Colors.gray600 },
  smallBold: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, color: Colors.gray700 },
  caption: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, color: Colors.gray500 },
  label: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm, color: Colors.gray700 },
  button: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base, color: Colors.white },
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
  textStyles: TextStyles,
};

module.exports = {
  Colors,
  FontFamily,
  FontSizes,
  FontWeights,
  Spacing,
  BorderRadius,
  Shadows,
  Gradients,
  SafeArea,
  TextStyles,
  default: theme,
};
