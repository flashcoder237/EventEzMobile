/**
 * useCheckinManifest — Validation de check-in OFFLINE via manifeste local.
 *
 * Aux portiques à connectivité faible, la file `useCheckinQueue` enfile les
 * scans en aveugle (succès optimiste : n'importe quel QR passe, on vérifie plus
 * tard). Ce hook change la donne : on télécharge UNE fois (connecté) la liste
 * des billets valides de l'event (`getCheckinManifest`), puis on vérifie chaque
 * QR LOCALEMENT — vrai vert/rouge à la porte, même sans réseau :
 *
 *   - ticket_id dans le manifeste + non validé   → VALIDE (avec nom du porteur)
 *   - ticket_id déjà validé (manifeste ou local)  → DÉJÀ VALIDÉ
 *   - ticket_id absent                            → INCONNU (invalide / forgé)
 *
 * Les check-ins locaux sont persistés puis poussés en batch au serveur
 * (`syncCheckins`, idempotent) dès le retour de connexion.
 *
 * Ne gère que les QR ticket-level (`/verify/t/{id}`). Les QR registration-level
 * (legacy) restent sur la file optimiste.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { registrationsAPI } from '../api';

export type LocalVerifyStatus = 'valid' | 'already' | 'unknown';

export interface LocalVerifyResult {
  status: LocalVerifyStatus;
  holderName?: string;
  ticketType?: string;
  reference?: string;
}

interface ManifestEntry {
  holder_name?: string;
  ticket_type?: string;
  reference?: string;
  is_checked_in?: boolean;
}

type ManifestMap = Record<string, ManifestEntry>;
/** ticket_id -> ISO timestamp du check-in local en attente de sync. */
type LocalCheckins = Record<string, string>;

const manifestKey = (eventId: string) => `eventez:manifest:${eventId}:v1`;
const localKey = (eventId: string) => `eventez:manifest_local:${eventId}:v1`;

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore — best effort */
  }
}

export function useCheckinManifest(eventId?: string) {
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(0);
  const [downloadedAt, setDownloadedAt] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Sources de vérité en mémoire (miroir de l'AsyncStorage) pour un lookup O(1)
  // synchrone dans `verifyTicket` (appelé dans le flux de scan, pas d'await).
  const manifestRef = useRef<ManifestMap>({});
  const localRef = useRef<LocalCheckins>({});
  const isOnlineRef = useRef(true);
  const syncingRef = useRef(false);

  // Hydrate depuis le cache au mount (permet de rester opérationnel même si
  // l'app est relancée en plein event, hors-ligne).
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    (async () => {
      const [cached, local] = await Promise.all([
        readJSON<{ generated_at?: string; tickets?: ManifestMap } | null>(manifestKey(eventId), null),
        readJSON<LocalCheckins>(localKey(eventId), {}),
      ]);
      if (!active) return;
      if (cached?.tickets) {
        manifestRef.current = cached.tickets;
        setCount(Object.keys(cached.tickets).length);
        setDownloadedAt(cached.generated_at || null);
        setReady(true);
      }
      localRef.current = local;
      setPendingSyncCount(Object.keys(local).length);
    })();
    return () => {
      active = false;
    };
  }, [eventId]);

  const download = useCallback(async () => {
    if (!eventId) return;
    setIsDownloading(true);
    try {
      const res = await registrationsAPI.getCheckinManifest(eventId);
      const data: any = res.data || {};
      const tickets: ManifestMap = {};
      for (const t of (data.tickets || []) as any[]) {
        if (!t?.ticket_id) continue;
        tickets[String(t.ticket_id)] = {
          holder_name: t.holder_name,
          ticket_type: t.ticket_type,
          reference: t.reference,
          is_checked_in: !!t.is_checked_in,
        };
      }
      manifestRef.current = tickets;
      await writeJSON(manifestKey(eventId), {
        generated_at: data.generated_at || new Date().toISOString(),
        tickets,
      });
      setCount(Object.keys(tickets).length);
      setDownloadedAt(data.generated_at || new Date().toISOString());
      setReady(true);
    } catch (err) {
      if (__DEV__) console.warn('[CheckinManifest] download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [eventId]);

  /** Vérifie un billet localement. Synchrone : sûr dans le flux de scan. */
  const verifyTicket = useCallback((ticketId: string): LocalVerifyResult => {
    const id = String(ticketId);
    const entry = manifestRef.current[id];
    if (!entry) return { status: 'unknown' };
    const already = entry.is_checked_in || !!localRef.current[id];
    return {
      status: already ? 'already' : 'valid',
      holderName: entry.holder_name,
      ticketType: entry.ticket_type,
      reference: entry.reference,
    };
  }, []);

  /** Marque un billet validé localement + file la remontée serveur. */
  const recordCheckin = useCallback(
    async (ticketId: string) => {
      if (!eventId) return;
      const id = String(ticketId);
      const when = new Date().toISOString();
      localRef.current = { ...localRef.current, [id]: when };
      // Reflète l'état dans le manifeste en mémoire → un re-scan sur le même
      // appareil affichera "déjà validé".
      if (manifestRef.current[id]) {
        manifestRef.current[id] = { ...manifestRef.current[id], is_checked_in: true };
      }
      setPendingSyncCount(Object.keys(localRef.current).length);
      await writeJSON(localKey(eventId), localRef.current);
    },
    [eventId],
  );

  const syncNow = useCallback(async () => {
    if (!eventId || syncingRef.current) return;
    const entries = Object.entries(localRef.current);
    if (entries.length === 0) return;
    syncingRef.current = true;
    try {
      const checkins = entries.map(([ticket_id, checked_in_at]) => ({ ticket_id, checked_in_at }));
      await registrationsAPI.syncCheckins(eventId, checkins);
      // 200 = tout traité (applied ou conflicts, tous deux "terminés" côté serveur).
      localRef.current = {};
      setPendingSyncCount(0);
      await writeJSON(localKey(eventId), {});
    } catch (err) {
      if (__DEV__) console.warn('[CheckinManifest] sync failed:', err);
      // On garde les entrées pour la prochaine tentative.
    } finally {
      syncingRef.current = false;
    }
  }, [eventId]);

  // Écoute connexion : auto-sync au retour du réseau.
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      const wasOffline = !isOnlineRef.current;
      isOnlineRef.current = online;
      if (online && wasOffline) {
        setTimeout(() => {
          syncNow().catch(() => {});
        }, 1500);
      }
    });
    return () => unsub();
  }, [syncNow]);

  return {
    ready,
    count,
    downloadedAt,
    isDownloading,
    pendingSyncCount,
    download,
    verifyTicket,
    recordCheckin,
    syncNow,
  };
}
