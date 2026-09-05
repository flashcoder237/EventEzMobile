/**
 * useBoxOfficeQueue — file locale persistante des VENTES au guichet.
 *
 * POURQUOI UNE FILE DISTINCTE DE `useCheckinQueue`
 * ------------------------------------------------
 * Le patron est le même (AsyncStorage, flush au retour du réseau), mais
 * la politique d'échec est OPPOSÉE, et c'est tout l'enjeu.
 *
 * `useCheckinQueue` SUPPRIME une entrée en erreur 400/404. Pour un scan,
 * c'est acceptable : le billet était invalide ou déjà utilisé.
 *
 * Pour une VENTE, c'est inacceptable. La caissière a physiquement les
 * billets de banque dans sa sacoche. Si l'entrée disparaît du téléphone,
 * l'argent existe toujours mais plus la trace : le soir, le compte ne
 * tombe pas juste, et c'est elle qu'on regarde.
 *
 * RÈGLE : une vente n'est JAMAIS supprimée. Un échec définitif la
 * déplace dans un bac « à régler », visible, avec son motif — pour que
 * l'écart soit expliqué le soir même plutôt que découvert trois jours
 * après.
 *
 * IDEMPOTENCE : chaque entrée porte un `clientSaleId` généré UNE SEULE
 * FOIS. Un renvoi après timeout ne peut donc pas encaisser deux fois.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { boxOfficeAPI, BoxOfficeSaleItem } from '../api/boxOffice';

const QUEUE_KEY = 'eventez:box_office_queue:v1';
/** Bac des ventes en échec définitif — jamais purgé automatiquement. */
const FAILED_KEY = 'eventez:box_office_failed:v1';

export interface QueuedSale {
  clientSaleId: string;
  drawerId: string;
  /** Conservé pour ne pas mélanger deux événements le même jour. */
  eventId: string;
  items: BoxOfficeSaleItem[];
  paymentMethod: 'cash' | 'mtn_money' | 'orange_money';
  amount: number;
  queuedAt: string;
  attempts: number;
  /** Renseigné uniquement pour les ventes déplacées dans le bac d'échec. */
  failureReason?: string;
}

/** Au-delà, on cesse de réessayer et on bascule la vente en « à régler »
 *  plutôt que de boucler indéfiniment sur un serveur qui refuse. */
const MAX_ATTEMPTS = 5;

async function readQueue(key: string): Promise<QueuedSale[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(key: string, items: QueuedSale[]) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Stockage plein ou indisponible : on ne peut rien faire de mieux
    // que de garder la file en mémoire pour la session en cours.
  }
}

export function useBoxOfficeQueue(eventId?: string) {
  const [pending, setPending] = useState<QueuedSale[]>([]);
  const [failed, setFailed] = useState<QueuedSale[]>([]);
  const [isFlushing, setIsFlushing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const flushingRef = useRef(false);

  const refresh = useCallback(async () => {
    const [q, f] = await Promise.all([
      readQueue(QUEUE_KEY),
      readQueue(FAILED_KEY),
    ]);
    // Filtre par événement : deux événements le même jour ne doivent pas
    // mélanger leurs caisses — défaut connu de la file de check-in.
    const mine = (rows: QueuedSale[]) =>
      eventId ? rows.filter((r) => r.eventId === eventId) : rows;
    setPending(mine(q));
    setFailed(mine(f));
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enqueue = useCallback(async (sale: Omit<QueuedSale, 'queuedAt' | 'attempts'>) => {
    const all = await readQueue(QUEUE_KEY);
    // Garde d'idempotence locale : un double-tap ne doit pas empiler deux
    // fois la même vente dans la file.
    if (all.some((s) => s.clientSaleId === sale.clientSaleId)) return;
    all.push({ ...sale, queuedAt: new Date().toISOString(), attempts: 0 });
    await writeQueue(QUEUE_KEY, all);
    refresh();
  }, [refresh]);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    setIsFlushing(true);
    try {
      const all = await readQueue(QUEUE_KEY);
      if (all.length === 0) return;

      const remaining: QueuedSale[] = [];
      const newlyFailed: QueuedSale[] = [];

      for (const sale of all) {
        try {
          await boxOfficeAPI.sell({
            drawer: sale.drawerId,
            items: sale.items,
            paymentMethod: sale.paymentMethod,
            // La clé d'origine est RÉUTILISÉE : le serveur reconnaît une
            // vente déjà enregistrée et ne facture pas deux fois.
            clientSaleId: sale.clientSaleId,
          });
          // Succès : la vente sort de la file, elle est en base.
        } catch (err: any) {
          const status = err?.response?.status;
          const attempts = sale.attempts + 1;
          const definitive = status === 400 || status === 403 || status === 404;
          if (definitive || attempts >= MAX_ATTEMPTS) {
            // JAMAIS supprimée : déplacée dans le bac « à régler ».
            // L'argent est dans la sacoche, la trace doit rester.
            newlyFailed.push({
              ...sale,
              attempts,
              failureReason:
                err?.response?.data?.detail || `HTTP ${status ?? 'réseau'}`,
            });
          } else {
            remaining.push({ ...sale, attempts });
          }
        }
      }

      await writeQueue(QUEUE_KEY, remaining);
      if (newlyFailed.length) {
        const previous = await readQueue(FAILED_KEY);
        await writeQueue(FAILED_KEY, [...previous, ...newlyFailed]);
      }
      refresh();
    } finally {
      flushingRef.current = false;
      setIsFlushing(false);
    }
  }, [refresh]);

  // Flush automatique au retour du réseau : la caissière n'a pas à y
  // penser, elle est occupée.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      setIsOnline(online);
      if (online) flush();
    });
    return () => unsubscribe();
  }, [flush]);

  /** Total encaissé mais non encore synchronisé : doit être compté dans
   *  la caisse du soir, puisque l'argent est bien là. */
  const pendingAmount = pending.reduce((sum, s) => sum + s.amount, 0);

  return {
    pending,
    pendingCount: pending.length,
    pendingAmount,
    failed,
    failedCount: failed.length,
    isFlushing,
    isOnline,
    enqueue,
    flush,
    refresh,
  };
}
