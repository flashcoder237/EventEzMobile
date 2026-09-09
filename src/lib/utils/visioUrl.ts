/**
 * Ajoute le token JWT à une URL de visio SANS casser une query/fragment
 * existante. Une simple concaténation `?jwt=…` produit des URLs invalides :
 *   - `host/room?foo=bar` + `?jwt=` → `...?foo=bar?jwt=` (2e '?', JWT perdu)
 *   - `host/room#config.x=1` + `?jwt=` → le `?jwt=` part DANS le fragment,
 *     Jitsi ne le lit pas → prejoin / accès refusé.
 * On insère toujours le paramètre `jwt` dans la QUERY, avant tout `#`.
 */
export function withJwt(url: string, token?: string | null): string {
  if (!url || !token) return url;
  if (/[?&]jwt=/.test(url)) return url; // déjà présent

  const hashIndex = url.indexOf('#');
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const fragment = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}jwt=${encodeURIComponent(token)}${fragment}`;
}

/**
 * Réglages d'interface Jitsi passés dans le fragment `#`.
 *
 * PROBLÈME CORRIGÉ : la visio s'ouvrait avec DEUX barres de titre
 * superposées — celle de l'app (retour + titre) et celle de Jitsi, qui
 * affiche le nom BRUT de la salle (`eventez-95a9e578-f7b0-418f-…`). Elles se
 * chevauchaient avec la vignette caméra et le bandeau d'enregistrement,
 * rendant le haut de l'écran illisible.
 *
 * On masque donc l'en-tête de Jitsi : l'app fournit déjà le titre et le
 * bouton de sortie. On désactive aussi l'écran de pré-accueil, inutile
 * puisque l'accès est déjà autorisé par JWT.
 *
 * Ces clés vivent dans le FRAGMENT (`#`), jamais dans la query : c'est le
 * contrat Jitsi, et cela évite de les mêler au `jwt`.
 */
const JITSI_UI_PARAMS: Record<string, string> = {
  // Écran de pré-accueil : l'accès est déjà validé côté serveur.
  'config.prejoinPageEnabled': 'false',
  'config.prejoinConfig.enabled': 'false',
  // En-tête Jitsi : masque le nom de salle brut et le minuteur en doublon.
  'interfaceConfig.SHOW_JITSI_WATERMARK': 'false',
  'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS': 'false',
  'interfaceConfig.HIDE_DEEP_LINKING_LOGO': 'true',
  'interfaceConfig.SHOW_BRAND_WATERMARK': 'false',
  // Le nom technique de la salle n'a aucun sens pour le participant.
  'interfaceConfig.SHOW_ROOM_TIMER': 'false',
  'config.subject': '""',
  // Écran mobile : on n'affiche pas l'invitation ni le partage, l'accès
  // passe obligatoirement par un billet.
  'config.disableInviteFunctions': 'true',
  'config.hideConferenceSubject': 'true',
  'config.hideConferenceTimer': 'true',
};

/**
 * Applique les réglages d'interface à une URL de visio, sans écraser ceux
 * que l'appelant aurait déjà posés.
 */
export function withJitsiUi(url: string): string {
  if (!url) return url;

  const hashIndex = url.indexOf('#');
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const existing = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';

  const parts = existing ? existing.split('&').filter(Boolean) : [];
  const present = new Set(parts.map((p) => p.split('=')[0]));

  for (const [key, value] of Object.entries(JITSI_UI_PARAMS)) {
    if (!present.has(key)) parts.push(`${key}=${value}`);
  }

  return parts.length ? `${base}#${parts.join('&')}` : base;
}
