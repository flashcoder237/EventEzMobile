/**
 * Fonds dessinés pour la carte « J'y vais ».
 *
 * Source : design-handoff/eventez-svg-redesign/redesign/fonds/GoingCard*.svg.
 * Ils s'AJOUTENT aux teintes unies existantes (`GOING_CARD_TINTS`) : le
 * sélecteur propose d'abord les couleurs, puis ces cinq compositions. On ne
 * remplace pas les dégradés — le choix de teinte libre reste la façon la plus
 * rapide d'accorder la carte aux couleurs d'un événement.
 *
 * Chaque fond REMPLIT son conteneur (`preserveAspectRatio="xMidYMid slice"`) :
 * il est dessiné en 1080×1920, mais la vignette de prévisualisation et la carte
 * capturée n'ont pas ce ratio.
 */
import type React from 'react';
import GoingCardMarqueArt from './GoingCardMarque';
import GoingCardIndigoArt from './GoingCardIndigo';
import GoingCardVioletArt from './GoingCardViolet';
import GoingCardCorailArt from './GoingCardCorail';
import GoingCardNuitArt from './GoingCardNuit';

export { default as GoingCardMarque } from './GoingCardMarque';
export { default as GoingCardIndigo } from './GoingCardIndigo';
export { default as GoingCardViolet } from './GoingCardViolet';
export { default as GoingCardCorail } from './GoingCardCorail';
export { default as GoingCardNuit } from './GoingCardNuit';

export type BackdropId = 'marque' | 'indigo' | 'violet' | 'corail' | 'nuit';

export interface GoingCardBackdrop {
  id: BackdropId;
  Art: React.ComponentType<{ color?: string }>;
  /** Couleur dominante — sert de pastille dans le sélecteur. */
  swatch: string;
}

/**
 * Ordre d'affichage. « Marque » en tête : c'est le fond le plus neutre, celui
 * qui convient à n'importe quel événement.
 */
export const GOING_CARD_BACKDROPS: GoingCardBackdrop[] = [
  { id: 'marque', Art: GoingCardMarqueArt, swatch: '#4F46E5' },
  { id: 'indigo', Art: GoingCardIndigoArt, swatch: '#4338CA' },
  { id: 'violet', Art: GoingCardVioletArt, swatch: '#A855F7' },
  { id: 'corail', Art: GoingCardCorailArt, swatch: '#FF6B6B' },
  { id: 'nuit', Art: GoingCardNuitArt, swatch: '#0F172A' },
];

/** Fond par identifiant, `null` si inconnu (teinte unie choisie, ou id obsolète). */
export function backdropById(id?: string | null): GoingCardBackdrop | null {
  if (!id) return null;
  return GOING_CARD_BACKDROPS.find((b) => b.id === id) ?? null;
}
