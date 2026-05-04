// ============================================
// JWT decode (payload uniquement, sans vérification de signature)
// ============================================
//
// On NE valide PAS la signature côté mobile — c'est le rôle du backend
// pour chaque requête. Cette utility sert uniquement à des contrôles
// défensifs : extraire l'identifiant utilisateur (`user_id` pour
// django-rest-framework-simplejwt) ou la date d'expiration (`exp`) pour
// détecter une incohérence locale (token mal stocké, restore device,
// session corrompue) avant de partir en requête.

interface DecodedJWT {
  /** Identifiant utilisateur — `user_id` chez SimpleJWT, `sub` chez d'autres providers. */
  user_id?: number | string;
  sub?: number | string;
  /** Expiration en secondes Unix. */
  exp?: number;
  iat?: number;
  jti?: string;
  token_type?: string;
  [key: string]: unknown;
}

function base64UrlDecode(input: string): string {
  // base64url → base64 standard
  const standard = input.replace(/-/g, '+').replace(/_/g, '/');
  // Padding `=`
  const padded = standard + '=='.slice(0, (4 - (standard.length % 4)) % 4);
  // atob est disponible dans Hermes depuis RN 0.71. En fallback (env JS exotique
  // ou test Node), on utilise globalThis.Buffer si présent.
  const decode = (typeof atob === 'function')
    ? atob
    : (s: string) => (globalThis as any).Buffer?.from(s, 'base64').toString('binary') ?? '';
  return decode(padded);
}

/**
 * Décode le payload d'un JWT. Retourne null si le format n'est pas un JWT
 * standard à 3 segments ou si le JSON est invalide.
 */
export function decodeJWT(token: string | null | undefined): DecodedJWT | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const decoded = base64UrlDecode(parts[1]);
    // En mode binaire, certains caractères UTF-8 multi-octets peuvent ne pas
    // être décodés correctement, mais user_id/exp sont des valeurs ASCII.
    return JSON.parse(decoded) as DecodedJWT;
  } catch {
    return null;
  }
}

/**
 * Extrait l'identifiant utilisateur du payload (gère les deux conventions
 * SimpleJWT `user_id` et OAuth/OIDC `sub`). Retourne null si absent.
 */
export function getJWTUserId(token: string | null | undefined): string | null {
  const payload = decodeJWT(token);
  if (!payload) return null;
  const id = payload.user_id ?? payload.sub;
  return id != null ? String(id) : null;
}

/**
 * Retourne true si le token est expiré ou si la date d'expiration est absente.
 * Une marge `skewSeconds` peut être appliquée pour considérer "expirant bientôt"
 * (utile pour rafraîchir proactivement).
 */
export function isJWTExpired(token: string | null | undefined, skewSeconds = 0): boolean {
  const payload = decodeJWT(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 >= payload.exp - skewSeconds;
}
