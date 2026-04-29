/**
 * useCheckinQueue — Queue locale persistante pour les scans check-in.
 *
 * Quand le réseau est down pendant un event, on stocke `{ registrationId,
 * autoCheckIn, scannedAt }` dans AsyncStorage. Au retour de connexion, le
 * hook flush la queue par batches en appelant `verifyAndCheckIn` pour chaque
 * entrée. Échecs persistants (404, 400 définitif) → retirés de la queue avec
 * un log. Erreurs réseau → restent en queue pour la prochaine tentative.
 *
 * Le QRScannerScreen consomme :
 *   - `enqueue(...)` quand un scan arrive en mode offline
 *   - `pendingCount` pour afficher un badge "12 scans en attente"
 *   - `flush()` (auto-déclenché au retour de connexion ou manuellement)
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { registrationsAPI } from '../api';

const QUEUE_KEY = 'eventez:checkin_queue:v1';

export interface CheckinQueueEntry {
  /** Local UUID for the entry (collision-safe with concurrent scans). */
  localId: string;
  registrationId: string;
  autoCheckIn: boolean;
  /** ISO timestamp of the scan (preserved for audit). */
  scannedAt: string;
  /** eventId qui a émis le scan — sert de filtre lors du flush. */
  eventId?: string;
  /** Nombre de tentatives de flush. */
  attempts: number;
}

async function readQueue(): Promise<CheckinQueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(entries: CheckinQueueEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  } catch {
    // ignore — queue resync au prochain mount
  }
}

function generateLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useCheckinQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const flushingRef = useRef(false);

  // Hydrate count au mount + écoute changements de connexion
  useEffect(() => {
    let active = true;
    readQueue().then((q) => {
      if (active) setPendingCount(q.length);
    });
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const enqueue = useCallback(
    async (registrationId: string, autoCheckIn: boolean, eventId?: string) => {
      const queue = await readQueue();
      queue.push({
        localId: generateLocalId(),
        registrationId,
        autoCheckIn,
        eventId,
        scannedAt: new Date().toISOString(),
        attempts: 0,
      });
      await writeQueue(queue);
      setPendingCount(queue.length);
    },
    [],
  );

  const flush = useCallback(async () => {
    if (flushingRef.current) return { synced: 0, failed: 0 };
    flushingRef.current = true;
    setIsFlushing(true);
    try {
      let queue = await readQueue();
      if (queue.length === 0) {
        return { synced: 0, failed: 0 };
      }

      const remaining: CheckinQueueEntry[] = [];
      let synced = 0;
      let failed = 0;

      for (const entry of queue) {
        try {
          await registrationsAPI.verifyAndCheckIn(entry.registrationId, entry.autoCheckIn);
          synced += 1;
        } catch (error: any) {
          const status = error?.response?.status;
          // 404 (not found) ou 400 (déjà utilisé) = échec définitif → drop
          if (status === 404 || status === 400) {
            failed += 1;
            if (__DEV__) console.warn(`[CheckinQueue] Drop entry ${entry.localId}: HTTP ${status}`);
            continue;
          }
          // Réseau / 5xx → garde en queue avec compteur
          remaining.push({ ...entry, attempts: entry.attempts + 1 });
        }
      }

      await writeQueue(remaining);
      setPendingCount(remaining.length);
      return { synced, failed };
    } finally {
      flushingRef.current = false;
      setIsFlushing(false);
    }
  }, []);

  // Auto-flush au retour de connexion
  const wasOfflineRef = useRef(false);
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      // Petit délai pour laisser le réseau se stabiliser
      const t = setTimeout(() => {
        flush().catch(() => { /* ignore — la queue persiste */ });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isOnline, flush]);

  const clear = useCallback(async () => {
    await writeQueue([]);
    setPendingCount(0);
  }, []);

  return {
    enqueue,
    flush,
    clear,
    pendingCount,
    isFlushing,
    isOnline,
  };
}
