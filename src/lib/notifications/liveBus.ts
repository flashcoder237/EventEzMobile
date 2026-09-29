/**
 * Bus des notifications reçues EN DIRECT (WebSocket), pour les « moments »
 * qui méritent mieux qu'un +1 sur la cloche : « Vous êtes entré · 213e »
 * (S3), jalons organisateur, etc.
 *
 * Volontairement minuscule : NotificationContext publie, les hôtes de moments
 * s'abonnent. Rien n'est rejoué au montage — seuls les événements survenus
 * pendant que l'app est ouverte déclenchent un moment.
 *
 * Miroir de `eventez-frontend/src/lib/notifications/liveBus.ts`.
 */
export interface LiveNotification {
  id?: string | number;
  notification_type?: string;
  title?: string;
  message?: string;
  extra_data?: Record<string, any> | null;
  [key: string]: any;
}

type Listener = (n: LiveNotification) => void;

const listeners = new Set<Listener>();

export function emitLiveNotification(n: LiveNotification): void {
  listeners.forEach((l) => {
    try {
      l(n);
    } catch {
      /* un moment qui plante ne doit jamais casser la réception */
    }
  });
}

export function subscribeLiveNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
