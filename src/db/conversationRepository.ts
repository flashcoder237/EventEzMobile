/**
 * Repository conversations — miroir local (SQLite) de l'inbox.
 *
 * L'inbox lit ici pour un affichage instantané, et se rafraîchit en fond.
 * Contrairement aux messages, il n'y a pas (encore) d'endpoint delta côté
 * backend pour les conversations : on persiste la liste renvoyée par l'API et
 * on applique localement les mises à jour temps réel (nouveau message, unread).
 */
import type { Conversation } from '../types';
import { getDatabase, runExclusive } from './database';

interface ConversationRow {
  id: string;
  payload: string;
  last_message_at: string | null;
  updated_at: string | null;
  unread_count: number;
}

function rowToConversation(row: ConversationRow): Conversation | null {
  try {
    const c = JSON.parse(row.payload) as Conversation;
    // Le compteur non-lu local prime (mis à jour en temps réel par le WS).
    (c as any).unread_count = row.unread_count;
    return c;
  } catch {
    return null; // ligne corrompue → ignorée (ne casse pas toute l'inbox)
  }
}

/** Persiste (upsert) un lot de conversations renvoyé par l'API. */
export async function upsertConversations(conversations: Conversation[]): Promise<void> {
  if (!conversations.length) return;
  const db = await getDatabase();
  await runExclusive(() => db.withTransactionAsync(async () => {
    for (const c of conversations) {
      const lastMsgAt =
        (c as any).last_message_at ?? (c as any).last_message?.created_at ?? null;
      await db.runAsync(
        `INSERT INTO conversations (id, payload, last_message_at, updated_at, unread_count)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload = excluded.payload,
           last_message_at = excluded.last_message_at,
           updated_at = excluded.updated_at,
           unread_count = excluded.unread_count`,
        String(c.id),
        JSON.stringify(c),
        lastMsgAt,
        (c as any).updated_at ?? lastMsgAt,
        (c as any).unread_count ?? 0,
      );
    }
  }));
}

/** Lit l'inbox locale, triée par dernier message (comme l'API). */
export async function getConversations(limit = 50): Promise<Conversation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ConversationRow>(
    `SELECT * FROM conversations
     ORDER BY (last_message_at IS NULL), last_message_at DESC
     LIMIT ?`,
    limit,
  );
  return rows.map(rowToConversation).filter((c): c is Conversation => c !== null);
}

/**
 * Met à jour localement une conversation à l'arrivée d'un message temps réel :
 * remonte last_message_at et incrémente le compteur non-lu, SANS refetch réseau.
 */
export async function bumpConversationOnNewMessage(
  conversationId: string | number,
  lastMessageAt: string,
  incrementUnread: boolean,
): Promise<void> {
  const db = await getDatabase();
  // MAX(last_message_at, ?) : un message.new arrivé out-of-order (event WS en
  // retard, rejeu) ne doit jamais faire REDESCENDRE last_message_at et
  // réordonner l'inbox à tort. COALESCE gère la 1re fois (colonne NULL).
  await db.runAsync(
    `UPDATE conversations
     SET last_message_at = MAX(COALESCE(last_message_at, ''), ?),
         unread_count = unread_count + ?
     WHERE id = ?`,
    lastMessageAt,
    incrementUnread ? 1 : 0,
    String(conversationId),
  );
}

/** Remet à zéro le compteur non-lu d'une conversation (ouverture / mark-read). */
export async function clearUnread(conversationId: string | number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE conversations SET unread_count = 0 WHERE id = ?',
    String(conversationId),
  );
}
