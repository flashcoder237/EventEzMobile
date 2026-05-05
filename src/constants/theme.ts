// EventEz Design System - Vibrant & Discovery-First
// Inspired by Eventbrite 2025 rebrand
// Typography: Funnel Display (titles), Montserrat (body)

import { ms } from '../utils/responsive';

export const Colors = {
  // Primary - Indigo profond (EventEz signature)
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#818CF8',

  // Accent - Corail festif pour energy & CTAs
  accent: '#FF6B6B',
  accentDark: '#EF4444',
  accentLight: '#FCA5A5',

  // Lime - Energy highlights, badges
  lime: '#BEFF5A',
  limeDark: '#9ED63E',
  limeLight: '#D4FF8A',

  // Secondary - Violet (confetti/splash)
  secondary: '#A855F7',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Grays - Tailwind slate
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

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

  // Background
  background: '#FAFAFA',
  backgroundSecondary: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#F0F0F0',

  // Text - Deep contrast
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textLight: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Primary tints (very subtle)
  primaryBg: '#EEF2FF',
  primaryBgLight: '#F5F7FF',

  // Accent tints
  accentBg: '#FEF2F2',
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
  gradientStart: '#4F46E5',
  gradientMiddle: '#6366F1',
  gradientEnd: '#7C3AED',
};

// Dark mode palette — indigo on dark slate backgrounds
export const DarkColors = {
  // Primary - Lighter indigo for dark backgrounds
  primary: '#818CF8',
  primaryDark: '#6366F1',
  primaryLight: '#A5B4FC',

  // Accent
  accent: '#FCA5A5',
  accentDark: '#F87171',
  accentLight: '#FECACA',

  // Lime
  lime: '#D4FF8A',
  limeDark: '#BEFF5A',
  limeLight: '#E8FFBB',

  // Secondary
  secondary: '#C084FC',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Grays — Tailwind slate reversed for dark mode
  gray50: '#0F172A',
  gray100: '#1E293B',
  gray200: '#334155',
  gray300: '#475569',
  gray400: '#64748B',
  gray500: '#94A3B8',
  gray600: '#CBD5E1',
  gray700: '#E2E8F0',
  gray800: '#F1F5F9',
  gray900: '#F8FAFC',

  // Semantic
  success: '#34D399',
  successLight: '#064E3B',
  successDark: '#6EE7B7',

  warning: '#FBBF24',
  warningLight: '#78350F',
  warningDark: '#FCD34D',

  error: '#F87171',
  errorLight: '#7F1D1D',
  errorDark: '#FCA5A5',

  info: '#60A5FA',
  infoLight: '#1E3A5F',
  infoDark: '#93C5FD',

  // Background
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  surface: '#0F172A',
  card: '#1E293B',
  border: '#334155',

  // Text
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textLight: '#64748B',
  textInverse: '#0F172A',

  // Primary tints
  primaryBg: '#1E1B4B',
  primaryBgLight: '#312E81',

  // Accent tints
  accentBg: '#450A0A',
  limeBg: '#1A2210',

  // Semantic backgrounds
  errorBg: '#2D1010',
  errorBorder: '#5C1C1C',
  warningBg: '#2D2410',
  infoBg: '#10182D',
  infoBorder: '#1C3A5C',

  // Blue accent
  blue: '#60A5FA',
  blueBg: '#10182D',
  blueDark: '#93C5FD',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  // Legacy support
  gradientStart: '#818CF8',
  gradientMiddle: '#A78BFA',
  gradientEnd: '#A78BFA',
};

// NOTE perf : displayMedium et light sont actuellement non-utilisés dans le code.
// Ils sont aliasés vers les poids voisins déjà chargés au boot pour économiser
// ~200KB de bundle. Si tu veux les réactiver, ré-importe les vraies polices dans
// App.tsx et restaure les valeurs ci-dessous.
export const FontFamily = {
  // Titles - Funnel Display (h1, h2, hero text)
  displayExtraBold: 'FunnelDisplay_800ExtraBold',
  displayBold: 'FunnelDisplay_700Bold',
  displaySemiBold: 'FunnelDisplay_600SemiBold',
  displayMedium: 'FunnelDisplay_400Regular', // alias vers displayRegular (cf. note ci-dessus)
  displayRegular: 'FunnelDisplay_400Regular',

  // Body - Montserrat (paragraphs, labels, buttons)
  bold: 'Montserrat_700Bold',
  semiBold: 'Montserrat_600SemiBold',
  medium: 'Montserrat_500Medium',
  regular: 'Montserrat_400Regular',
  light: 'Montserrat_400Regular', // alias vers regular (cf. note ci-dessus)
};

