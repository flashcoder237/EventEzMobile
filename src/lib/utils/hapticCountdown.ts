/**
 * H5 — haptique d'un compte à rebours (place gardée 15 min) : un cran
 * (`notch`) au passage de T-5 min et T-1 min, un `tick` à chacune des 5
 * dernières secondes. Pure : comparée entre deux lectures successives.
 */
export type CountdownHaptic = 'notch' | 'tick' | null;

const NOTCHES_MS = [5 * 60_000, 60_000];

export function countdownHaptic(prevLeftMs: number, leftMs: number): CountdownHaptic {
  if (!(leftMs < prevLeftMs)) return null;
  for (const n of NOTCHES_MS) if (prevLeftMs > n && leftMs <= n) return 'notch';
  // Secondes affichées (arrondi supérieur, comme l'horloge) : 5, 4, 3, 2, 1.
  const prevS = Math.ceil(prevLeftMs / 1000);
  const s = Math.ceil(leftMs / 1000);
  if (s !== prevS && s >= 1 && s <= 5) return 'tick';
  return null;
}
