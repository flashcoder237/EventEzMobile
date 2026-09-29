/**
 * Pouls d'un événement (micro-delight R2, V0–V3).
 *
 * Contrat : `GET /api/events/{id}/pulse/` et message WS `event.pulse`. Le
 * serveur applique seuils et arrondis ; le client n'affiche QUE ce qu'il
 * reçoit — `null` n'affiche rien, aucune valeur n'est jamais inventée ici.
 */

export interface PulseTier {
  /** Palier arrondi vers le bas (3, 5, 10, 20, 50, 100). */
  count: number;
  /** True si la valeur réelle dépasse le palier (« 5+ »). */
  at_least: boolean;
}

export interface PulseTicket {
  id: string | number;
  available: number | null;
  sold_out: boolean;
}

export interface EventPulse {
  event_id: string;
  state: 'open' | 'sold_out' | 'ended';
  is_live: boolean;
  watching: PulseTier | null;
  last_sale: string | null;
  on_site: PulseTier | null;
  tickets: PulseTicket[];
  attendance_remaining: number | null;
  generated_at: string | null;
}

/**
 * Fusionne un nouvel instantané. Le serveur envoie toujours l'état complet ;
 * on écarte seulement un instantané plus ancien que celui qu'on a (une
 * réponse REST lente qui arrive après un message WS plus récent).
 */
export function mergePulse(prev: EventPulse | null, next: EventPulse | null | undefined): EventPulse | null {
  if (!next || typeof next !== 'object') return prev;
  if (prev?.generated_at && next.generated_at) {
    const a = Date.parse(prev.generated_at);
    const b = Date.parse(next.generated_at);
    if (Number.isFinite(a) && Number.isFinite(b) && b < a) return prev;
  }
  return {
    event_id: String(next.event_id ?? prev?.event_id ?? ''),
    state: next.state ?? prev?.state ?? 'open',
    is_live: Boolean(next.is_live),
    watching: next.watching ?? null,
    last_sale: next.last_sale ?? null,
    on_site: next.on_site ?? null,
    tickets: Array.isArray(next.tickets) ? next.tickets : [],
    attendance_remaining: typeof next.attendance_remaining === 'number' ? next.attendance_remaining : null,
    generated_at: next.generated_at ?? null,
  };
}

export type LastSale =
  | { kind: 'just_now' }
  | { kind: 'minutes'; minutes: number }
  | { kind: 'this_hour' }
  | { kind: 'today' };

/** Décode le bucket serveur (`just_now`, `minutes:N`, `this_hour`, `today`). */
export function parseLastSale(value: string | null | undefined): LastSale | null {
  if (!value) return null;
  if (value === 'just_now' || value === 'this_hour' || value === 'today') return { kind: value };
  const m = /^minutes:(\d+)$/.exec(value);
  if (m) {
    const minutes = Number(m[1]);
    return Number.isFinite(minutes) && minutes > 0 ? { kind: 'minutes', minutes } : null;
  }
  return null;
}

/** Disponibilité en direct d'un type de billet, ou undefined si inconnue. */
export function pulseAvailability(pulse: EventPulse | null, ticketId: string | number): number | undefined {
  if (!pulse) return undefined;
  const row = pulse.tickets.find((t) => String(t.id) === String(ticketId));
  if (!row || typeof row.available !== 'number') return undefined;
  return row.available;
}

/**
 * « Chaud » : l'événement commence dans moins de 7 jours et n'est pas fini.
 * Seul un événement chaud justifie un rafraîchissement périodique.
 */
export function isPulseHot(
  event: { start_date?: string | null; end_date?: string | null },
  now: number = Date.now(),
): boolean {
  const start = event.start_date ? Date.parse(event.start_date) : NaN;
  const end = event.end_date ? Date.parse(event.end_date) : NaN;
  if (Number.isFinite(end) && end < now) return false;
  if (!Number.isFinite(start)) return false;
  return start - now < 7 * 24 * 60 * 60 * 1000;
}
