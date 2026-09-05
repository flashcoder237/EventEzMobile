/**
 * Repository outbox — file d'envoi persistante (SQLite).
 *
 * Contrairement à l'ancienne file AsyncStorage (texte seul), l'outbox stocke
 * aussi les ATTACHMENTS locaux (URI file://) : un message envoyé hors ligne
 * avec des images/vocaux est rejoué intégralement à la reconnexion, sans que
 * l'utilisateur ait à ré-attacher les fichiers.
 */
import { getDatabase } from './database';

export interface OutboxAttachment {
  uri: string;
  name: string;
  type: 'image' | 'voice' | 'document';
}

export interface OutboxEntry {
  temp_id: string;
  conversation_id: string;
  content: string | null;
  reply_to: string | null;
  attachments: OutboxAttachment[];
  state: 'pending' | 'sending' | 'failed';
  retry_count: number;
  created_at: string;
}

interface OutboxRow {
  temp_id: string;
  conversation_id: string;
  content: string | null;
  reply_to: string | null;
  attachments: string | null;
  state: 'pending' | 'sending' | 'failed';
  retry_count: number;
  created_at: string;
}

function rowToEntry(row: OutboxRow): OutboxEntry {
  return {
    ...row,
    attachments: row.attachments ? JSON.parse(row.attachments) : [],
  };
}

/** Ajoute un message à la file d'envoi (offline ou en cours). */
export async function enqueueOutbox(entry: {
  tempId: string;
  conversationId: string | number;
  content: string;
  replyTo?: string | number | null;
  attachments?: OutboxAttachment[];
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO outbox (temp_id, conversation_id, content, reply_to, attachments, state, retry_count, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)
     ON CONFLICT(temp_id) DO UPDATE SET
       content = excluded.content, attachments = excluded.attachments, state = 'pending'`,
    entry.tempId,
    String(entry.conversationId),
    entry.content ?? '',
    entry.replyTo != null ? String(entry.replyTo) : null,
    entry.attachments && entry.attachments.length ? JSON.stringify(entry.attachments) : null,
    new Date().toISOString(),
  );
}

/** Récupère les entrées à (re)jouer, les plus anciennes d'abord. */
export async function getPendingOutbox(limit = 20): Promise<OutboxEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT * FROM outbox WHERE state != 'sending' ORDER BY created_at ASC LIMIT ?`,
    limit,
  );
  return rows.map(rowToEntry);
}

export async function markOutboxSending(tempId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE outbox SET state = 'sending' WHERE temp_id = ?", tempId);
}

export async function markOutboxFailed(tempId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE outbox SET state = 'failed', retry_count = retry_count + 1 WHERE temp_id = ?",
    tempId,
  );
}

/** Retire une entrée de la file (envoi confirmé). */
export async function removeOutbox(tempId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outbox WHERE temp_id = ?', tempId);
}

/** Nombre d'entrées en attente pour une conversation (badge « X en attente »). */
export async function countPendingOutbox(conversationId: string | number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) as n FROM outbox WHERE conversation_id = ? AND state != 'sending'",
    String(conversationId),
  );
  return row?.n ?? 0;
}
