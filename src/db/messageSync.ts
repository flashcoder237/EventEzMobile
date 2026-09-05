/**
 * Moteur de synchro delta d'une conversation.
 *
 * Lit le curseur local, appelle GET /messages/sync/?since=<curseur>, écrit le
 * delta en base locale, avance le curseur, et reboucle tant que `has_more`.
 * Ne bloque jamais l'UI : les écrans lisent le local, ce moteur tourne en fond.
 */
import { messagesAPI } from '../api/messages';
import type { Message } from '../types';
import { getSyncCursor, setSyncCursor, upsertMessages } from './messageRepository';

export interface SyncResult {
  /** nombre de messages nouveaux/modifiés appliqués localement */
  applied: number;
  /** nouveau curseur après sync */
  cursor: string | null;
}

// Garde anti-boucle : nb max de pages delta enchaînées en une passe.
const MAX_PAGES = 20;

/**
 * Synchronise une conversation : applique le delta depuis le dernier curseur.
 * Idempotent — sûr à rappeler (au focus, à la reconnexion WS, périodiquement).
 */
export async function syncConversation(conversationId: string | number): Promise<SyncResult> {
  let cursor = await getSyncCursor(conversationId);
  let applied = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params: { conversation: string | number; since?: string } = { conversation: conversationId };
    if (cursor) params.since = cursor;

    const resp = await messagesAPI.syncMessages(params);
    const data = resp.data as { results: Message[]; next_since: string | null; has_more: boolean };
    const results = data.results || [];

    if (results.length) {
      await upsertMessages(conversationId, results);
      applied += results.length;
    }

    // Avance le curseur. Le backend renvoie TOUJOURS next_since (curseur
    // composite `updated_at|id`, opaque côté client) — y compris quand il n'y a
    // rien de nouveau (il rend alors le curseur reçu).
    if (data.next_since) {
      cursor = data.next_since;
      await setSyncCursor(conversationId, cursor, new Date().toISOString());
    }

    if (!data.has_more) break;
  }

  return { applied, cursor };
}
