/**
 * Repository messages — accès local (SQLite) à la messagerie.
 *
 * Toute la logique de lecture/écriture des messages en base locale passe ici.
 * Les écrans lisent via `getMessages`, le moteur de sync écrit via
 * `upsertMessages`, la file d'envoi via `insertPending` / `markSent`.
 */
import type { Message } from '../types';
import { getDatabase, runExclusive } from './database';

export interface MessageRow {
  id: string;
  conversation_id: string;
  server_id: number | null;
  payload: string;
  created_at: string;
  updated_at: string | null;
  is_deleted: number;
  send_state: 'sent' | 'pending' | 'failed';
}

/** Convertit une ligne SQLite en objet Message applicatif, ou null si le
 *  payload est corrompu (write partiel, encodage). Le null est filtré par
 *  l'appelant : une seule ligne illisible ne doit PAS casser toute la
 *  conversation (getMessages jetterait sinon → écran vide en offline). */
function rowToMessage(row: MessageRow): Message | null {
  try {
    const msg = JSON.parse(row.payload) as Message;
    if (row.send_state === 'failed') msg.is_failed = true;
    return msg;
  } catch {
    return null;
  }
}

const convKey = (conversationId: string | number) => String(conversationId);

/**
 * Insère ou met à jour un lot de messages (idempotent par id).
 * Utilisé par la sync delta ET par les événements WebSocket.
 */
export async function upsertMessages(
  conversationId: string | number,
  messages: Message[],
): Promise<void> {
  if (!messages.length) return;
  const db = await getDatabase();
  const cid = convKey(conversationId);

  // runExclusive : sérialise avec les autres écritures (WS, sync, outbox) pour
  // éviter "cannot start a transaction within a transaction" sur la connexion
  // unique d'expo-sqlite.
  await runExclusive(() => db.withTransactionAsync(() => upsertMessagesTx(db, cid, messages)));
}

/**
 * Lit les messages d'une conversation depuis le local, du plus récent au plus
 * ancien (comme l'API), paginé. Masque les soft-deleted ? Non : on les garde
 * (l'UI affiche « message supprimé »), cohérent avec le backend.
 *
 * @param limit  nombre max de messages
 * @param beforeServerId  charge les messages plus anciens que ce server_id
 *                        (pagination « charger plus »). Null = les plus récents.
 */
export async function getMessages(
  conversationId: string | number,
  limit = 30,
  beforeServerId?: number | null,
): Promise<Message[]> {
  const db = await getDatabase();
  const cid = convKey(conversationId);
  // Tri : server_id DESC (curseur stable) ; les messages optimistes (server_id
  // NULL) sont les plus récents → on les remonte via created_at en secours.
  let rows: MessageRow[];
  if (beforeServerId != null) {
    rows = await db.getAllAsync<MessageRow>(
      `SELECT * FROM messages
       WHERE conversation_id = ? AND server_id IS NOT NULL AND server_id < ?
       ORDER BY server_id DESC LIMIT ?`,
      cid, beforeServerId, limit,
    );
  } else {
    rows = await db.getAllAsync<MessageRow>(
      `SELECT * FROM messages WHERE conversation_id = ?
       ORDER BY (server_id IS NULL) DESC, server_id DESC, created_at DESC
       LIMIT ?`,
      cid, limit,
    );
  }
  return rows.map(rowToMessage).filter((m): m is Message => m !== null);
}

/** Nombre de messages stockés localement pour une conversation. */
export async function countMessages(conversationId: string | number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) as n FROM messages WHERE conversation_id = ?',
    convKey(conversationId),
  );
  return row?.n ?? 0;
}

// ── Curseur de synchro delta ────────────────────────────────────────────────

export async function getSyncCursor(conversationId: string | number): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ cursor: string | null }>(
    'SELECT cursor FROM sync_state WHERE conversation_id = ?',
    convKey(conversationId),
  );
  return row?.cursor ?? null;
}

