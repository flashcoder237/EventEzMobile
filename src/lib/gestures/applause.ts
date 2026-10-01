/**
 * G12 — « maintenir pour applaudir ». Fonctions pures (testées).
 *
 * Tant que le doigt reste sur 👏 / 🔥, le compteur monte avec un rythme qui
 * s'accélère (rafale croissante) ; au relâcher, UN seul envoi
 * `{emoji, count}` borné à 1..30 (le serveur borne aussi). Les bulles
 * locales gardent le plafond de 6 à l'écran.
 */
export const APPLAUSE_MAX = 30;
export const APPLAUSE_EMOJIS = ['👏', '🔥'] as const;
/** Valeur envoyée par l'action d'accessibilité « Applaudir longuement ». */
export const APPLAUSE_A11Y_COUNT = 15;
export const MAX_LOCAL_BUBBLES = 6;

export function isApplauseEmoji(emoji: string): boolean {
  return (APPLAUSE_EMOJIS as readonly string[]).includes(emoji);
}

export function clampApplause(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(APPLAUSE_MAX, Math.round(n)));
}

/** Délai avant le prochain « clap » : 220 ms au début, jusqu'à 70 ms. */
export function nextApplauseDelay(count: number): number {
  return Math.max(70, 220 - count * 10);
}

/** Haptique légère à chaque clap au début, puis un sur deux (pas de bourdonnement). */
export function shouldTickHaptic(count: number): boolean {
  return count <= 10 || count % 2 === 0;
}

/** Ajoute une bulle en gardant au plus `max` bulles (les plus anciennes partent). */
export function pushCapped<T>(list: T[], item: T, max = MAX_LOCAL_BUBBLES): T[] {
  const next = [...list, item];
  return next.length > max ? next.slice(next.length - max) : next;
}
