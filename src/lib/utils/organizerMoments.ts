/**
 * Logique pure des moments organisateur (round 2, lot O).
 *
 * Tout ce qui décide QUAND un moment joue vit ici, sans React ni stockage,
 * pour être testé : « depuis votre dernière visite » (O5), rail de retrait
 * (O6), tampon « EN LIGNE » (O4), jalons (O1/O2/O3), moments du jour J (O8),
 * bilan de fin de service au scanner (O9).
 *
 * Miroir de la logique web (`eventez-frontend/src/lib/utils/payoutRail.ts`,
 * `useSinceLastVisit`) — rien n'est importé du dépôt web.
 */
import type { Payout } from '../../types';

// ─── O5 — depuis votre dernière visite ─────────────────────────────────────

export interface SinceSnapshot {
  value: number;
  /** Horodatage ms du relevé. */
  at: number;
}

export interface SinceResult {
  /** Valeur de départ du comptage (l'ancienne), sinon null. */
  from: number | null;
  /** Écart strictement positif, sinon null (rien n'est affiché). */
  delta: number | null;
  /** Date du relevé précédent (ms), pour « depuis hier 18:40 ». */
  since: number | null;
}

/** Au moins 2 h entre deux visites pour parler de « dernière visite ». */
export const SINCE_MIN_AGE_MS = 2 * 60 * 60 * 1000;

export function computeSince(
  prev: SinceSnapshot | null | undefined,
  current: number,
  now: number,
  minAgeMs: number = SINCE_MIN_AGE_MS,
): SinceResult {
  const none: SinceResult = { from: null, delta: null, since: null };
  if (!prev || !Number.isFinite(prev.value) || !Number.isFinite(current)) return none;
  if (now - prev.at < minAgeMs) return none;
  const delta = current - prev.value;
  // Un écart négatif (annulations, retraits) n'est jamais mis en scène.
  if (delta <= 0) return none;
  return { from: prev.value, delta, since: prev.at };
}

/** Le relevé doit-il être remplacé ? Pas pendant la fenêtre de 2 h, pour ne
 *  pas « avaler » l'écart d'une visite à l'autre dans la même soirée. */
export function shouldStoreSnapshot(prev: SinceSnapshot | null | undefined, now: number, minAgeMs = SINCE_MIN_AGE_MS): boolean {
  return !prev || now - prev.at >= minAgeMs;
}

// ─── O4 — « EN LIGNE » ─────────────────────────────────────────────────────

export const ONLINE_STAMP_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** Le tampon « EN LIGNE » ne joue que pour une validation récente. */
export function isRecentValidation(event: { status?: string; validated_at?: string | null }, now: number): boolean {
  if (event?.status !== 'validated' || !event.validated_at) return false;
  const at = new Date(event.validated_at).getTime();
  return Number.isFinite(at) && now - at >= 0 && now - at <= ONLINE_STAMP_WINDOW_MS;
}

// ─── O1/O2/O3 — jalons ─────────────────────────────────────────────────────

export type MilestoneKind = 'first' | 'count' | 'sold_out';

export interface OrganizerMilestone {
  key: string;
  kind: MilestoneKind;
  eventId: string;
  eventTitle: string;
  participantName: string | null;
  amount: number | null;
  currency: string | null;
  count: number | null;
}

export function toOrganizerMilestone(n: {
  id?: string | number;
  notification_type?: string;
  title?: string;
  extra_data?: Record<string, any> | null;
} | null | undefined): OrganizerMilestone | null {
  if (!n || n.notification_type !== 'organizer_milestone') return null;
  const x = n.extra_data || {};
  const kind = x.kind as MilestoneKind;
  if (kind !== 'first' && kind !== 'count' && kind !== 'sold_out') return null;
  const eventId = x.event_id ? String(x.event_id) : '';
  if (!eventId) return null;
  const amount = Number(x.amount);
  const count = Number(x.count);
  return {
    key: String(n.id ?? `${eventId}:${kind}:${x.count ?? ''}`),
    kind,
    eventId,
    eventTitle: String(x.event_title || n.title || ''),
    participantName: x.participant_name ? String(x.participant_name) : null,
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency: x.currency ? String(x.currency) : null,
    count: Number.isFinite(count) && count > 0 ? count : null,
  };
}