// FontSizes : adapte a la largeur d'ecran via moderateScale (facteur 0.3).
// Reference : iPhone 14 (390pt). Les petits ecrans rapetissent legerement, les tablettes grossissent modestement.
export const FontSizes = {
  xs: ms(11),
  sm: ms(13),
  md: ms(14),
  base: ms(15),
  lg: ms(17),
  xl: ms(20),
  '2xl': ms(24),
  '3xl': ms(30),
  '4xl': ms(36),
  '5xl': ms(48),
  '6xl': ms(56),
  '7xl': ms(64),
  '8xl': ms(72),
};

export const FontWeights = {
  light: '300' as const,
  normal: '400' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Spacing : scale modere pour coherence layout/typographie a travers les tailles d'ecran.
export const Spacing = {
  xs: ms(4),
  sm: ms(8),
  md: ms(12),
  base: ms(16),
  lg: ms(20),
  xl: ms(24),
  '2xl': ms(32),
  '3xl': ms(40),
  '4xl': ms(48),
  '5xl': ms(64),
  '6xl': ms(80),
  '7xl': ms(96),
  '8xl': ms(120),
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
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  // Medium elevation
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  // Modal, floating elements
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  // Prominent floating UI
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  // Card shadow - very subtle
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  // Button shadow
  button: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 1,
  },
  // Primary button with colored shadow
  buttonPrimary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  // Floating action button
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
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
    shadowOpacity: 0.04,
    shadowRadius: 28,
    elevation: 4,
  },
  // Dramatic - floating elements with strong presence
  dramatic: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 36,
    elevation: 5,
  },
  // Colored primary - for CTA buttons
  coloredPrimary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 3,
  },
  // Violet-tinted card shadows (web parity)
  cardViolet: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardVioletHover: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
};

// Card footer background (light/dark)
export const CardFooterBg = {
  light: '#EEF2FF',
  dark: '#1E1B4B',
};

// Gradients
export const Gradients = {
  primary: [Colors.primary, Colors.primaryDark] as const,
  // Brand gradient: violet → pink (web parity)
  brand: ['#4F46E5', '#7C3AED'] as const,
  brandDark: ['#818CF8', '#A78BFA'] as const,
  subtle: ['rgba(79, 70, 229, 0.03)', 'rgba(79, 70, 229, 0.01)'] as const,
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
    fontSize: ms(56),
    color: Colors.gray900,
    lineHeight: ms(58),
    letterSpacing: -2,
  },
  heroSm: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: ms(40),
    color: Colors.gray900,
    lineHeight: ms(44),
    letterSpacing: -1.5,
  },
  editorial: {
    fontFamily: FontFamily.displayBold,
    fontSize: ms(32),
    color: Colors.gray900,
    lineHeight: ms(36),
    letterSpacing: -1,
  },
  eyebrow: {
    fontFamily: FontFamily.semiBold,
    fontSize: ms(11),
    color: Colors.accent,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },

  // Headings - Funnel Display (bolder, larger — Eventbrite style)
  h1: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: ms(40),
    color: Colors.gray900,
    lineHeight: ms(46),
    letterSpacing: -1,
  },
  h2: {
    fontFamily: FontFamily.displayBold,
    fontSize: ms(28),
    color: Colors.gray900,
    lineHeight: ms(34),
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
  xs: ms(14),
  sm: ms(18),
  md: ms(24),
  lg: ms(32),
  xl: ms(48),
  '2xl': ms(64),
};

/** Durees d'animation standards */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

/** Hauteurs de composants standards */
export const ComponentHeights = {
  buttonSm: ms(36),
  buttonMd: ms(44),
  buttonLg: ms(52),
  input: ms(48),
  header: ms(56),
  tabBar: ms(60),
  listItem: ms(64),
};

/** Tailles d'avatar standards */
export const AvatarSizes = {
  xs: ms(24),
  sm: ms(32),
  md: ms(40),
  lg: ms(56),
  xl: ms(80),
  '2xl': ms(100),
};

const theme = {
  colors: Colors,
  darkColors: DarkColors,
  fontFamily: FontFamily,
  fontSizes: FontSizes,
  fontWeights: FontWeights,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  gradients: Gradients,
  cardFooterBg: CardFooterBg,
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
