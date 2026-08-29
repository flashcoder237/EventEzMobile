/**
 * Hook pour la gestion hors-ligne des billets et QR codes
 * Permet de mettre en cache les QR codes pour un accès sans connexion
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import { AuthContext } from '../contexts/AuthContext';

// SÉCURITÉ (fuite inter-comptes) : les billets hors-ligne étaient stockés sous
// des clés GLOBALES et n'étaient PAS purgés au logout → l'utilisateur suivant
// (même téléphone) voyait les billets du précédent. Deux défenses :
//  1) clés SCOPÉES par userId (isolation naturelle entre comptes) ;
//  2) purge TOTALE au logout via clearAllOfflineTickets().
const CACHE_ROOT = 'eventez_ticket_';           // préfixe commun (purge globale)
const CACHE_INDEX_ROOT = 'eventez_cached_tickets_index';
const CACHE_EXPIRY_DAYS = 7; // Les données en cache expirent après 7 jours

// Utilisateur courant (posé par le hook au montage). '' = anonyme.
let _currentUserId = '';
export function setOfflineTicketsUser(userId: string | number | null | undefined) {
  _currentUserId = userId != null ? String(userId) : '';
}
const keyPrefix = () => `${CACHE_ROOT}${_currentUserId}_`;
const indexKey = () => `${CACHE_INDEX_ROOT}_${_currentUserId}`;

/**
 * Purge TOUS les billets hors-ligne de TOUS les comptes présents sur l'appareil.
 * À appeler au logout (AuthContext) : garantit qu'aucun billet ne survit au
 * changement de compte, même si le scoping par user échouait.
 */
export async function clearAllOfflineTickets(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = allKeys.filter(
      (k) => k.startsWith(CACHE_ROOT) || k.startsWith(CACHE_INDEX_ROOT),
    );
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch (e) {
    if (__DEV__) console.warn('[OfflineTickets] clearAllOfflineTickets failed:', e);
  }
}

interface CachedTicket {
  ticketId: string;
  registrationId: string;
  eventTitle: string;
  eventDate: string;
  ticketType: string;
  quantity: number;
  referenceCode: string;
  qrCodeBase64: string;
  cachedAt: number;
  eventId: string;
}

interface CachedTicketIndex {
  [ticketId: string]: {
    registrationId: string;
    eventTitle: string;
    eventDate: string;
    cachedAt: number;
  };
}