// ─── O6 — rail de retrait ──────────────────────────────────────────────────

export type RailStepKey = 'requested' | 'approved' | 'sent';
export type RailStepState = 'done' | 'current' | 'todo' | 'warn';
export type RailTone = 'progress' | 'verifying' | 'sent' | 'failed' | 'cancelled';
export type DeliveryState = NonNullable<Payout['delivery_state']>;

export interface RailStep {
  key: RailStepKey;
  state: RailStepState;
  at: string | null;
}

export interface PayoutRailModel {
  steps: RailStep[];
  tone: RailTone;
}

type RailPayout = Pick<Payout, 'status' | 'requested_at'> &
  Partial<Pick<Payout, 'processed_at' | 'first_approved_at' | 'delivery_state'>>;

/** État de livraison : celui du serveur, sinon déduit du statut (anciens backends). */
export function deliveryStateOf(p: RailPayout): DeliveryState {
  if (p.delivery_state) return p.delivery_state;
  switch (p.status) {
    case 'completed':
      return 'sent';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    case 'processing':
      return 'sending';
    default:
      return p.first_approved_at ? 'approved' : 'requested';
  }
}

/**
 * Demandé → (Approuvé) → Envoyé. Règle de résilience payout : une issue
 * incertaine (`verifying`) n'est JAMAIS présentée comme « envoyé ».
 */
export function buildPayoutRail(p: RailPayout): PayoutRailModel {
  const state = deliveryStateOf(p);
  // L'étape « Approuvé » n'existe que si la double validation est en jeu.
  const dual = !!p.first_approved_at || state === 'approved';
  const keys: RailStepKey[] = dual ? ['requested', 'approved', 'sent'] : ['requested', 'sent'];
  const at: Record<RailStepKey, string | null> = {
    requested: p.requested_at || null,
    approved: p.first_approved_at || null,
    sent: state === 'sent' ? p.processed_at || null : null,
  };

  let reached = 0;
  if (state === 'approved' || state === 'sending' || state === 'verifying') reached = dual ? 1 : 0;
  if (state === 'sent') reached = keys.length - 1;

  let tone: RailTone = 'progress';
  if (state === 'verifying') tone = 'verifying';
  else if (state === 'sent') tone = 'sent';
  else if (state === 'failed') tone = 'failed';
  else if (state === 'cancelled') tone = 'cancelled';

  const steps: RailStep[] = keys.map((key, i) => {
    let s: RailStepState;
    if (i <= reached) s = 'done';
    else if (i === reached + 1) {
      s = tone === 'verifying' || tone === 'failed' ? 'warn' : tone === 'cancelled' ? 'todo' : 'current';
    } else s = 'todo';
    return { key, state: s, at: i <= reached ? at[key] : null };
  });
  return { steps, tone };
}

/** « •••42 » à partir du compte de destination (jamais le numéro complet). */
export function maskedTail(account?: string | null): string {
  const digits = (account || '').replace(/\D/g, '');
  return digits.length >= 2 ? `•••${digits.slice(-2)}` : '';
}

// ─── O7 — fonds libérés depuis la dernière visite ──────────────────────────

export interface ReleasedEarning {
  id: string;
  amount: number;
  event_title?: string;
  is_released?: boolean;
  released_at?: string | null;
}

/** Revenus libérés APRÈS la dernière visite (lastVisit en ms, null = première visite → rien). */
export function releasedSince<T extends ReleasedEarning>(earnings: T[], lastVisit: number | null): { total: number; items: T[] } {
  if (!lastVisit) return { total: 0, items: [] };
  const items = earnings.filter((e) => {
    if (!e.is_released || !e.released_at) return false;
    const at = new Date(e.released_at).getTime();
    return Number.isFinite(at) && at > lastVisit;
  });
  return { total: items.reduce((s, e) => s + (Number(e.amount) || 0), 0), items };
}

