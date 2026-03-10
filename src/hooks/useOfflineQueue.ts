/**
 * Hook pour gérer la file d'attente des messages hors ligne
 * Persiste les messages non envoyés et les renvoie quand la connexion revient
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedMessage, createQueuedMessage } from '../lib/utils/messagingHelpers';

const QUEUE_STORAGE_KEY = '@eventez_message_queue';
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 5000;

interface UseOfflineQueueOptions {
  onSendMessage: (message: QueuedMessage) => Promise<boolean>;
  isConnected: boolean;
  /** Called when a message is permanently abandoned after MAX_RETRY_COUNT failures */
  onMessageFailed?: (message: QueuedMessage) => void;
}

export function useOfflineQueue({ onSendMessage, isConnected, onMessageFailed }: UseOfflineQueueOptions) {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Charger la file depuis le storage
  const loadQueue = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedMessage[];
        setQueue(parsed);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement file offline:', error);
    }
  }, []);

  // Sauvegarder la file dans le storage
  const saveQueue = useCallback(async (newQueue: QueuedMessage[]) => {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
    } catch (error) {
      if (__DEV__) console.error('Erreur sauvegarde file offline:', error);
    }
  }, []);

  // Ajouter un message à la file
  const enqueue = useCallback(async (
    conversationId: string,
    content: string,
    replyTo?: string,
    attachments: any[] = []
  ) => {
    const message = createQueuedMessage(conversationId, content, replyTo, attachments);

    setQueue(prev => {
      const newQueue = [...prev, message];
      saveQueue(newQueue);
      return newQueue;
    });

    return message.id;
  }, [saveQueue]);

  // Retirer un message de la file
  const dequeue = useCallback(async (messageId: string) => {
    setQueue(prev => {
      const newQueue = prev.filter(m => m.id !== messageId);
      saveQueue(newQueue);
      return newQueue;
    });
  }, [saveQueue]);

  // Mettre à jour le compteur de retry
  const incrementRetry = useCallback(async (messageId: string) => {
    setQueue(prev => {
      const newQueue = prev.map(m =>
        m.id === messageId ? { ...m, retryCount: m.retryCount + 1 } : m
      );
      saveQueue(newQueue);
      return newQueue;
    });
  }, [saveQueue]);

  // Synchroniser les messages en attente
  const syncQueue = useCallback(async () => {
    if (isSyncing || !isConnected || queue.length === 0) return;

    setIsSyncing(true);

    for (const message of queue) {
      if (message.retryCount >= MAX_RETRY_COUNT) {
        // Abandonner après trop de tentatives
        if (__DEV__) console.warn(`[OfflineQueue] Message ${message.id} abandoned after ${MAX_RETRY_COUNT} retries`);
        onMessageFailed?.(message);
        await dequeue(message.id);
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
  }, [queue, isConnected, isSyncing, onSendMessage, dequeue, incrementRetry]);

  // Charger la file au montage
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

    const hasFailedMessages = queue.some(m => m.retryCount > 0 && m.retryCount < MAX_RETRY_COUNT);

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
  };
}

export default useOfflineQueue;