export async function setSyncCursor(
  conversationId: string | number,
  cursor: string | null,
  syncedAt: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_state (conversation_id, cursor, synced_at)
     VALUES (?, ?, ?)
     ON CONFLICT(conversation_id) DO UPDATE SET cursor = excluded.cursor, synced_at = excluded.synced_at`,
    convKey(conversationId), cursor, syncedAt,
  );
}

// ── Outbox (envoi optimiste / offline) ──────────────────────────────────────

/** Insère un message optimiste (état pending) — affiché immédiatement. */
export async function insertPending(conversationId: string | number, message: Message): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO messages (id, conversation_id, server_id, payload, created_at, updated_at, is_deleted, send_state)
     VALUES (?, ?, NULL, ?, ?, ?, 0, 'pending')
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, send_state = 'pending'`,
    String(message.id), convKey(conversationId), JSON.stringify(message),
    message.created_at, message.updated_at ?? message.created_at,
  );
}

/** Remplace un message optimiste (tempId) par le message serveur confirmé. */
export async function reconcileSent(
  conversationId: string | number,
  tempId: string,
  serverMessage: Message,
): Promise<void> {
  const db = await getDatabase();
  await runExclusive(() => db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM messages WHERE id = ?', tempId);
    await upsertMessagesTx(db, convKey(conversationId), [serverMessage]);
  }));
}

/** Marque un message optimiste comme échoué (affichage bulle rouge). */
export async function markFailed(tempId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE messages SET send_state = 'failed' WHERE id = ?", tempId);
}

export async function deleteLocalMessage(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM messages WHERE id = ?', id);
}

/**
 * Retourne l'état d'envoi d'une ligne (pour le watchdog de réconciliation) :
 * - 'reconciled' si la ligne temp a disparu (remplacée par le serveur)
 * - 'pending' | 'failed' | 'sent' sinon
 */
export async function getMessageSendState(
  tempId: string,
): Promise<'reconciled' | 'pending' | 'failed' | 'sent'> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ send_state: string }>(
    'SELECT send_state FROM messages WHERE id = ?',
    tempId,
  );
  if (!row) return 'reconciled';
  return (row.send_state as any) ?? 'sent';
}

/**
 * Applique un patch partiel (édition, suppression, réaction reçue par WS) à un
 * message déjà en base. Sans ça, un message édité/supprimé en temps réel
 * réaffichait son ancien état au prochain reload (avant la resync delta).
 */
export async function patchLocalMessage(
  id: string | number,
  patch: Partial<Message>,
): Promise<void> {
  const db = await getDatabase();
  const key = String(id);
  await runExclusive(async () => {
    const row = await db.getFirstAsync<MessageRow>('SELECT * FROM messages WHERE id = ?', key);
    if (!row) return;
    const merged = { ...(JSON.parse(row.payload) as Message), ...patch };
    await db.runAsync(
      `UPDATE messages SET payload = ?, is_deleted = ?, updated_at = ? WHERE id = ?`,
      JSON.stringify(merged),
      merged.is_deleted ? 1 : 0,
      merged.updated_at ?? row.updated_at ?? merged.created_at,
      key,
    );
  });
}

// Helper interne : upsert dans une transaction déjà ouverte.
async function upsertMessagesTx(db: any, cid: string, messages: Message[]): Promise<void> {
  for (const m of messages) {
    const serverId = typeof m.id === 'number' ? m.id : Number.isFinite(Number(m.id)) ? Number(m.id) : null;
    await db.runAsync(
      `INSERT INTO messages (id, conversation_id, server_id, payload, created_at, updated_at, is_deleted, send_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'sent')
       ON CONFLICT(id) DO UPDATE SET
         payload = excluded.payload, server_id = excluded.server_id,
         updated_at = excluded.updated_at, is_deleted = excluded.is_deleted, send_state = 'sent'`,
      String(m.id), cid, serverId, JSON.stringify(m),
      m.created_at, m.updated_at ?? m.created_at, m.is_deleted ? 1 : 0,
    );
  }
}