/** « Disponible dans 18 h » — heures entières restantes, seulement sous 48 h. */
export function hoursUntilRelease(releaseDate: string | null | undefined, now: number): number | null {
  if (!releaseDate) return null;
  const at = new Date(releaseDate).getTime();
  if (!Number.isFinite(at)) return null;
  const ms = at - now;
  if (ms <= 0 || ms > 48 * 3600 * 1000) return null;
  return Math.max(1, Math.ceil(ms / 3600000));
}

// ─── O8 — le jour J, la salle respire ──────────────────────────────────────

export interface LiveOpsSnapshot {
  checked_in?: number;
  check_in_percentage?: number;
  first_check_in_at?: string | null;
  timeline?: { buckets?: number[] } | null;
  recent?: Array<{ checked_in_at: string; holder_name?: string; ticket_type?: string }>;
}

export type LiveOpsMoment = 'doors' | 'peak' | 'nearly_full';

export const PEAK_MIN_ENTRIES = 10;
export const NEARLY_FULL_PCT = 90;

/**
 * UN seul moment par rafraîchissement, jamais au premier chargement
 * (`prev` null). Priorité : portes ouvertes > salle presque pleine > pic.
 */
export function pickLiveOpsMoment(prev: LiveOpsSnapshot | null, next: LiveOpsSnapshot): LiveOpsMoment | null {
  if (!prev) return null;
  if (!prev.first_check_in_at && next.first_check_in_at) return 'doors';
  const p0 = prev.check_in_percentage ?? 0;
  const p1 = next.check_in_percentage ?? 0;
  if (p0 < NEARLY_FULL_PCT && p1 >= NEARLY_FULL_PCT) return 'nearly_full';
  const b0 = prev.timeline?.buckets ?? [];
  const b1 = next.timeline?.buckets ?? [];
  const cur = b1.length ? b1[b1.length - 1] : 0;
  const prevMax = b0.length ? Math.max(...b0) : 0;
  const peakNow = cur >= PEAK_MIN_ENTRIES && cur >= Math.max(...b1) && cur > prevMax;
  if (peakNow) return 'peak';
  return null;
}

/** Clé stable d'un check-in récent (le backend n'envoie pas d'id). */
export function checkinKey(r: { checked_in_at: string; holder_name?: string; ticket_type?: string }): string {
  return `${r.checked_in_at}|${r.holder_name || ''}|${r.ticket_type || ''}`;
}

/** Check-ins présents dans `next` et absents de `prev` (rien au premier chargement). */
export function newCheckins<T extends { checked_in_at: string; holder_name?: string; ticket_type?: string }>(
  prev: T[] | null | undefined,
  next: T[] | null | undefined,
): T[] {
  if (!prev) return [];
  const seen = new Set(prev.map(checkinKey));
  return (next || []).filter((r) => !seen.has(checkinKey(r)));
}

// ─── O9 — scanner ──────────────────────────────────────────────────────────

/** Cadence moyenne (entrées / min) d'une session de scan. */
export function scanCadence(validCount: number, startedAt: number | null, now: number): number {
  if (startedAt == null || validCount <= 0) return 0;
  const minutes = Math.max(1, (now - startedAt) / 60000);
  return Math.round((validCount / minutes) * 10) / 10;
}

/** Palier de 100 scans validés franchi entre deux valeurs (puce discrète). */
export function crossedHundred(before: number, after: number): number | null {
  if (after <= before) return null;
  const b = Math.floor(before / 100);
  const a = Math.floor(after / 100);
  return a > b && a > 0 ? a * 100 : null;
}

/** Anti double-scan : même code relu dans la fenêtre → ignoré. */
export const SAME_CODE_WINDOW_MS = 1500;
export function isDuplicateScan(
  last: { code: string; at: number } | null,
  code: string,
  now: number,
  windowMs: number = SAME_CODE_WINDOW_MS,
): boolean {
  return !!last && last.code === code && now - last.at < windowMs;
}
