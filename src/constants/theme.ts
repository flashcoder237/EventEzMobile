// EventEz Design System - Vibrant & Discovery-First
// Inspired by Eventbrite 2025 rebrand
// Typography: Funnel Display (titles), Montserrat (body)

export const Colors = {
  // Primary - Violet identity (EventEz signature)
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',

  // Accent - Warm orange for energy & CTAs
  accent: '#FF6B35',
  accentDark: '#E85D2C',
  accentLight: '#FF8F66',

  // Lime - Energy highlights, badges
  lime: '#BEFF5A',
  limeDark: '#9ED63E',
  limeLight: '#D4FF8A',

  // Secondary - Pink (kept for compatibility)
  secondary: '#EC4899',

  // Neutrals - Warm white focused
  white: '#FFFFFF',
  black: '#000000',

  // Grays - Soft warm palette
  gray50: '#FAFAF8',
  gray100: '#F5F5F3',
  gray200: '#EEEEEC',
  gray300: '#E0E0DE',
  gray400: '#BDBDBB',
  gray500: '#9E9E9C',
  gray600: '#757573',
  gray700: '#616160',
  gray800: '#424241',
  gray900: '#1A1A2E',

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

  // Background - Warm white
  background: '#FAFAF8',
  backgroundSecondary: '#F5F5F3',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#F0F0F0',

  // Text - Deep contrast
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textLight: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Primary tints (very subtle)
  primaryBg: '#F5F3FF',
  primaryBgLight: '#FAFAFE',

  // Accent tints
  accentBg: '#FFF5F0',
  limeBg: '#F8FFE8',

  // Semantic backgrounds (for follow states, tags, alerts)
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  warningBg: '#FEF3C7',
  infoBg: '#DBEAFE',
  infoBorder: '#BFDBFE',

  // Blue accent (custom tags, info actions)
  blue: '#2563EB',
  blueBg: '#DBEAFE',
  blueDark: '#1E40AF',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Legacy support
  gradientStart: '#7C3AED',
  gradientMiddle: '#A855F7',
  gradientEnd: '#EC4899',
};

export const FontFamily = {
  // Titles - Funnel Display (h1, h2, hero text)
  displayExtraBold: 'FunnelDisplay_800ExtraBold',
  displayBold: 'FunnelDisplay_700Bold',
  displaySemiBold: 'FunnelDisplay_600SemiBold',
  displayMedium: 'FunnelDisplay_500Medium',
  displayRegular: 'FunnelDisplay_400Regular',

  // Body - Montserrat (paragraphs, labels, buttons)
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
  '6xl': 56,
  '7xl': 64,
  '8xl': 72,
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
  '6xl': 80,
  '7xl': 96,
  '8xl': 120,
};

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  base: 10,
  lg: 12,
  xl: 14,
  '2xl': 16,
  '3xl': 18,
  '4xl': 24,
  '5xl': 32,
  full: 9999,
};

// Subtle Shadows - Clean & Minimal
// Key principle: Very light shadows for white cards, stronger for buttons
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // Very subtle lift
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  // Light card shadow
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  // Medium elevation
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  // Modal, floating elements
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  // Prominent floating UI
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  // Card shadow - very subtle
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  // Button shadow
  button: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  // Primary button with colored shadow
  buttonPrimary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  // Floating action button
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  // Bottom navigation/sticky footer
  bottomBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
  // Header shadow
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  // Glass - premium cards with subtle depth
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  // Dramatic - floating elements with strong presence
  dramatic: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  // Colored primary - for CTA buttons
  coloredPrimary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
};

// Gradients
export const Gradients = {
  primary: [Colors.primary, Colors.primaryDark] as const,
  subtle: ['rgba(124, 58, 237, 0.03)', 'rgba(124, 58, 237, 0.01)'] as const,
  dark: ['transparent', 'rgba(0,0,0,0.7)'] as const,
  light: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'] as const,
  // Energy Auras — vibrant overlays for featured events
  auraViolet: [Colors.primary, Colors.secondary] as const,
  auraSunset: [Colors.accent, Colors.primary] as const,
  auraNature: [Colors.lime, Colors.primary] as const,
  auraNight: [Colors.gray900, Colors.primary] as const,
  // Image overlays for editorial cards
  imageOverlay: ['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)'] as const,
  imageOverlaySubtle: ['transparent', 'rgba(0,0,0,0.3)'] as const,
  heroFade: ['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.7)'] as const,
};

