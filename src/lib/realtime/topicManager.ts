/**
 * Gestionnaire d'abonnements aux topics temps réel (micro-delight R2, V0).
 *
 * Tous les topics passent par la socket de notifications existante
 * (`/ws/notifications/`) : aucune socket de plus. Le serveur refuse au-delà de
 * 3 topics par socket ; le client compte donc les références et n'envoie que
 * les 3 premiers topics demandés, les suivants attendent qu'une place se
 * libère. Un topic refusé (`forbidden`, `invalid`) n'est jamais redemandé tant
 * qu'il est retenu : pas de boucle d'abonnement.
 */

export type TopicStatus = 'pending' | 'subscribed' | 'forbidden' | 'invalid';

export const MAX_TOPICS = 3;

type Sender = (message: Record<string, unknown>) => boolean;
type StatusListener = (topic: string, status: TopicStatus | undefined) => void;

export class TopicManager {
  private readonly max: number;
  /** Topic → nombre de consommateurs. L'ordre d'insertion fixe la priorité. */
  private refs = new Map<string, number>();
  /** Topics pour lesquels un `subscribe` a été envoyé sur la socket courante. */
  private active = new Set<string>();
  private status = new Map<string, TopicStatus>();
  /** Topics refusés pour `limit` : pas de nouvelle demande avant une vraie
   *  libération ou une nouvelle socket (sinon subscribe → limit → subscribe
   *  en boucle serrée contre le serveur). */
  private limited = new Set<string>();
  private sender: Sender | null = null;
  private listeners = new Set<StatusListener>();

  constructor(max = MAX_TOPICS) {
    this.max = max;
  }

  /** Socket ouverte : on (ré)abonne les topics retenus. */
  attach(sender: Sender): void {
    this.sender = sender;
    this.active.clear();
    this.limited.clear();
    this.refs.forEach((_n, topic) => {
      // Une nouvelle socket repart de zéro, sauf les refus explicites.
      if (this.status.get(topic) !== 'forbidden' && this.status.get(topic) !== 'invalid') {
        this.setStatus(topic, 'pending');
      }
    });
    this.reconcile();
  }

  /** Socket fermée : plus rien n'est actif. */
  detach(): void {
    this.sender = null;
    this.active.clear();
    this.refs.forEach((_n, topic) => {
      if (this.status.get(topic) === 'subscribed') this.setStatus(topic, 'pending');
    });
  }

  /** Retient un topic ; renvoie la fonction de libération (idempotente). */
  acquire(topic: string): () => void {
    const n = this.refs.get(topic) ?? 0;
    this.refs.set(topic, n + 1);
    if (n === 0) {
      this.setStatus(topic, 'pending');
      this.reconcile();
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.release(topic);
    };
  }

  /** Traite les accusés du serveur. Renvoie true si le message est consommé. */
  handle(message: { type?: unknown; topic?: unknown; reason?: unknown }): boolean {
    const topic = typeof message.topic === 'string' ? message.topic : null;
    switch (message.type) {
      case 'subscribed':
        if (topic && this.refs.has(topic)) this.setStatus(topic, 'subscribed');
        return true;
      case 'unsubscribed':
        return true;
      case 'subscribe_error': {
        if (!topic) return true;
        this.active.delete(topic);
        if (message.reason === 'limit') {
          // Le serveur compte encore un ancien abonnement : on patiente, la
          // prochaine libération relancera la réconciliation.
          if (this.refs.has(topic)) {
            this.limited.add(topic);
            this.setStatus(topic, 'pending');
          }
        } else if (this.refs.has(topic)) {
          this.setStatus(topic, message.reason === 'invalid' ? 'invalid' : 'forbidden');
        }
        this.reconcile();
        return true;
      }
      default:
        return false;
    }
  }

  getStatus(topic: string): TopicStatus | undefined {
    return this.status.get(topic);
  }

  /** Topics effectivement demandés au serveur (tests, diagnostic). */
  activeTopics(): string[] {
    return Array.from(this.active);
  }

  onStatus(fn: StatusListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private release(topic: string): void {
    const n = this.refs.get(topic) ?? 0;
    if (n > 1) {
      this.refs.set(topic, n - 1);
      return;
    }
    this.refs.delete(topic);
    this.limited.delete(topic);
    // Une place se libère côté serveur : les topics en attente de place
    // peuvent retenter leur chance.
    if (this.active.delete(topic)) {
      this.send({ type: 'unsubscribe', topic });
      this.limited.clear();
    }
    this.setStatus(topic, undefined);
    this.reconcile();
  }

  private reconcile(): void {
    if (!this.sender) return;
    for (const topic of this.refs.keys()) {
      if (this.active.size >= this.max) break;
      if (this.active.has(topic)) continue;
      const st = this.status.get(topic);
      if (st === 'forbidden' || st === 'invalid') continue;
      if (this.limited.has(topic)) continue;
      if (this.send({ type: 'subscribe', topic })) this.active.add(topic);
    }
  }

  private send(message: Record<string, unknown>): boolean {
    if (!this.sender) return false;
    try {
      return this.sender(message);
    } catch {
      return false;
    }
  }

  private setStatus(topic: string, st: TopicStatus | undefined): void {
    if (this.status.get(topic) === st) return;
    if (st === undefined) this.status.delete(topic);
    else this.status.set(topic, st);
    this.listeners.forEach((fn) => {
      try {
        fn(topic, st);
      } catch {
        /* un écouteur défaillant ne bloque pas les autres */
      }
    });
  }
}
