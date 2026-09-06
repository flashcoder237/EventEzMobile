/**
 * Rejeu de l'outbox — renvoie les messages en attente (offline) à la
 * reconnexion, attachments compris.
 *
 * Autonome (n'appelle pas l'UI) : upload des attachments locaux → envoi REST →
 * réconciliation de la ligne optimiste en base locale. Idempotent : une entrée
 * en cours ('sending') n'est pas reprise par un rejeu concurrent.
 */
import { messagesAPI } from '../api/messages';
import { reconcileSent } from './messageRepository';
import {
  getPendingOutbox,
  markOutboxSending,
  markOutboxFailed,
  removeOutbox,
  cleanupPersistedAttachments,
  type OutboxAttachment,
} from './outboxRepository';

const MAX_RETRY = 3;

// Verrou anti-concurrence : flushOutbox est déclenché à chaque bascule
// isConnected=true et au mount de chaque écran. Sans ce garde, un flapping
// réseau lançait deux flush en parallèle qui lisaient la même entrée 'pending'
// avant que markSending ne l'exclue → DOUBLE ENVOI côté serveur.
let _flushing = false;

async function uploadOne(att: OutboxAttachment, conversationId: string): Promise<string | null> {
  const formData = new FormData();
  const field = att.type === 'voice' ? 'audio' : 'file';
  formData.append(field, {
    uri: att.uri,
    name: att.name,
    type: att.type === 'image' ? 'image/jpeg' : att.type === 'voice' ? 'audio/m4a' : 'application/octet-stream',
  } as any);
  formData.append('type', att.type);
  formData.append('conversation_id', conversationId);
  try {
    const resp = att.type === 'voice'
      ? await messagesAPI.uploadVoiceMessage(formData)
      : await messagesAPI.uploadAttachment(formData);
    return resp.data?.id ? String(resp.data.id) : null;
  } catch {
    return null;
  }
}

/**
 * Rejoue toutes les entrées en attente. À appeler à la reconnexion (WS/réseau).
 * Retourne le nombre d'entrées envoyées avec succès.
 */
export async function flushOutbox(): Promise<number> {
  if (_flushing) return 0;
  _flushing = true;
  try {
    return await _flushOutboxInner();
  } finally {
    _flushing = false;
  }
}

async function _flushOutboxInner(): Promise<number> {
  const entries = await getPendingOutbox(20);
  let sent = 0;

  for (const entry of entries) {
    // Abandon définitif après MAX_RETRY échecs : la ligne reste 'failed' en base
    // (bulle rouge « Réessayer »), on ne boucle pas dessus indéfiniment.
    if (entry.retry_count >= MAX_RETRY) continue;

    await markOutboxSending(entry.temp_id);
    try {
      // 1. Upload des attachments locaux → ids serveur.
      const attachmentIds: string[] = [];
      for (const att of entry.attachments) {
        const id = await uploadOne(att, entry.conversation_id);
        if (!id) throw new Error('attachment upload failed');
        attachmentIds.push(id);
      }

      // 2. Envoi du message (REST).
      const resp = await messagesAPI.sendMessage({
        content: entry.content ?? '',
        conversation: entry.conversation_id,
        reply_to: entry.reply_to ?? undefined,
        attachment_ids: attachmentIds.length ? attachmentIds : undefined,
      });

      // 3. Réconcilie la ligne optimiste (temp_id) → message serveur.
      if (resp.data) {
        await reconcileSent(entry.conversation_id, entry.temp_id, resp.data);
      }
      await removeOutbox(entry.temp_id);
      // Nettoie les fichiers persistants copiés à l'enqueue (envoi confirmé).
      await cleanupPersistedAttachments(entry.attachments);
      sent += 1;
    } catch {
      await markOutboxFailed(entry.temp_id);
    }
  }

  return sent;
}
