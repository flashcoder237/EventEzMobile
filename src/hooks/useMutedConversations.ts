/**
 * useMutedConversations — Liste persistante (AsyncStorage) des conversations
 * mutées localement. Les notifications push pour ces conversations seront
 * filtrées (à câbler au handler de notif quand le scope inclut le push), et
 * la badge "non-lus" peut être visuellement atténuée.
 *
 * 100% client-side pour cette première version. Côté backend, on pourra
 * plus tard exposer un flag `Conversation.muted_by_users` pour que le mute
 * suive l'utilisateur sur ses différents devices.
 */
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'eventez:muted_conversations:v1';

export function useMutedConversations() {
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) return;
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setMuted(new Set(arr.map(String)));
        }
      } catch {
        // ignore — start with empty set
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (next: Set<string>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // ignore — la pref reste en mémoire pour cette session
    }
  }, []);

  const toggle = useCallback(
    async (conversationId: string) => {
      setMuted((prev) => {
        const next = new Set(prev);
        if (next.has(conversationId)) {
          next.delete(conversationId);
        } else {
          next.add(conversationId);
        }
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isMuted = useCallback((conversationId: string) => muted.has(conversationId), [muted]);

  return { isMuted, toggle, hydrated, mutedCount: muted.size };
}
