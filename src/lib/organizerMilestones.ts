/**
 * Derniers jalons organisateur reçus EN DIRECT, par événement (O2/O3).
 *
 * `OrganizerMomentHost` publie ici chaque `organizer_milestone` ; les cartes
 * de « Mes événements » et l'onglet Organiser lisent le dernier palier pour
 * afficher leur puce discrète. Mémoire de session uniquement : au prochain
 * lancement, les chiffres viennent de l'API comme d'habitude.
 */
import { useEffect, useState } from 'react';
import type { OrganizerMilestone } from './utils/organizerMoments';

const byEvent = new Map<string, OrganizerMilestone>();
const listeners = new Set<() => void>();

export function recordMilestone(m: OrganizerMilestone): void {
  const prev = byEvent.get(m.eventId);
  // « Complet » est le sommet : un palier arrivé après ne le masque pas.
  if (prev?.kind === 'sold_out' && m.kind !== 'sold_out') return;
  byEvent.set(m.eventId, m);
  listeners.forEach((l) => l());
}

export function getMilestone(eventId: string | null | undefined): OrganizerMilestone | null {
  if (!eventId) return null;
  return byEvent.get(String(eventId)) ?? null;
}

export function useEventMilestone(eventId: string | null | undefined): OrganizerMilestone | null {
  const [m, setM] = useState<OrganizerMilestone | null>(() => getMilestone(eventId));
  useEffect(() => {
    setM(getMilestone(eventId));
    const l = () => setM(getMilestone(eventId));
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [eventId]);
  return m;
}

/** Tests uniquement. */
export function __resetMilestones(): void {
  byEvent.clear();
}
