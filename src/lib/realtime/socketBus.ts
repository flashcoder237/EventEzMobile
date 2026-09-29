/**
 * Bus temps réel partagé (micro-delight R2, V0).
 *
 * La socket de notifications (`useNotificationWebSocket`) s'y attache ; les
 * écrans s'abonnent à des topics (`event:`, `live:`, `organizer:`) et à des
 * types de message (`event.pulse`, `live.update`, `organizer.checkin`,
 * `sale.live`) sans connaître la socket. Un simple module : pas de contexte
 * React, donc aucun re-rendu global à chaque message.
 */
import { TopicManager } from './topicManager';

export type RealtimeMessage = { type?: string; topic?: string; [key: string]: unknown };
type Listener = (message: RealtimeMessage) => void;

export const topicManager = new TopicManager();

const byType = new Map<string, Set<Listener>>();
let sendRaw: ((message: Record<string, unknown>) => boolean) | null = null;

/** Appelé par la socket de notifications à l'ouverture. */
export function attachRealtimeSocket(send: (message: Record<string, unknown>) => boolean): void {
  sendRaw = send;
  topicManager.attach(send);
}

/** Appelé par la socket de notifications à la fermeture. */
export function detachRealtimeSocket(): void {
  sendRaw = null;
  topicManager.detach();
}

/** Aiguille un message reçu. Renvoie true s'il a été consommé ici. */
export function dispatchRealtime(message: RealtimeMessage): boolean {
  if (topicManager.handle(message)) return true;
  const type = typeof message.type === 'string' ? message.type : '';
  const set = byType.get(type);
  if (!set || set.size === 0) return false;
  set.forEach((fn) => {
    try {
      fn(message);
    } catch {
      /* un abonné défaillant ne bloque pas les autres */
    }
  });
  return true;
}

export function onRealtime(type: string, fn: Listener): () => void {
  let set = byType.get(type);
  if (!set) {
    set = new Set();
    byType.set(type, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
  };
}

/** Envoie un message client (ex. réaction). False si la socket est fermée. */
export function sendRealtime(message: Record<string, unknown>): boolean {
  if (!sendRaw) return false;
  try {
    return sendRaw(message);
  } catch {
    return false;
  }
}

export function isRealtimeAttached(): boolean {
  return sendRaw !== null;
}
