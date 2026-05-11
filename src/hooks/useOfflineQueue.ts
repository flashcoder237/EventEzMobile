/**
 * Hook pour gérer la file d'attente des messages hors ligne
 * Persiste les messages non envoyés (AsyncStorage scopé par userId) et les
 * renvoie quand la connexion revient.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedMessage, createQueuedMessage } from '../lib/utils/messagingHelpers';

const QUEUE_STORAGE_KEY_BASE = 'offline_queue';
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 5000;

interface UseOfflineQueueOptions {
  onSendMessage: (message: QueuedMessage) => Promise<boolean>;
  isConnected: boolean;
  /**
   * UserId du user courant — la queue est scopée par user pour éviter la
   * contamination entre comptes au logout / login successif.
   */
  userId?: string | number | null;
  /** Called when a message is permanently abandoned after MAX_RETRY_COUNT failures */
  onMessageFailed?: (message: QueuedMessage) => void;
}

export function useOfflineQueue({
  onSendMessage,
  isConnected,
  userId,
  onMessageFailed,
}: UseOfflineQueueOptions) {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = userId
    ? `${QUEUE_STORAGE_KEY_BASE}:${userId}`
    : QUEUE_STORAGE_KEY_BASE;

  // Charger la file depuis le storage
  const loadQueue = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedMessage[];
        setQueue(parsed);
      } else {
        setQueue([]);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement file offline:', error);
    }
  }, [storageKey]);

  // Sauvegarder la file dans le storage
  const saveQueue = useCallback(
    async (newQueue: QueuedMessage[]) => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(newQueue));
      } catch (error) {
        if (__DEV__) console.error('Erreur sauvegarde file offline:', error);
      }
    },
    [storageKey],
  );

  // Ajouter un message à la file
  const enqueue = useCallback(
    async (
      conversationId: string,
      content: string,
      replyTo?: string,
      attachments: any[] = [],
    ) => {
      const message = createQueuedMessage(conversationId, content, replyTo, attachments);

      setQueue(prev => {
        const newQueue = [...prev, message];
        saveQueue(newQueue);
        return newQueue;
      });

      return message.id;
    },
    [saveQueue],
  );

  // Retirer un message de la file
  const dequeue = useCallback(
    async (messageId: string) => {
      setQueue(prev => {
        const newQueue = prev.filter(m => m.id !== messageId);
        saveQueue(newQueue);
        return newQueue;
      });
    },
    [saveQueue],
  );

  // Mettre à jour le compteur de retry
  const incrementRetry = useCallback(
    async (messageId: string) => {
      setQueue(prev => {
        const newQueue = prev.map(m =>
          m.id === messageId ? { ...m, retryCount: m.retryCount + 1 } : m,
        );
        saveQueue(newQueue);
        return newQueue;
      });
    },
    [saveQueue],
  );

  // Marque un message comme failed (3 retries dépassés). Au lieu de dequeue
  // silencieusement, on conserve le message avec le flag `failed: true` pour
  // que l'UI puisse afficher une bulle "Échec — réessayer".
  const markFailed = useCallback(
    async (messageId: string) => {
      setQueue(prev => {
        const newQueue = prev.map(m =>
          m.id === messageId ? { ...m, failed: true } : m,
        );
        saveQueue(newQueue);
        return newQueue;
      });
    },
    [saveQueue],
  );

  // Retry manuel d'un message failed : reset retryCount + failed=false, et
  // déclenche syncQueue (qui sera triggered au prochain effect via queue change).
  const retryMessage = useCallback(
    async (messageId: string) => {
      setQueue(prev => {
        const newQueue = prev.map(m =>
          m.id === messageId ? { ...m, retryCount: 0, failed: false } : m,
        );
        saveQueue(newQueue);
        return newQueue;
      });
    },
    [saveQueue],
  );

  // Synchroniser les messages en attente
  const syncQueue = useCallback(async () => {
    if (isSyncing || !isConnected || queue.length === 0) return;

    setIsSyncing(true);

    for (const message of queue) {
      // Skip les messages déjà marqués failed — l'utilisateur doit les retry
      // manuellement (via retryMessage) ou les supprimer (dequeue).
      if (message.failed) {
        continue;
      }
      if (message.retryCount >= MAX_RETRY_COUNT) {
        // Au-delà de 3 retries, on marque le message comme failed au lieu de
        // le supprimer. L'UI affichera une bulle "Échec — réessayer/supprimer"
        // pour que l'utilisateur garde la main sur ses données.
        if (__DEV__)
          console.warn(
            `[OfflineQueue] Message ${message.id} marked failed after ${MAX_RETRY_COUNT} retries`,
          );
        onMessageFailed?.(message);
        await markFailed(message.id);
        continue;
      }

      try {
        const success = await onSendMessage(message);
        if (success) {
          await dequeue(message.id);
        } else {
          await incrementRetry(message.id);
        }
      } catch (error) {
        if (__DEV__) console.error('Erreur envoi message offline:', error);
        await incrementRetry(message.id);
      }
    }

    setIsSyncing(false);
  }, [queue, isConnected, isSyncing, onSendMessage, dequeue, incrementRetry, markFailed, onMessageFailed]);

  // Charger la file au montage et quand l'userId change (post-login)
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Synchroniser quand la connexion revient
  useEffect(() => {
    if (isConnected && queue.length > 0) {
      // Délai pour laisser la connexion se stabiliser
      syncTimeoutRef.current = setTimeout(() => {
        syncQueue();
      }, 1000);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isConnected, queue.length, syncQueue]);

  // Retry périodique si échec
  useEffect(() => {
    if (!isConnected) return;

    const hasFailedMessages = queue.some(
      m => m.retryCount > 0 && m.retryCount < MAX_RETRY_COUNT,
    );

    if (hasFailedMessages && !isSyncing) {
      const timeout = setTimeout(() => {
        syncQueue();
      }, RETRY_DELAY_MS);

      return () => clearTimeout(timeout);
    }
  }, [queue, isConnected, isSyncing, syncQueue]);

  return {
    queue,
    queueLength: queue.length,
    isSyncing,
    enqueue,
    dequeue,
    syncQueue,
    retryMessage,
  };
}

export default useOfflineQueue;
