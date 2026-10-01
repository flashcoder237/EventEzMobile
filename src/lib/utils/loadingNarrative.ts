/**
 * Chargement qui raconte (R3 W1) — fonctions pures, testées.
 *
 * - Rien sous 1,2 s : un chargement rapide n'a pas besoin de commentaire.
 * - Ensuite, UNE ligne propre au contexte : ce qu'on attend, jamais un état que
 *   le serveur n'a pas renvoyé, jamais une durée promise.
 * - Mobile Money : récit indexé UNIQUEMENT sur le temps réellement écoulé
 *   (ce qui se passe habituellement à ce moment-là). La vérification du
 *   paiement n'en dépend pas.
 */

export const LOADING_LINE_DELAY_MS = 1200;

export type LoadingContext =
  | 'tickets'
  | 'favorites'
  | 'notifications'
  | 'messages'
  | 'search'
  | 'event';

export type MobileMoneyStage = 'sent' | 'pin' | 'operator' | 'once';

export function mobileMoneyStage(elapsedSeconds: number): MobileMoneyStage {
  if (elapsedSeconds < 20) return 'sent';
  if (elapsedSeconds < 60) return 'pin';
  if (elapsedSeconds < 120) return 'operator';
  return 'once';
}

/** Clé i18n de la ligne à afficher, ou null (trop tôt). */
export function loadingLineKey(context: LoadingContext, elapsedMs: number): string | null {
  if (!(elapsedMs >= LOADING_LINE_DELAY_MS)) return null;
  return `delight.loading.${context}`;
}
