/**
 * S2 — Magasin minuscule du « billet du jour ».
 *
 * « Mes billets » et la carte « Ce soir » publient le billet dont la phase est
 * jour J, portes ouvertes ou en cours ; `useQuickActions` s'y abonne pour
 * proposer le raccourci d'icône « Mon billet · {titre} ». Aucune dépendance
 * de navigation ici (importable depuis n'importe quel écran ou test).
 */
export interface TodayTicket {
  registrationId: string;
  title: string;
}

let current: TodayTicket | null = null;
const listeners = new Set<(t: TodayTicket | null) => void>();

export function getTodayTicket(): TodayTicket | null {
  return current;
}

export function setTodayTicket(next: TodayTicket | null): void {
  const same =
    (next === null && current === null) ||
    (!!next && !!current && next.registrationId === current.registrationId && next.title === current.title);
  if (same) return;
  current = next;
  listeners.forEach((l) => l(next));
}

export function subscribeTodayTicket(listener: (t: TodayTicket | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
