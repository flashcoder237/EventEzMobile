/**
 * useQuery — hook stale-while-revalidate
 *
 * Comportement :
 *  1. Données en cache fraîches → retournées immédiatement, aucun appel réseau
 *  2. Données en cache périmées → retournées immédiatement, + refresh en arrière-plan silencieux
 *  3. Pas de cache → loading=true, fetch, puis rendu
 *  4. Erreur réseau avec cache → cache servi sans afficher l'erreur
 *  5. Erreur réseau sans cache → error renseigné
 *
 * Usage :
 *   const { data, loading, refreshing, refetch } = useQuery(
 *     `events:featured`,
 *     () => eventsAPI.getFeaturedEvents().then(r => r.data),
 *     { ttl: 5 * 60 * 1000 }
 *   );
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import CacheService from '../services/CacheService';

export interface UseQueryOptions {
  /** Durée de fraîcheur en ms (défaut : 5 min) */
  ttl?: number;
  /** Si false, le hook ne fetche pas (utile pour les requêtes conditionnelles) */
  enabled?: boolean;
}

export interface UseQueryResult<T> {
  /** Données courantes (cache ou fraîches). null uniquement lors du tout premier chargement. */
  data: T | null;
  /** true uniquement lors du premier chargement sans cache */
  loading: boolean;
  /** true lors d'un pull-to-refresh */
  refreshing: boolean;
  error: Error | null;
  /** Pull-to-refresh : ignore le cache, force un appel réseau */
  refetch: () => Promise<void>;
  /** Soft revalidate : ne fetche que si les données sont périmées (useFocusEffect) */
  revalidate: () => Promise<void>;
}

export function useQuery<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: UseQueryOptions = {}
): UseQueryResult<T> {
  const { ttl = 5 * 60 * 1000, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mounted = useRef(true);
  const hasData = useRef(false);

  // Ref pour le fetcher : évite les boucles infinies avec les fonctions inline
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(async (bypassCache: boolean) => {
    if (!enabled) return;
    try {
      if (!bypassCache) {
        const cached = await CacheService.get<T>(cacheKey);
        if (cached && mounted.current) {
          setData(cached.data);
          hasData.current = true;
          setLoading(false);
          if (!cached.isStale) return; // Données fraîches → on s'arrête ici
          // Données périmées → on continue en arrière-plan sans changer l'indicateur de chargement
        }
      }

      const result = await fetcherRef.current();
      if (mounted.current) {
        setData(result);
        hasData.current = true;
        setError(null);
        CacheService.set(cacheKey, result, ttl);
      }
    } catch (err) {
      // Si on a déjà des données (cache), on avale l'erreur silencieusement
      if (mounted.current && !hasData.current) {
        setError(err as Error);
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [cacheKey, ttl, enabled]); // fetcherRef est un ref, pas une dépendance

  // Effet initial : se relance si cacheKey ou enabled change
  useEffect(() => {
    mounted.current = true;
    hasData.current = false;
    setData(null);
    setLoading(true);
    setError(null);
    execute(false);
    return () => {
      mounted.current = false;
    };
  }, [execute]);

  /** Pull-to-refresh : force un appel réseau, ignore le cache */
  const refetch = useCallback(async () => {
    setRefreshing(true);
    await execute(true);
  }, [execute]);

  /** Soft revalidate : ne fetche que si les données sont périmées */
  const revalidate = useCallback(async () => {
    const cached = await CacheService.get(cacheKey);
    if (!cached || cached.isStale) {
      await execute(false);
    }
  }, [cacheKey, execute]);

  return { data, loading, refreshing, error, refetch, revalidate };
}
