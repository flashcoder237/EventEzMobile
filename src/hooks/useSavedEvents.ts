/**
 * useSavedEvents — état « sauvegardé » (= suivi) partagé pour les LISTES d'events.
 *
 * Contexte : l'icône marque-page des cartes d'événements était un bouton MORT.
 * `EventCard` expose `onLikePress`/`isLiked`, mais aucun écran ne les passait :
 * le `TouchableOpacity` avalait le tap sans rien déclencher, et l'icône restait
 * grise en permanence. Sauvegarder n'était possible que depuis la fiche
 * événement (`FollowEventButton`) — remonté en test :
 *   « À partir de l'icône on n'arrive pas à sauvegarder. »
 *
 * Côté API, « sauvegarder » = suivre (`EventFollow`). C'est bien ce que lit
 * l'écran « Tes Sauvegardes » (`GET /events/following/`).
 *
 * Pourquoi un Set côté client plutôt qu'un flag par event : `EventListSerializer`
 * ne renvoie AUCUN champ `is_saved`/`is_following`. Interroger
 * `/events/{id}/is_following/` par carte ferait N requêtes par écran de liste.
 * On charge donc la liste des suivis UNE fois et on la garde en mémoire.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { eventsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import CacheService from '../services/CacheService';

/** Clé de cache de l'écran « Tes Sauvegardes » — à invalider à chaque toggle. */
export const followingCacheKey = (userId?: string | number | null) =>
  `following:${userId}`;

export function useSavedEvents() {
  const { user, isAuthenticated } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  // Anti double-tap : un toggle en vol par event.
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      setSavedIds(new Set());
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const res = await eventsAPI.getFollowingEvents();
        const rows = res.data?.results || res.data || [];
        const ids = new Set<string>(
          (Array.isArray(rows) ? rows : [])
            .map((r: any) => String(r?.event_details?.id ?? r?.event?.id ?? r?.event ?? ''))
            .filter(Boolean),
        );
        if (!cancelled) setSavedIds(ids);
      } catch {
        // Hors-ligne / erreur réseau : on n'affiche simplement aucun état
        // sauvegardé. Le toggle reste utilisable et se resynchronisera.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const isSaved = useCallback((eventId: string) => savedIds.has(String(eventId)), [savedIds]);

  /**
   * Bascule l'état sauvegardé. Optimiste, avec rollback en cas d'échec.
   * Retourne le nouvel état, ou `null` si l'action n'a pas pu être tentée.
   */
  const toggleSaved = useCallback(
    async (eventId: string): Promise<boolean | null> => {
      const id = String(eventId);
      if (!isAuthenticated || inFlight.current.has(id)) return null;
      inFlight.current.add(id);

      const next = !savedIds.has(id);
      setSavedIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(id);
        else copy.delete(id);
        return copy;
      });

      try {
        if (next) await eventsAPI.followEvent(id);
        else await eventsAPI.unfollowEvent(id);
        // Sans invalidation, « Tes Sauvegardes » (TTL 2 min) continue d'afficher
        // « Ta collection est vide » juste après une sauvegarde réussie.
        await CacheService.invalidate(followingCacheKey(user?.id));
        return next;
      } catch {
        setSavedIds((prev) => {
          const copy = new Set(prev);
          if (next) copy.delete(id);
          else copy.add(id);
          return copy;
        });
        return null;
      } finally {
        inFlight.current.delete(id);
      }
    },
    [isAuthenticated, savedIds, user?.id],
  );

  return { savedIds, isSaved, toggleSaved, loaded, isAuthenticated };
}

export default useSavedEvents;
