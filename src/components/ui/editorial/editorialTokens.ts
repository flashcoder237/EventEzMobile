import { StyleSheet } from 'react-native';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../../constants/theme';

/**
 * EDITORIAL DESIGN SYSTEM
 * =======================
 * Neo-editorial / neo-brutalist direction ported from the AIDesigner event-create concept.
 * Apply across the app for a consistent editorial voice:
 *
 * - Warm canvas background (#F4F3F0 light, slate in dark)
 * - Eyebrow labels (10px bold uppercase, letter-spacing 2px)
 * - Display-font section titles (30px displayExtraBold, negative tracking)
 * - Giant watermark numerals/letters behind hero content (220px, 4% opacity)
 * - Display-font title inputs (26px, -0.8 letter-spacing, 18px vertical padding)
 * - Dashed image/upload zones with floating white circle icon bubble
 * - Category chips (solid indigo fill + shadow when active)
 * - Option cards (3-choice selector with indigo active state)
 * - Pill CTAs (dual-label: eyebrow + main label + arrow disc)
 * - Ghost back button (just chevron + "Retour" text)
 * - Display-font card titles, soft violet-tinted card shadows
 *
 * Palette references: ink #111110, indigo #4F46E5, coral #FF6B6B, lime #BEFF5A
 */

// Core editorial colors — these are literal refs from the AIDesigner concept
export const EditorialColors = {
  canvas: '#F4F3F0',
  ink: '#111110',
  indigo: '#4F46E5',
  coral: '#FF6B6B',
  lime: '#BEFF5A',
};

// Utilities to pick the canvas bg / watermark color / dim bar from the current theme
export const pickCanvas = (isDark: boolean, darkBg: string) =>
  isDark ? darkBg : EditorialColors.canvas;

// ── Depth gradient (apple-design §12 materials & depth, §14 no moving bg, §16 restraint)
// Le fond gagne une matière "éclairée par le haut" : un poil plus clair en haut, la
// base au milieu, un rien plus profond en bas. Statique, à peine perceptible. Dérivé de
// la couleur de base pour que light & dark restent cohérents avec le reste de l'app.
const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const shade = (hex: string, amt: number): string => {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = clampByte(parseInt(full.slice(0, 2), 16) + amt);
  const g = clampByte(parseInt(full.slice(2, 4), 16) + amt);
  const b = clampByte(parseInt(full.slice(4, 6), 16) + amt);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/** Trois arrêts de dégradé (haut → base → bas) pour le fond du canvas. */
export const pickCanvasGradient = (
  isDark: boolean,
  darkBg: string,
): [string, string, string] => {
  const base = isDark ? darkBg : EditorialColors.canvas;
  // Le sombre a besoin d'un peu plus de séparation que le clair pour être lisible.
  const up = isDark ? 12 : 6;
  const down = isDark ? -14 : -7;
  return [shade(base, up), base, shade(base, down)];
};

/** Positions des arrêts : lumière concentrée vers le haut, chute douce vers le bas. */
export const canvasGradientLocations: [number, number, number] = [0, 0.42, 1];

export const pickWatermark = (isDark: boolean) =>
  isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,16,0.04)';

export const pickBarDim = (isDark: boolean) =>
  isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,16,0.08)';

export const pickStickyBarBg = (isDark: boolean) =>
  isDark ? 'rgba(15,23,42,0.9)' : 'rgba(244,243,240,0.9)';

export const pickStickyBarBorder = (isDark: boolean) =>
  isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,16,0.06)';

// Shared editorial stylesheet — module-level so it can be referenced directly
export const editorial = StyleSheet.create({
  // ============================================
  // LAYOUT SHELL
  // ============================================
  container: {
    flex: 1,
  },

  // Header — transparent, blends with canvas (no card bg)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Spacing.xs,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  headerCenterLeft: {
    alignItems: 'flex-start',
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },

  // ============================================
  // WATERMARK backdrop (giant faded numeral/letter)
  // ============================================
  scrollWrap: {
    flex: 1,
    position: 'relative',
  },
  watermark: {
    position: 'absolute',
    top: -20,
    left: -16,
    fontSize: 220,
    fontFamily: FontFamily.displayExtraBold,
    lineHeight: 200,
    letterSpacing: -12,
    zIndex: 0,
  },
  watermarkSmall: {
    position: 'absolute',
    top: -8,
    left: -4,
    fontSize: 140,
    fontFamily: FontFamily.displayExtraBold,
    lineHeight: 130,
    letterSpacing: -7,
    zIndex: 0,
  },
  scrollContent: {
    flex: 1,
    zIndex: 1,
  },

  // ============================================
  // TYPOGRAPHY — editorial hierarchy
  // ============================================
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  eyebrowAccent: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.9,
    marginBottom: Spacing.xs,
  },
  sectionTitleLg: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    lineHeight: 42,
    letterSpacing: -1.2,
    marginBottom: Spacing.xs,
  },
  sectionTitleSm: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    lineHeight: 22,
    marginBottom: Spacing.lg,
    maxWidth: '92%',
  },

  // Micro-label: 10px bold uppercase, tracking 1.4px — form-field labels
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: Spacing.sm,
  },

  // ============================================
  // CARDS
  // ============================================
  card: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
  },

  // ============================================
  // STICKY BOTTOM CTA BAR
  // ============================================
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
  },
  ghostBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 2,
    minWidth: 80,
  },
  ghostBackText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },

  // ============================================
  // PILL CTA (dual-label + arrow disc)
  // ============================================
  pillCTA: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 5,
  },
  pillCTAContent: {
    flex: 1,
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  pillCTAEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    lineHeight: 11,
  },
  pillCTALabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.base,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  pillCTAArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  // ============================================
  // CHIPS (category / tag)
  // ============================================
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipActive: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  chipTextActive: {
    fontFamily: FontFamily.bold,
  },

  // ============================================
  // OPTION CARD (3-choice row — visibility/format/mode)
  // ============================================
  optionCardRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  optionCard: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  optionCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCardLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  optionCardLabelActive: {
    fontFamily: FontFamily.bold,
  },
  optionCardDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: 'center',
  },

  // ============================================
  // STAT / METRIC block (editorial number + eyebrow)
  // ============================================
  statBlock: {
    paddingVertical: Spacing.md,
  },
  statEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statNumber: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    lineHeight: 44,
    letterSpacing: -1.4,
  },
  statNumberSm: {
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.8,
  },
  statCaption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    marginTop: 2,
  },
});

export default editorial;
