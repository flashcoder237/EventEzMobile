// Largeurs maximales de CONTENU, centralisées pour un rendu correct sur grand
// écran (iPad en mode compatibilité iPhone : l'app y tourne, Apple l'y teste).
//
// Usage : plafonner la colonne de contenu d'un écran (le fond/header reste
// bord-à-bord ; seul le contenu est plafonné + centré) :
//
//   contentContainerStyle={[styles.scrollContent, centeredContent(FORM_MAX)]}
//   ...ou dans un StyleSheet : { ...centeredContent(CARD_MAX) }
//
// Sur iPhone (largeur < ces valeurs) ça n'a aucun effet visible ; sur iPad ça
// évite l'étirement « crowded » sanctionné par la Guideline 4.0 d'Apple.

/** Formulaires (login, register, remboursement…) — colonne étroite lisible. */
export const FORM_MAX = 520;
/** Listes de cartes / contenu standard (billets, notifications, messages…). */
export const CARD_MAX = 560;
/** Contenu dense / détail (détail événement, paiement, ledger…). */
export const WIDE_MAX = 640;

/**
 * Style de centrage plafonné, prêt à spread dans un StyleSheet ou à passer en
 * style inline. `alignSelf:'center'` centre la colonne ; `width:'100%'` la fait
 * remplir jusqu'au plafond sur les petits écrans.
 */
export const centeredContent = (maxWidth: number = CARD_MAX) => ({
  width: '100%' as const,
  maxWidth,
  alignSelf: 'center' as const,
});
