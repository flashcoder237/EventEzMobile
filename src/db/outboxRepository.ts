/**
 * Repository outbox — file d'envoi persistante (SQLite).
 *
 * Contrairement à l'ancienne file AsyncStorage (texte seul), l'outbox stocke
 * aussi les ATTACHMENTS locaux (URI file://) : un message envoyé hors ligne
 * avec des images/vocaux est rejoué intégralement à la reconnexion, sans que
 * l'utilisateur ait à ré-attacher les fichiers.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from './database';

// Dossier PERSISTANT pour les fichiers en attente d'envoi. Les attachments
// sélectionnés vivent dans le cache OS (volatile, purgeable) : si l'utilisateur
// reste offline longtemps, le cache peut être vidé avant le rejeu → fichier
// perdu. On copie donc chaque fichier ici (documentDirectory, non purgé) au
// moment de l'enqueue.
const OUTBOX_DIR = `${FileSystem.documentDirectory}outbox/`;

// Cap d'entrées en file : au-delà, éviction FIFO (anti-remplissage disque).
const OUTBOX_MAX_ENTRIES = 100;

async function persistAttachment(att: OutboxAttachment): Promise<OutboxAttachment> {
  try {
    await FileSystem.makeDirectoryAsync(OUTBOX_DIR, { intermediates: true });
    const safe = (att.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = `${OUTBOX_DIR}${Date.now()}-${safe}`;
    await FileSystem.copyAsync({ from: att.uri, to: dest });
    return { ...att, uri: dest };
  } catch {
    // Copie impossible (fichier déjà parti, quota…) → on garde l'URI d'origine.
    return att;
  }
}

/** Supprime les fichiers persistants d'une entrée rejouée (nettoyage). */
export async function cleanupPersistedAttachments(attachments: OutboxAttachment[]): Promise<void> {
  for (const att of attachments) {
    if (att.uri.startsWith(OUTBOX_DIR)) {
      try { await FileSystem.deleteAsync(att.uri, { idempotent: true }); } catch { /* noop */ }
    }
  }
}

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
  // Garde anti-remplissage disque : cap le nombre d'entrées outbox. Au-delà,
  // on évince les plus VIEILLES (FIFO, fichiers nettoyés) — sinon un usage
  // offline intensif (des centaines de médias) pourrait remplir le stockage.
  try {
    const cnt = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM outbox');
    if ((cnt?.n ?? 0) >= OUTBOX_MAX_ENTRIES) {
      // On n'évince JAMAIS une entrée 'sending' : son POST REST est peut-être en
      // vol et ses fichiers en cours de lecture. La supprimer = upload cassé +
      // markOutboxFailed no-op sur ligne disparue = message perdu sans trace.
      const oldest = await db.getAllAsync<OutboxRow>(
        "SELECT * FROM outbox WHERE state != 'sending' ORDER BY created_at ASC LIMIT ?",
        (cnt!.n - OUTBOX_MAX_ENTRIES) + 1,
      );
      for (const row of oldest) {
        if (row.attachments) await cleanupPersistedAttachments(JSON.parse(row.attachments));
        await db.runAsync('DELETE FROM outbox WHERE temp_id = ?', row.temp_id);
      }
    }
  } catch { /* best-effort */ }
  // Copie les fichiers vers le stockage persistant avant de mémoriser leur URI.
  const persisted = entry.attachments && entry.attachments.length
    ? await Promise.all(entry.attachments.map(persistAttachment))
    : [];
  await db.runAsync(
    `INSERT INTO outbox (temp_id, conversation_id, content, reply_to, attachments, state, retry_count, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)
     ON CONFLICT(temp_id) DO UPDATE SET
       content = excluded.content, attachments = excluded.attachments, state = 'pending'`,
    entry.tempId,
    String(entry.conversationId),
    entry.content ?? '',
    entry.replyTo != null ? String(entry.replyTo) : null,
    persisted.length ? JSON.stringify(persisted) : null,
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

/** Réarme une entrée échouée pour un nouvel essai manuel (reset retry). */
export async function resetOutboxRetry(tempId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE outbox SET state = 'pending', retry_count = 0 WHERE temp_id = ?",
    tempId,
  );
}

/** Retire une entrée de la file (envoi confirmé). */
export async function removeOutbox(tempId: string): Promise<void> {
  const db = await getDatabase();
  // Nettoie les fichiers persistés AVANT de supprimer la ligne, sinon une
  // suppression manuelle (dequeue) d'un message échoué laissait ses fichiers
  // orphelins à vie dans documentDirectory/outbox/. Idempotent.
  try {
    const row = await db.getFirstAsync<OutboxRow>('SELECT * FROM outbox WHERE temp_id = ?', tempId);
    if (row?.attachments) {
      await cleanupPersistedAttachments(JSON.parse(row.attachments));
    }
  } catch {
    /* best-effort */
  }
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

/** Compteurs globaux (tous fils) pour le badge inbox : en attente vs échoués. */
export async function countOutboxTotals(): Promise<{ pending: number; failed: number }> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ state: string; n: number }>(
    "SELECT state, COUNT(*) as n FROM outbox GROUP BY state",
  );
  let pending = 0;
  let failed = 0;
  for (const r of rows) {
    if (r.state === 'failed') failed += r.n;
    else pending += r.n; // 'pending' + 'sending'
  }
  return { pending, failed };
}

/** Les entrées d'une conversation (pour l'UI liste « en attente »). */
export async function getOutboxForConversation(conversationId: string | number): Promise<OutboxEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OutboxRow>(
    'SELECT * FROM outbox WHERE conversation_id = ? ORDER BY created_at ASC',
    String(conversationId),
  );
  return rows.map(rowToEntry);
}
