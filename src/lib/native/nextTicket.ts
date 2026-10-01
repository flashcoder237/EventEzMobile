/**
 * Le « prochain billet » : une seule source de vérité pour le widget (X3), la
 * tuile Réglages rapides (X11) et la Live Activity participant (X1).
 *
 * Fonctions PURES (aucun module natif, aucune I/O) : testées dans
 * __tests__/nextTicket.test.ts.
 */
import { isRegistrationUnsettled } from '../../utils/paymentSettled';
import { DEFAULT_DURATION_MS, DOORS_BEFORE_MS, DEFAULT_EVENT_TIMEZONE } from '../utils/ticketPhase';

export interface NextTicket {
  registrationId: string;
  eventId: string;
  title: string;
  venue: string | null;
  startsAt: number;
  endsAt: number;
  doorsAt: number;
  timezone: string;
}

const VALID_STATUSES = ['confirmed', 'checked_in', 'completed'];

function eventOf(reg: any): any {
  if (reg?.event_detail && typeof reg.event_detail === 'object') return reg.event_detail;
  if (reg?.event && typeof reg.event === 'object') return reg.event;
  return null;
}

function venueOf(event: any): string | null {
  const parts = [event?.location_name, event?.location_city].filter(
    (p) => typeof p === 'string' && p.trim().length > 0,
  );
  if (parts.length === 0) return null;
  // « Palais des Sports, Yaoundé » — sans répéter la ville si le lieu la contient.
  if (parts.length === 2 && parts[0].toLowerCase().includes(parts[1].toLowerCase())) return parts[0];
  return parts.join(', ');
}

/**
 * Billet valide (payé, non annulé) dont l'événement n'est pas terminé, le plus
 * proche dans le temps. Un événement en cours passe avant un événement à venir.
 */
export function pickNextTicket(regs: any[] | null | undefined, now: Date = new Date()): NextTicket | null {
  const t = now.getTime();
  let best: NextTicket | null = null;
  for (const reg of regs || []) {
    if (!VALID_STATUSES.includes(String(reg?.status))) continue;
    if (isRegistrationUnsettled(reg)) continue;
    const event = eventOf(reg);
    const startsAt = Date.parse(event?.start_date);
    if (!Number.isFinite(startsAt)) continue;
    const parsedEnd = Date.parse(event?.end_date);
    const endsAt = Number.isFinite(parsedEnd) && parsedEnd > startsAt ? parsedEnd : startsAt + DEFAULT_DURATION_MS;
    if (endsAt <= t) continue;
    if (!best || startsAt < best.startsAt) {
      best = {
        registrationId: String(reg.id),
        eventId: String(event.id ?? ''),
        title: String(event.title || ''),
        venue: venueOf(event),
        startsAt,
        endsAt,
        doorsAt: startsAt - DOORS_BEFORE_MS,
        timezone: typeof event.timezone === 'string' && event.timezone ? event.timezone : DEFAULT_EVENT_TIMEZONE,
      };
    }
  }
  return best;
}

/** « sam. 12 oct. · 20:00 », dans le fuseau de l'ÉVÉNEMENT (cf. ticketPhase). */
export function formatWhen(ticket: Pick<NextTicket, 'startsAt' | 'timezone'>, locale: string): string {
  const date = new Date(ticket.startsAt);
  const opts = (extra: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions => ({
    timeZone: ticket.timezone,
    ...extra,
  });
  try {
    const day = new Intl.DateTimeFormat(locale, opts({ weekday: 'short', day: 'numeric', month: 'short' })).format(date);
    const time = new Intl.DateTimeFormat(locale, opts({ hour: '2-digit', minute: '2-digit' })).format(date);
    return `${day} · ${time}`;
  } catch {
    // Fuseau inconnu de l'appareil : on retombe sur l'heure locale.
    return date.toLocaleString(locale);
  }
}

export interface WidgetLabels {
  header: string;
  empty: string;
  live: string;
  tile: string;
}

/**
 * Charge utile écrite dans l'App Group / SharedPreferences. Sans billet, on
 * écrit quand même les libellés (titre vide) : l'état vide reste traduit.
 * Dates en millisecondes (lues telles quelles par Kotlin et Swift).
 */
export function buildWidgetPayload(ticket: NextTicket | null, labels: WidgetLabels, locale: string) {
  if (!ticket) {
    return { title: '', whenLabel: '', venue: null, startsAt: 0, endsAt: 0, deepLink: 'eventez://tickets', labels };
  }
  return {
    registrationId: ticket.registrationId,
    title: ticket.title,
    whenLabel: formatWhen(ticket, locale),
    venue: ticket.venue,
    startsAt: ticket.startsAt,
    endsAt: ticket.endsAt,
    deepLink: `eventez://registrations/${ticket.registrationId}`,
    labels,
  };
}

/** Fenêtre de la Live Activity participant : à partir de 4 h avant les portes. */
export const ATTENDEE_ACTIVITY_LEAD_MS = 4 * 60 * 60 * 1000;

/** La Live Activity participant doit-elle être affichée à `now` ? */
export function shouldShowAttendeeActivity(ticket: NextTicket | null, now: number): boolean {
  if (!ticket) return false;
  return now >= ticket.doorsAt - ATTENDEE_ACTIVITY_LEAD_MS && now < ticket.endsAt;
}

/**
 * Attributs + état ActivityKit (cf. EventezActivityAttributes.swift : dates en
 * SECONDES). `staleDate` = ouverture des portes → l'activité bascule seule en
 * « en cours » même si l'app n'est pas ouverte.
 */
export function buildAttendeeActivity(ticket: NextTicket, labels: Record<string, string>, now: number) {
  const beforeDoors = now < ticket.doorsAt;
  return {
    attributes: {
      kind: 'attendee',
      key: `reg:${ticket.registrationId}`,
      title: ticket.title,
      venue: ticket.venue,
      deepLink: `eventez://registrations/${ticket.registrationId}`,
      labels,
    },
    state: {
      phase: beforeDoors ? 'countdown' : 'live',
      doorsAt: ticket.doorsAt / 1000,
      startsAt: ticket.startsAt / 1000,
      endsAt: ticket.endsAt / 1000,
    },
    staleDate: beforeDoors ? ticket.doorsAt : ticket.endsAt,
  };
}
