/**
 * G13 — échange de contact en secouant. Logique pure (testée).
 */
export const BUMP_RETRY_DELAY_MS = 1500;

export type BumpError = 'disabled' | 'notCheckedIn' | 'clockSkew' | 'rateLimited' | 'expired' | 'noLocation' | 'generic';

/** Traduit une erreur API du bump en état d'écran (code serveur prioritaire). */
export function bumpErrorFrom(err: unknown): BumpError {
  const res = (err as { response?: { status?: number; data?: { code?: string } } } | null)?.response;
  const code = res?.data?.code;
  if (code === 'shake_disabled') return 'disabled';
  if (code === 'not_checked_in') return 'notCheckedIn';
  if (code === 'clock_skew') return 'clockSkew';
  if (code === 'no_pair') return 'expired';
  if (code === 'rate_limited' || res?.status === 429) return 'rateLimited';
  return 'generic';
}

/** Position grossière : arrondie à 4 décimales (~11 m), comme côté serveur. */
export function coarse(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
