import { Dimensions, PixelRatio } from 'react-native';

// Largeur de reference : iPhone 14 (390pt). Tous les scales sont calcules par rapport a cette baseline.
const BASELINE_WIDTH = 390;
const BASELINE_HEIGHT = 844;

// Facteur global applique a toutes les tailles issues de ms()/mvs().
// 1.0 = taille d'origine, <1 = reduit globalement (utile si le design paraissait trop gros).
const GLOBAL_SHRINK = 0.83;

// On lit les dimensions une seule fois au chargement du module.
// L'orientation portrait est assumee (min/max pour couvrir les deux cas).
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const shortDim = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
const longDim = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT);

/** Scale lineaire base sur la largeur. Utile pour les elements qui doivent remplir l'ecran. */
export const scale = (size: number): number => (shortDim / BASELINE_WIDTH) * size;

/** Scale lineaire base sur la hauteur. Pour les espacements verticaux critiques (headers, etc.). */
export const verticalScale = (size: number): number => (longDim / BASELINE_HEIGHT) * size;

/**
 * Scale attenue : interpole entre la taille originale et la taille scalee.
 * factor=0 -> aucune adaptation, factor=1 -> scale lineaire complet.
 * 0.3 est un bon compromis : les petits ecrans (iPhone SE) rapetissent legerement,
 * les tablettes grossissent modestement sans perdre leur ratio.
 */
export const moderateScale = (size: number, factor: number = 0.3): number =>
  size + (scale(size) - size) * factor;

/**
 * Version verticale de moderateScale.
 */
export const moderateVerticalScale = (size: number, factor: number = 0.3): number =>
  size + (verticalScale(size) - size) * factor;

/** Arrondi au pixel physique le plus proche pour eviter le blur sur les bordures/tailles fines. */
export const pixelRound = (size: number): number => PixelRatio.roundToNearestPixel(size);

/** moderateScale + arrondi pixel + shrink global. A utiliser pour les tailles de police et dimensions UI. */
export const ms = (size: number, factor: number = 0.3): number =>
  pixelRound(moderateScale(size, factor) * GLOBAL_SHRINK);

/** Version verticale arrondie avec shrink global. */
export const mvs = (size: number, factor: number = 0.3): number =>
  pixelRound(moderateVerticalScale(size, factor) * GLOBAL_SHRINK);
