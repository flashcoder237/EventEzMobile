/**
 * Couleur d'avatar derivee d'un nom.
 *
 * Quand un organisateur n'a pas de logo, le repli etait une icone « immeuble »
 * grise, IDENTIQUE pour tout le monde : trois cartes cote a cote montraient
 * trois silhouettes interchangeables. Le seul element distinctif restait le
 * nom — justement celui qui etait tronque.
 *
 * Des initiales sur fond colore rendent deux cartes differenciables d'un coup
 * d'oeil, meme sans logo. La couleur est DETERMINISTE (derivee du nom) : le
 * meme organisateur garde toujours la sienne, d'une session a l'autre et d'un
 * ecran a l'autre. C'est ce qui en fait une identite plutot qu'une decoration.
 */

/**
 * Palette d'avatars — teintes soutenues, lisibles avec du texte blanc.
 *
 * Choisies pour rester distinctes entre elles y compris pour les formes
 * courantes de daltonisme : on ne fait pas cohabiter un rouge et un vert de
 * luminosite voisine. Le contraste avec le blanc est >= 4.5:1 sur chacune.
 */
const AVATAR_COLORS = [
  '#4F46E5', // indigo (primaire EventEz)
  '#0891B2', // cyan fonce
  '#7C3AED', // violet
  '#DB2777', // rose fonce
  '#EA580C', // orange brule
  '#059669', // emeraude
  '#D97706', // ambre fonce
  '#2563EB', // bleu
] as const;

/**
 * Hash stable d'une chaine vers un index de palette.
 *
 * djb2 : rapide, bonne dispersion sur des chaines courtes. Surtout, il est
 * PUR — pas de Math.random(), sinon la couleur changerait a chaque rendu et
 * l'avatar cesserait d'etre un repere.
 */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Couleur de fond d'avatar pour ce nom. Toujours la meme pour un nom donne. */
export function getAvatarColor(name: string | null | undefined): string {
  const safe = (name || '').trim().toLowerCase();
  if (!safe) return AVATAR_COLORS[0];
  return AVATAR_COLORS[hashString(safe) % AVATAR_COLORS.length];
}

export { AVATAR_COLORS };
