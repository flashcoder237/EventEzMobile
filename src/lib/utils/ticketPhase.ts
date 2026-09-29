/**
 * S1 — L'horloge du billet.
 *
 * Le même billet change de posture à mesure que l'événement approche, puis
 * passe : dans une semaine, la veille, le jour J, portes ouvertes, en cours,
 * juste après, puis souvenir. Ce sont des ÉTATS calculés depuis les dates —
 * aucune animation n'en dépend, l'interface passe de l'un à l'autre par un
 * simple fondu.
 *
 * Les jours se comptent dans le fuseau de l'ÉVÉNEMENT (pas celui du
 * navigateur) : « demain » à Douala reste « demain » pour un participant
 * qui consulte son billet depuis Paris. Sans fuseau fourni par l'API, on
 * retombe sur le fuseau de la plateforme (Africa/Douala, cf. TIME_ZONE).
 *
 * Miroir de `eventez-frontend/src/lib/utils/ticketPhase.ts` — garder alignés.
 */

export type TicketPhase =
  | 'A_VENIR'
  | 'J7'
  | 'VEILLE'
  | 'JOUR_J'
  | 'PORTES'
  | 'EN_COURS'
  | 'APRES'
  | 'SOUVENIR';

export interface TicketPhaseEvent {
  start_date: string;
  end_date?: string | null;
  timezone?: string | null;
}

export interface TicketPhaseRegistration {
  status?: string | null;
}

export const DEFAULT_EVENT_TIMEZONE = 'Africa/Douala';
/** Les portes ouvrent (par convention) une heure avant le début. */
export const DOORS_BEFORE_MS = 60 * 60 * 1000;
/** Sans date de fin, on suppose un événement de 3 h. */
export const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;
/** « Juste après » : le lendemain reste le moment « vous y étiez ». */
export const AFTER_WINDOW_MS = 48 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Jour civil (UTC minuit) d'un instant, vu dans un fuseau donné. */
function civilDay(date: Date, timeZone: string): number {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
  } catch {
    tz = DEFAULT_EVENT_TIMEZONE;
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get('year'), get('month') - 1, get('day'));
}

/** Nombre de jours civils entre `now` et `start`, dans le fuseau de l'événement. */
export function civilDaysUntil(start: Date, now: Date, timeZone = DEFAULT_EVENT_TIMEZONE): number {
  return Math.round((civilDay(start, timeZone) - civilDay(now, timeZone)) / DAY_MS);
}

/**
 * Phase du billet à l'instant `now`. Renvoie `null` quand le billet n'a pas
 * de posture à prendre (inscription annulée, dates invalides).
 */
export function getTicketPhase(
  event: TicketPhaseEvent | null | undefined,
  registration: TicketPhaseRegistration | null | undefined,
  now: Date = new Date(),
): TicketPhase | null {
  if (!event?.start_date) return null;
  if (registration?.status === 'cancelled') return null;

  const start = new Date(event.start_date);
  if (Number.isNaN(start.getTime())) return null;
  const rawEnd = event.end_date ? new Date(event.end_date) : null;
  const end =
    rawEnd && !Number.isNaN(rawEnd.getTime()) && rawEnd.getTime() > start.getTime()
      ? rawEnd
      : new Date(start.getTime() + DEFAULT_DURATION_MS);
  const t = now.getTime();
  const tz = event.timezone || DEFAULT_EVENT_TIMEZONE;

  if (t >= end.getTime()) {
    return t - end.getTime() < AFTER_WINDOW_MS ? 'APRES' : 'SOUVENIR';
  }
  // Événement sur plusieurs jours : « en cours » de l'ouverture à la clôture.
  if (t >= start.getTime()) return 'EN_COURS';
  if (start.getTime() - t <= DOORS_BEFORE_MS) return 'PORTES';

  const days = civilDaysUntil(start, now, tz);
  if (days <= 0) return 'JOUR_J';
  if (days === 1) return 'VEILLE';
  if (days <= 7) return 'J7';
  return 'A_VENIR';
}

/** Phases où le billet doit être mis en avant (carte « à la une » de la liste). */
export const SPOTLIGHT_PHASES: ReadonlySet<TicketPhase> = new Set([
  'J7',
  'VEILLE',
  'JOUR_J',
  'PORTES',
  'EN_COURS',
]);

/** Phases où le billet est rangé dans « Passés ». */
export const PAST_PHASES: ReadonlySet<TicketPhase> = new Set(['APRES', 'SOUVENIR']);

/** Lien d'itinéraire (Google Maps) à partir des coordonnées ou de l'adresse. */
export function directionsUrl(event: {
  location_latitude?: number | string | null;
  location_longitude?: number | string | null;
  location_address?: string | null;
  location_name?: string | null;
  location_city?: string | null;
}): string | null {
  // DRF sérialise les DecimalField en chaînes : on accepte les deux.
  const lat = event.location_latitude == null ? NaN : Number(event.location_latitude);
  const lng = event.location_longitude == null ? NaN : Number(event.location_longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  const q = [event.location_name, event.location_address, event.location_city]
    .filter(Boolean)
    .join(', ');
  return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : null;
}
