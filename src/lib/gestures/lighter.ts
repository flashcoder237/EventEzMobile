/**
 * G11 — mode briquet. Constantes et calculs purs (testés).
 *
 * Le serveur compte un briquet levé tant qu'il reçoit un heartbeat au moins
 * toutes les 15 s (`LIGHTER_TTL_SECONDS`) : on bat toutes les 10 s. Extinction
 * automatique après 3 min.
 */
export const LIGHTER_HEARTBEAT_MS = 10_000;
export const LIGHTER_MAX_MS = 180_000;

/** Inclinaison (−1..1) → angle de la flamme : elle penche à l'opposé, ±28°. */
export function flameAngle(tiltX: number): number {
  'worklet';
  const v = Math.max(-1, Math.min(1, tiltX || 0));
  return -v * 28;
}

/** Message WS : briquet levé / baissé sur le direct. */
export function lighterMessage(eventId: string, on: boolean) {
  return { type: 'lighter', topic: `live:${eventId}`, on };
}

/** Lecture tolérante de `live.update kind=lighters` → nombre (0 si illisible). */
export function readLighters(data: unknown): number {
  const n = Number((data as { lighters?: unknown } | null)?.lighters);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