export function useOfflineTickets() {
  // Accès NON-throwing (testable hors AuthProvider) : sans provider → undefined.
  const user = useContext(AuthContext)?.user;
  const [isOnline, setIsOnline] = useState(true);
  const [cachedTickets, setCachedTickets] = useState<CachedTicketIndex>({});
  const [loading, setLoading] = useState(true);

  // Scoper le cache sur l'utilisateur courant AVANT toute lecture/écriture.
  // Sans ça, deux comptes sur le même téléphone partageraient l'index.
  setOfflineTicketsUser(user?.id);

  // Surveiller la connectivité
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  // (Re)charger l'index quand l'utilisateur change (login/switch de compte).
  useEffect(() => {
    setOfflineTicketsUser(user?.id);
    setCachedTickets({});
    loadCacheIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Charger l'index des tickets en cache
  const loadCacheIndex = async () => {
    try {
      const indexJson = await AsyncStorage.getItem(indexKey());
      if (indexJson) {
        const index: CachedTicketIndex = JSON.parse(indexJson);
        // Nettoyer les tickets expirés
        const now = Date.now();
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const cleanedIndex: CachedTicketIndex = {};

        for (const [ticketId, data] of Object.entries(index)) {
          if (now - data.cachedAt < expiryMs) {
            cleanedIndex[ticketId] = data;
          } else {
            // Supprimer le ticket expiré
            await AsyncStorage.removeItem(`${keyPrefix()}${ticketId}`);
          }
        }

        setCachedTickets(cleanedIndex);
        await AsyncStorage.setItem(indexKey(), JSON.stringify(cleanedIndex));
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement cache tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mettre en cache un ticket avec son QR code
  const cacheTicket = useCallback(async (ticket: {
    id: string;
    registration: {
      id: string;
      reference_code: string;
      event: {
        id: string;
        slug?: string;
        title: string;
        start_date: string;
      };
    };
    ticket_type_name?: string;
    quantity?: number;
    qr_code?: string;
  }, options?: { force?: boolean }) => {
    if (!ticket.qr_code) {
      if (__DEV__) console.warn('Pas de QR code à mettre en cache');
      return false;
    }

    // Skip si déjà caché et non expiré — l'URL d'un QR code est stable
    // (basée sur l'UUID du ticket), il est inutile de la re-télécharger à
    // chaque visite de RegistrationDetails. loadCacheIndex purge déjà les
    // entrées au-delà de CACHE_EXPIRY_DAYS, donc la présence dans l'index
    // garantit la fraîcheur. options.force=true pour invalidation explicite.
    // On lit AsyncStorage directement pour éviter une closure stale en cas
    // d'appels enchaînés (cacheMultipleTickets).
    if (!options?.force) {
      try {
        const indexJson = await AsyncStorage.getItem(indexKey());
        const freshIndex: CachedTicketIndex = indexJson ? JSON.parse(indexJson) : {};
        if (ticket.id in freshIndex) {
          if (__DEV__) console.log(`[OfflineTickets] ${ticket.id} déjà caché — skip download`);
          return true;
        }
      } catch {
        // si lecture échoue, on continue le téléchargement par sécurité
      }
    }

    try {
      // Télécharger et convertir le QR code en base64
      let qrCodeBase64 = '';

      if (ticket.qr_code.startsWith('data:image')) {
        // Déjà en base64
        qrCodeBase64 = ticket.qr_code;
      } else {
        // Télécharger l'image
        const fileInfo = await FileSystem.downloadAsync(
          ticket.qr_code,
          FileSystem.cacheDirectory + `qr_${ticket.id}.png`
        );

        if (fileInfo.status === 200) {
          const base64 = await FileSystem.readAsStringAsync(fileInfo.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          qrCodeBase64 = `data:image/png;base64,${base64}`;

          // Supprimer le fichier temporaire
          await FileSystem.deleteAsync(fileInfo.uri, { idempotent: true });
        }
      }

      if (!qrCodeBase64) {
        if (__DEV__) console.warn('Impossible de convertir le QR code en base64');
        return false;
      }

      // Créer l'objet ticket en cache
      const cachedTicket: CachedTicket = {
        ticketId: ticket.id,
        registrationId: ticket.registration.id,
        eventId: ticket.registration.event.slug || ticket.registration.event.id,
        eventTitle: ticket.registration.event.title,
        eventDate: ticket.registration.event.start_date,
        ticketType: ticket.ticket_type_name || 'Billet',
        quantity: ticket.quantity || 1,
        referenceCode: ticket.registration.reference_code,
        qrCodeBase64,
        cachedAt: Date.now(),
      };

      // Sauvegarder le ticket
      await AsyncStorage.setItem(
        `${keyPrefix()}${ticket.id}`,
        JSON.stringify(cachedTicket)
      );

      // Mettre à jour l'index — on relit AsyncStorage frais plutôt que
      // d'utiliser `cachedTickets` du closure, sinon en cas d'appels
      // parallèles (Promise.all dans cacheMultipleTickets) chaque appel
      // écrase l'index des autres.
      const currentIndexJson = await AsyncStorage.getItem(indexKey());
      const currentIndex: CachedTicketIndex = currentIndexJson
        ? JSON.parse(currentIndexJson)
        : {};
      const newIndex: CachedTicketIndex = {
        ...currentIndex,
        [ticket.id]: {
          registrationId: ticket.registration.id,
          eventTitle: ticket.registration.event.title,
          eventDate: ticket.registration.event.start_date,
          cachedAt: Date.now(),
        },
      };

      await AsyncStorage.setItem(indexKey(), JSON.stringify(newIndex));
      setCachedTickets(newIndex);

      if (__DEV__) console.log(`Ticket ${ticket.id} mis en cache avec succès`);
      return true;
    } catch (error) {
      if (__DEV__) console.error('Erreur mise en cache ticket:', error);
      return false;
    }
  }, []);

  // Récupérer un ticket depuis le cache
  const getCachedTicket = useCallback(async (ticketId: string): Promise<CachedTicket | null> => {
    try {
      const ticketJson = await AsyncStorage.getItem(`${keyPrefix()}${ticketId}`);
      if (ticketJson) {
        return JSON.parse(ticketJson);
      }
      return null;
    } catch (error) {
      if (__DEV__) console.error('Erreur récupération ticket cache:', error);
      return null;
    }
  }, []);

  // Récupérer tous les tickets en cache — lit l'index AsyncStorage en frais
  // pour éviter les closures stales (notamment après cacheMultipleTickets
  // appelé juste avant loadTickets dans OfflineTicketsScreen).
  const getAllCachedTickets = useCallback(async (): Promise<CachedTicket[]> => {
    try {
      const indexJson = await AsyncStorage.getItem(indexKey());
      const index: CachedTicketIndex = indexJson ? JSON.parse(indexJson) : {};
      const tickets: CachedTicket[] = [];

      for (const ticketId of Object.keys(index)) {
        const ticket = await getCachedTicket(ticketId);
        if (ticket) {
          tickets.push(ticket);
        }
      }

      // Trier par date d'événement (les plus proches en premier)
      tickets.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

      return tickets;
    } catch (error) {
      if (__DEV__) console.error('Erreur récupération tous les tickets:', error);
      return [];
    }
  }, [getCachedTicket]);

  // Supprimer un ticket du cache — relit l'index frais pour éviter les
  // closures stales.
  const removeCachedTicket = useCallback(async (ticketId: string): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(`${keyPrefix()}${ticketId}`);

      const indexJson = await AsyncStorage.getItem(indexKey());
      const currentIndex: CachedTicketIndex = indexJson ? JSON.parse(indexJson) : {};
      const newIndex = { ...currentIndex };
      delete newIndex[ticketId];

      await AsyncStorage.setItem(indexKey(), JSON.stringify(newIndex));
      setCachedTickets(newIndex);

      return true;
    } catch (error) {
      if (__DEV__) console.error('Erreur suppression ticket cache:', error);
      return false;
    }
  }, []);

  // Vider tout le cache — relit l'index frais pour s'assurer de purger
  // toutes les entrées (y compris celles ajoutées hors-React state).
  const clearCache = useCallback(async (): Promise<boolean> => {
    try {
      const indexJson = await AsyncStorage.getItem(indexKey());
      const currentIndex: CachedTicketIndex = indexJson ? JSON.parse(indexJson) : {};

      for (const ticketId of Object.keys(currentIndex)) {
        await AsyncStorage.removeItem(`${keyPrefix()}${ticketId}`);
      }

      await AsyncStorage.removeItem(indexKey());
      setCachedTickets({});

      return true;
    } catch (error) {
      if (__DEV__) console.error('Erreur vidage cache:', error);
      return false;
    }
  }, []);

  // Mettre en cache plusieurs tickets — séquentiel pour éviter que des
  // écritures concurrentes sur l'index AsyncStorage ne s'écrasent entre elles
  // (cf. fix race condition dans cacheTicket).
  const cacheMultipleTickets = useCallback(async (tickets: Parameters<typeof cacheTicket>[0][]) => {
    let synced = 0;
    for (const ticket of tickets) {
      const ok = await cacheTicket(ticket);
      if (ok) synced += 1;
    }
    return synced;
  }, [cacheTicket]);

  // Vérifier si un ticket est en cache
  const isTicketCached = useCallback((ticketId: string): boolean => {
    return ticketId in cachedTickets;
  }, [cachedTickets]);

  return {
    // État
    isOnline,
    loading,
    cachedTicketCount: Object.keys(cachedTickets).length,
    cachedTickets,

    // Actions
    cacheTicket,
    getCachedTicket,
    getAllCachedTickets,
    removeCachedTicket,
    clearCache,
    cacheMultipleTickets,
    isTicketCached,
    refreshCache: loadCacheIndex,
  };
}

export type { CachedTicket, CachedTicketIndex };
