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
