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

/**
 * Peut-on vendre un billet SUR PLACE pour cet événement ?
 *
 * BUG CORRIGÉ (2026-10-07) : « quand il y a un événement en cours ça me
 * propose d'ouvrir la caisse, mais ça ne tient pas compte du fait que
 * l'événement est un événement en ligne gratuit ». Le bouton caisse n'avait
 * AUCUNE condition — pire, sur un événement en ligne il devenait le seul
 * bouton et s'affichait en pleine largeur, donc mis en avant.
 *
 * Trois conditions, toutes nécessaires :
 *   - un lieu physique (on n'encaisse pas à la porte d'une visio) ;
 *   - une billetterie (un formulaire d'inscription ne se vend pas) ;
 *   - au moins un tarif payant (sinon il n'y a rien à encaisser).
 *
 * `ticket_types` peut être absent d'une liste allégée : dans le doute on
 * autorise, l'écran de caisse affichera alors ses propres tarifs. On préfère
 * un écran vide à un bouton masqué à tort pour un vrai organisateur.
 */
export function isSellableOnSite(event: Event | undefined | null): boolean {
  if (!event) return false;
  if (event.location_type === 'online') return false;
  if (event.event_type !== 'billetterie') return false;
  const types = event.ticket_types;
  if (!types || types.length === 0) return true;
  return types.some((t) => Number((t as any)?.price) > 0);
}
