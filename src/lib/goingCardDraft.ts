/**
 * Carte « J'y vais » préparée pendant l'attente du paiement (R3 W8).
 *
 * Le choix (teinte + message) est gardé en mémoire pour l'inscription en
 * cours et appliqué à la carte story de l'écran de succès. Rien n'est envoyé
 * au serveur ; un paiement non confirmé n'utilise jamais ce brouillon.
 */
export type GoingCardMessage = 'going' | 'meetThere' | 'seeYou';

export interface GoingCardDraft {
  tint: string;
  message: GoingCardMessage;
  /**
   * Fond dessiné choisi (cf. components/payment/backdrops). Absent = teinte
   * unie `tint`, le comportement d'origine — les brouillons déjà en mémoire
   * restent donc valides.
   */
  backdrop?: string | null;
}

export const GOING_CARD_MESSAGES: GoingCardMessage[] = ['going', 'meetThere', 'seeYou'];
export const GOING_CARD_TINTS = ['#4F46E5', '#A855F7', '#FF6B6B', '#0F766E'];

const drafts = new Map<string, GoingCardDraft>();

export function setGoingCardDraft(registrationId: string | number, draft: GoingCardDraft) {
  drafts.set(String(registrationId), draft);
}

export function getGoingCardDraft(registrationId: string | number | null | undefined): GoingCardDraft | null {
  if (registrationId === null || registrationId === undefined) return null;
  return drafts.get(String(registrationId)) ?? null;
}

export function clearGoingCardDraft(registrationId: string | number) {
  drafts.delete(String(registrationId));
}

/** Avancement de l'« impression » : 0 à 30 s, puis jusqu'à 1 à 120 s. */
export function printProgress(elapsedSeconds: number): number {
  if (!(elapsedSeconds > 30)) return 0;
  return Math.min(1, (elapsedSeconds - 30) / 90);
}
