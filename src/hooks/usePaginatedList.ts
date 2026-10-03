/**
 * Liste paginée côté serveur, pour les listes qui peuvent devenir LONGUES
 * (abonnements, abonnés, connexions, participants…).
 *
 * - Page 1 au montage (et à chaque changement de `deps`, ex. recherche).
 * - `loadMore()` sur `onEndReached` ; ignoré pendant un chargement ou en fin.
 * - Accepte les deux formes de réponse : paginée DRF `{count, next, results}`
 *   ET tableau brut (ancien backend) — un tableau = une seule page, fin.
 * - Les réponses d'une requête périmée (recherche tapée entre-temps) sont
 *   ignorées grâce à un numéro de génération.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface PageResult<T> {
  items: T[];
  hasMore: boolean;
  total: number | null;
}

export function normalizePage<T>(data: any): PageResult<T> {
  if (Array.isArray(data)) {
    return { items: data, hasMore: false, total: data.length };
  }
  const items: T[] = Array.isArray(data?.results) ? data.results : [];
  return {
    items,
    hasMore: !!data?.next,
    total: typeof data?.count === 'number' ? data.count : null,
  };
}

interface Options<T> {
  /** Récupère la page `page` (1-indexée) et renvoie la réponse brute (res.data). */
  fetchPage: (page: number) => Promise<any>;
  /** Transformation par élément (normalisation du contrat). */
  mapItem?: (raw: any) => T | null;
  /** Relance la page 1 quand l'une de ces valeurs change. */
  deps?: unknown[];
  onError?: (error: unknown) => void;
}

export function usePaginatedList<T>({ fetchPage, mapItem, deps = [], onError }: Options<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const pageRef = useRef(1);
  const generationRef = useRef(0);
  const busyRef = useRef(false);
  // Refs : la fonction de fetch change à chaque rendu chez l'appelant.
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const mapRef = useRef(mapItem);
  mapRef.current = mapItem;
  const errorRef = useRef(onError);
  errorRef.current = onError;

  const apply = (data: any): PageResult<T> => {
    const page = normalizePage<any>(data);
    const mapper = mapRef.current;
    const mapped = mapper
      ? (page.items.map(mapper).filter((x) => x != null) as T[])
      : (page.items as T[]);
    return { ...page, items: mapped };
  };

  const loadFirst = useCallback(async (mode: 'initial' | 'refresh') => {
    const generation = ++generationRef.current;
    busyRef.current = true;
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    try {
      const page = apply(await fetchRef.current(1));
      if (generation !== generationRef.current) return;
      pageRef.current = 1;
      setItems(page.items);
      setHasMore(page.hasMore);
      setTotal(page.total);
      setFailed(false);
    } catch (error) {
      if (generation !== generationRef.current) return;
      setFailed(true);
      errorRef.current?.(error);
    } finally {
      if (generation === generationRef.current) {
        busyRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadFirst('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refresh = useCallback(() => loadFirst('refresh'), [loadFirst]);

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore) return;
    const generation = generationRef.current;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const page = apply(await fetchRef.current(next));
      if (generation !== generationRef.current) return;
      pageRef.current = next;
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
      if (page.total != null) setTotal(page.total);
    } catch (error) {
      if (generation === generationRef.current) {
        // On coupe la pagination plutôt que de boucler sur une page en échec.
        setHasMore(false);
        errorRef.current?.(error);
      }
    } finally {
      if (generation === generationRef.current) {
        busyRef.current = false;
        setLoadingMore(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore]);

  return {
    items,
    setItems,
    total,
    setTotal,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    failed,
    refresh,
    loadMore,
  };
}