// Safe area padding for Android
export const SafeArea = {
  top: 24, // Status bar height approximation
  bottom: 24, // Navigation bar height approximation
};

// ===== TYPOGRAPHY STYLES =====
// Styles prêts à l'emploi pour les textes
// Règle: Funnel Display pour titres (h1, h2), Montserrat pour le reste
export const TextStyles = {
  // Editorial - Hero & Display styles
  hero: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 56,
    color: Colors.gray900,
    lineHeight: 58,
    letterSpacing: -2,
  },
  heroSm: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 40,
    color: Colors.gray900,
    lineHeight: 44,
    letterSpacing: -1.5,
  },
  editorial: {
    fontFamily: FontFamily.displayBold,
    fontSize: 32,
    color: Colors.gray900,
    lineHeight: 36,
    letterSpacing: -1,
  },
  eyebrow: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.accent,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },

  // Headings - Funnel Display (bolder, larger — Eventbrite style)
  h1: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 40,
    color: Colors.gray900,
    lineHeight: 46,
    letterSpacing: -1,
  },
  h2: {
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    color: Colors.gray900,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h3: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.xl,
    color: Colors.gray900,
  },
  h4: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
  },

  // Date accent — orange, uppercase, prominent (Eventbrite pattern)
  dateAccent: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  // Price — bold, visible
  price: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
  },

  // Body - Montserrat
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray700,
  },
  bodyBold: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  small: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  smallBold: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  button: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
};

// ===== STANDARDIZED UI CONSTANTS =====
// Valeurs coherentes pour toute l'application

/** Opacite standard pour les TouchableOpacity */
export const TOUCH_OPACITY = 0.7;

/** Opacite pour les elements desactives */
export const DISABLED_OPACITY = 0.5;

/** Spring animation presets for react-native-reanimated */
export const SpringPresets = {
  gentle: { damping: 20, stiffness: 200, mass: 1 },
  snappy: { damping: 15, stiffness: 400, mass: 0.8 },
  bouncy: { damping: 10, stiffness: 300, mass: 0.8 },
  slow: { damping: 25, stiffness: 120, mass: 1.2 },
  micro: { damping: 18, stiffness: 500, mass: 0.5 },
};

/** Espacements de section standards */
export const SECTION_MARGIN_TOP = Spacing['3xl'];
export const CARD_MARGIN_BOTTOM = Spacing.md;
export const LIST_ITEM_MARGIN_BOTTOM = Spacing.sm;

/** Border radius standards par type de composant */
export const CARD_BORDER_RADIUS = BorderRadius.lg;
export const INPUT_BORDER_RADIUS = BorderRadius.xl;
export const BADGE_BORDER_RADIUS = BorderRadius.full;
export const BUTTON_BORDER_RADIUS = BorderRadius.lg;

/** Tailles d'icones standards */
export const IconSizes = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48,
  '2xl': 64,
};

/** Durees d'animation standards */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

/** Hauteurs de composants standards */
export const ComponentHeights = {
  buttonSm: 36,
  buttonMd: 44,
  buttonLg: 52,
  input: 48,
  header: 56,
  tabBar: 60,
  listItem: 64,
};

/** Tailles d'avatar standards */
export const AvatarSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  '2xl': 100,
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
  springPresets: SpringPresets,
  // Nouvelles constantes
  touchOpacity: TOUCH_OPACITY,
  disabledOpacity: DISABLED_OPACITY,
  iconSizes: IconSizes,
  animationDuration: ANIMATION_DURATION,
  componentHeights: ComponentHeights,
  avatarSizes: AvatarSizes,
};

export default theme;
