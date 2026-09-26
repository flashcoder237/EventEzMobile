/**
 * Sélection de l'événement « du moment » pour l'onglet Organiser.
 *
 * Quand un organisateur ouvre l'app un jour d'événement, il a UN événement en
 * tête. L'onglet doit le deviner plutôt que de lui faire choisir dans une
 * liste : c'est la différence entre 1 tap et 4.
 */
import { Event } from '../../types';

export interface ActiveEvent {
  event: Event;
  /** On est actuellement dans la fenêtre de l'événement. */
  isLive: boolean;
}

/**
 * Seuls les événements réellement exploitables sur le terrain comptent.
 * Un brouillon, un événement soumis ou refusé n'a ni billets valides ni
 * contrôle d'accès ; un événement annulé ne se scanne plus.
 */
const OPERABLE_STATUSES = new Set(['validated', 'completed']);

/**
 * Retourne l'événement en cours, ou à défaut le prochain à démarrer.
 *
 * Priorité au LIVE : pendant un événement, c'est le seul qui compte, même si
 * un autre commence dans l'heure. En l'absence de live, on regarde devant —
 * jamais derrière : un événement terminé n'a plus d'action de terrain.
 */
export function pickActiveEvent(
  events: Event[],
  now: number = Date.now(),
): ActiveEvent | null {
  const parsed = events
    .filter((e) => e && OPERABLE_STATUSES.has(e.status))
    .map((e) => ({
      event: e,
      start: new Date(e.start_date).getTime(),
      end: new Date(e.end_date).getTime(),
    }))
    // Une date invalide produit NaN, qui passerait toutes les comparaisons
    // en silence : on écarte ces entrées plutôt que de les classer au hasard.
    .filter((e) => Number.isFinite(e.start) && Number.isFinite(e.end));

  const live = parsed
    .filter((e) => e.start <= now && e.end >= now)
    // Plusieurs événements simultanés : celui commencé en premier est celui
    // dont la porte est déjà ouverte.
    .sort((a, b) => a.start - b.start)[0];
  if (live) return { event: live.event, isLive: true };

  const upcoming = parsed
    .filter((e) => e.start > now)
    .sort((a, b) => a.start - b.start)[0];
  if (upcoming) return { event: upcoming.event, isLive: false };

  return null;
}

/**
 * Un événement 100% en ligne n'a pas de porte : proposer « Scanner » y est
 * une impasse. Les événements hybrides gardent le scan — ils ont un lieu.
 */
export function isScannable(event: Event | undefined | null): boolean {
  return !!event && event.location_type !== 'online';
}
