/**
 * Hook pour la gestion hors-ligne des billets et QR codes
 * Permet de mettre en cache les QR codes pour un accès sans connexion
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';

const CACHE_KEY_PREFIX = 'eventez_ticket_';
const CACHE_INDEX_KEY = 'eventez_cached_tickets_index';
const CACHE_EXPIRY_DAYS = 7; // Les données en cache expirent après 7 jours

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
  const [isOnline, setIsOnline] = useState(true);
  const [cachedTickets, setCachedTickets] = useState<CachedTicketIndex>({});
  const [loading, setLoading] = useState(true);

  // Surveiller la connectivité
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });

    // Charger l'index des tickets en cache
    loadCacheIndex();

    return () => unsubscribe();
  }, []);

  // Charger l'index des tickets en cache
  const loadCacheIndex = async () => {
    try {
      const indexJson = await AsyncStorage.getItem(CACHE_INDEX_KEY);
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
            await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${ticketId}`);
          }
        }

        setCachedTickets(cleanedIndex);
        await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(cleanedIndex));
      }
    } catch (error) {
      console.error('Erreur chargement cache tickets:', error);
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
        title: string;
        start_date: string;
      };
    };
    ticket_type_name?: string;
    quantity?: number;
    qr_code?: string;
  }) => {
    if (!ticket.qr_code) {
      console.warn('Pas de QR code à mettre en cache');
      return false;
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
        console.warn('Impossible de convertir le QR code en base64');
        return false;
      }

      // Créer l'objet ticket en cache
      const cachedTicket: CachedTicket = {
        ticketId: ticket.id,
        registrationId: ticket.registration.id,
        eventId: ticket.registration.event.id,
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
        `${CACHE_KEY_PREFIX}${ticket.id}`,
        JSON.stringify(cachedTicket)
      );

      // Mettre à jour l'index
      const newIndex = {
        ...cachedTickets,
        [ticket.id]: {
          registrationId: ticket.registration.id,
          eventTitle: ticket.registration.event.title,
          eventDate: ticket.registration.event.start_date,
          cachedAt: Date.now(),
        },
      };

      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(newIndex));
      setCachedTickets(newIndex);

      console.log(`Ticket ${ticket.id} mis en cache avec succès`);
      return true;
    } catch (error) {
      console.error('Erreur mise en cache ticket:', error);
      return false;
    }
  }, [cachedTickets]);

  // Récupérer un ticket depuis le cache
  const getCachedTicket = useCallback(async (ticketId: string): Promise<CachedTicket | null> => {
    try {
      const ticketJson = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${ticketId}`);
      if (ticketJson) {
        return JSON.parse(ticketJson);
      }
      return null;
    } catch (error) {
      console.error('Erreur récupération ticket cache:', error);
      return null;
    }
  }, []);

  // Récupérer tous les tickets en cache
  const getAllCachedTickets = useCallback(async (): Promise<CachedTicket[]> => {
    try {
      const tickets: CachedTicket[] = [];

      for (const ticketId of Object.keys(cachedTickets)) {
        const ticket = await getCachedTicket(ticketId);
        if (ticket) {
          tickets.push(ticket);
        }
      }

      // Trier par date d'événement (les plus proches en premier)
      tickets.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

      return tickets;
    } catch (error) {
      console.error('Erreur récupération tous les tickets:', error);
      return [];
    }
  }, [cachedTickets, getCachedTicket]);

  // Supprimer un ticket du cache
  const removeCachedTicket = useCallback(async (ticketId: string): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${ticketId}`);

      const newIndex = { ...cachedTickets };
      delete newIndex[ticketId];

      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(newIndex));
      setCachedTickets(newIndex);

      return true;
    } catch (error) {
      console.error('Erreur suppression ticket cache:', error);
      return false;
    }
  }, [cachedTickets]);

  // Vider tout le cache
  const clearCache = useCallback(async (): Promise<boolean> => {
    try {
      for (const ticketId of Object.keys(cachedTickets)) {
        await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${ticketId}`);
      }

      await AsyncStorage.removeItem(CACHE_INDEX_KEY);
      setCachedTickets({});

      return true;
    } catch (error) {
      console.error('Erreur vidage cache:', error);
      return false;
    }
  }, [cachedTickets]);

  // Mettre en cache plusieurs tickets
  const cacheMultipleTickets = useCallback(async (tickets: Parameters<typeof cacheTicket>[0][]) => {
    const results = await Promise.all(tickets.map(ticket => cacheTicket(ticket)));
    return results.filter(Boolean).length;
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
