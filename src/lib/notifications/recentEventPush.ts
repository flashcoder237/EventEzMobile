/**
 * Dernière notification « événement imminent » reçue (rappel 1 h avant,
 * event_live…). Sert de garde aux haptiques d'écran (H2) : si le téléphone
 * vient déjà de vibrer pour la même raison, l'écran ne revibre pas.
 */
const EVENT_PUSH_TYPES = new Set(['event_reminder', 'event_live', 'event_starting', 'session_reminder']);

let lastEventPushAt = 0;

/** À appeler à la réception d'une notification (premier plan). */
export function noteNotificationReceived(type: unknown, now: number = Date.now()): void {
  if (typeof type === 'string' && EVENT_PUSH_TYPES.has(type)) lastEventPushAt = now;
}

/** true si une notification d'événement est arrivée il y a moins de `ms`. */
export function eventPushWithin(ms: number, now: number = Date.now()): boolean {
  return lastEventPushAt > 0 && now - lastEventPushAt < ms;
}

/** Tests uniquement. */
export function __resetRecentEventPush(): void {
  lastEventPushAt = 0;
}
