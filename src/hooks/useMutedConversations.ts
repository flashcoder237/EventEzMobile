/**
 * useMutedConversations — Liste des conversations mutées synchronisée serveur
 * (cross-device) avec cache AsyncStorage local pour réponse instantanée.
 *
 * - Au mount : on lit le cache local (réponse instantanée), puis on fetch
 *   `/user-messaging-settings/` pour réconcilier avec la source de vérité.
 * - `toggle(convId)` fait un appel REST `mute_conversation` /
 *   `unmute_conversation`. En cas d'échec on rollback l'état local.
 * - L'AsyncStorage reste un cache : le serveur est la vérité.
 *
 * L'API publique du hook (`isMuted`, `toggle`, `hydrated`, `mutedCount`)
 * reste identique à la version 100% locale précédente.
 */
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messagesAPI } from '../api';

const STORAGE_KEY = 'eventez:muted_conversations:v2';

export function useMutedConversations() {
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  const persist = useCallback(async (next: Set<string>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // ignore — la pref reste en mémoire pour cette session
    }
  }, []);

  // Mount : 1) load cache local, 2) sync serveur
  useEffect(() => {
    let active = true;

    (async () => {
      // 1) Cache local pour réponse instantanée
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setMuted(new Set(arr.map(String)));
        }
      } catch {
        // ignore
      }

      // 2) Source de vérité serveur
      try {
        const response = await messagesAPI.getUserMessagingSettings();
        const data = response.data;
        // Le viewset retourne un array filtré sur l'user courant — on prend [0]
        const settings = Array.isArray(data?.results)
          ? data.results[0]
          : Array.isArray(data)
            ? data[0]
            : data;
        if (settings && active) {
          const serverMuted = Array.isArray(settings.muted_conversations)
            ? settings.muted_conversations.map((id: any) => String(id))
            : [];
          const serverSet = new Set<string>(serverMuted);
          setMuted(serverSet);
          persist(serverSet);
        }
      } catch (error) {
        // En cas d'échec réseau : on garde le cache local, on ne bloque pas
        if (__DEV__) console.warn('[useMutedConversations] sync server failed', error);
      } finally {
        if (active) setHydrated(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [persist]);

  const toggle = useCallback(
    async (conversationId: string) => {
      const id = String(conversationId);
      const wasMuted = muted.has(id);

      // Optimistic update
      const next = new Set(muted);
      if (wasMuted) next.delete(id);
      else next.add(id);
      setMuted(next);
      persist(next);

      // Sync serveur
      try {
        if (wasMuted) {
          await messagesAPI.unmuteConversation(id);
        } else {
          await messagesAPI.muteConversation(id);
        }
      } catch (error) {
        // Rollback
        if (__DEV__) console.error('[useMutedConversations] toggle failed', error);
        const rollback = new Set(muted);
        setMuted(rollback);
        persist(rollback);
      }
    },
    [muted, persist],
  );

  const isMuted = useCallback(
    (conversationId: string) => muted.has(String(conversationId)),
    [muted],
  );

  return { isMuted, toggle, hydrated, mutedCount: muted.size };
}
