/**
 * Identifiants numériques d'API — garde-fou contre les URL en `NaN`.
 *
 * CAS RÉEL : sur le profil d'un organisateur, suivre affichait « une erreur
 * est survenue ». Le serveur recevait `/api/users/NaN/follow/`,
 * `/api/users/NaN/followers_count/` et `/api/users/NaN/is_following/`.
 *
 * Cause : l'écran faisait `Number(organizerId)`, mais `organizerId` est
 * TANTÔT un id numérique (navigation depuis un événement, une conversation),
 * TANTÔT un SLUG — la découverte navigue avec `item.slug || item.id`.
 * `Number('emmanuel-nkodo')` vaut `NaN`, et `NaN` s'interpole sans broncher
 * dans une URL.
 *
 * La règle : un identifiant qui ne peut pas être un nombre valide ne doit
 * JAMAIS partir en requête.
 */

/** L'identifiant est-il utilisable dans une URL d'API attendant un nombre ? */
export function isValidNumericId(value: unknown): boolean {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

/**
 * Renvoie l'identifiant numérique, ou `null` s'il n'y en a pas d'exploitable.
 *
 * `preferred` est l'id venant de l'objet chargé depuis l'API (fiable) ;
 * `fallback` est le paramètre de navigation, qui peut être un slug.
 */
export function toNumericId(
  preferred: unknown,
  fallback?: unknown,
): number | null {
  if (isValidNumericId(preferred)) return Number(preferred);
  if (isValidNumericId(fallback)) return Number(fallback);
  return null;
}
