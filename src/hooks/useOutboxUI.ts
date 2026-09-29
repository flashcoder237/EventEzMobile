/**
 * Hook d'affichage de l'outbox SQLite pour l'UI messagerie (banner « en
 * attente », modale « échecs », retry, suppression).
 *
 * Remplace l'ancien useOfflineQueue (AsyncStorage) qui n'était plus alimenté
 * depuis la migration vers l'outbox SQLite (Phase 5). Interface compatible
 * (queue/isSyncing/retryMessage/dequeue) pour un branchement minimal.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  getOutboxForConversation,
  onOutboxChange,
  removeOutbox,
  resetOutboxRetry,
  type OutboxEntry,
} from '../db/outboxRepository';
import { flushOutbox } from '../db/outboxSync';

export interface OutboxUIItem {
  id: string;               // temp_id
  conversationId: string;
  content: string;
  failed: boolean;
  timestamp: number;
}

function toUIItem(e: OutboxEntry): OutboxUIItem {
  return {
    id: e.temp_id,
    conversationId: e.conversation_id,
    content: e.content ?? '',
    failed: e.state === 'failed',
    timestamp: Date.parse(e.created_at) || Date.now(),
  };
}

export function useOutboxUI(conversationId: string | number | null, isConnected: boolean) {
  const [queue, setQueue] = useState<OutboxUIItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    if (conversationId == null) { setQueue([]); return; }
    try {
      const entries = await getOutboxForConversation(conversationId);
      setQueue(entries.map(toUIItem));
    } catch {
      setQueue([]);
    }
  }, [conversationId]);

  // Rafraîchit au montage puis À CHAQUE écriture de l'outbox (enqueue, envoi,
  // ack, échec, retry, suppression — notifiées par outboxRepository), au lieu
  // de sonder SQLite toutes les 3 s tant que la conversation est ouverte.
  // Les rafales (flushOutbox = N écritures) sont regroupées en une lecture.
  // Filet de sécurité : relecture lente (30 s) si une écriture échappait au
  // module (ex. purge de la base).
  useEffect(() => {
    refresh();
    let pending: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onOutboxChange(() => {
      if (pending) return;
      pending = setTimeout(() => { pending = null; refresh(); }, 50);
    });
    const safety = setInterval(refresh, 30000);
    return () => {
      unsubscribe();
      clearInterval(safety);
      if (pending) clearTimeout(pending);
    };
  }, [refresh]);

  // Rejeu à la reconnexion (flushOutbox est idempotent / verrouillé).
  useEffect(() => {
    if (isConnected) {
      setIsSyncing(true);
      flushOutbox().finally(() => { setIsSyncing(false); refresh(); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const retryMessage = useCallback(async (tempId: string) => {
    // Retry manuel : réarme l'entrée (retry_count=0) pour passer la garde
    // MAX_RETRY de flushOutbox, puis relance.
    await resetOutboxRetry(tempId).catch(() => {});
    setIsSyncing(true);
    await flushOutbox().catch(() => {});
    setIsSyncing(false);
    refresh();
  }, [refresh]);

  const dequeue = useCallback(async (tempId: string) => {
    await removeOutbox(tempId).catch(() => {});
    refresh();
  }, [refresh]);

  return { queue, isSyncing, retryMessage, dequeue, refresh };
}

export default useOutboxUI;
