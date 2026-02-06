/**
 * Hook useLoadingState
 * Gestion standardisee des etats de chargement
 */

import { useState, useCallback } from 'react';

interface LoadingState {
  /** Chargement initial */
  isLoading: boolean;
  /** Chargement de plus de donnees (pagination) */
  isLoadingMore: boolean;
  /** Rafraichissement (pull-to-refresh) */
  isRefreshing: boolean;
  /** Erreur eventuelle */
  error: string | null;
}

interface LoadingStateActions {
  /** Demarre le chargement initial */
  startLoading: () => void;
  /** Termine le chargement initial */
  stopLoading: () => void;
  /** Demarre le chargement de pagination */
  startLoadingMore: () => void;
  /** Termine le chargement de pagination */
  stopLoadingMore: () => void;
  /** Demarre le rafraichissement */
  startRefreshing: () => void;
  /** Termine le rafraichissement */
  stopRefreshing: () => void;
  /** Definit une erreur */
  setError: (error: string | null) => void;
  /** Reset tous les etats */
  reset: () => void;
}

type UseLoadingStateReturn = LoadingState & LoadingStateActions;

/**
 * Hook pour gerer les etats de chargement de maniere standardisee
 * @param initialLoading - Etat de chargement initial (defaut: true)
 */
export function useLoadingState(initialLoading: boolean = true): UseLoadingStateReturn {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const startLoadingMore = useCallback(() => {
    setIsLoadingMore(true);
  }, []);

  const stopLoadingMore = useCallback(() => {
    setIsLoadingMore(false);
  }, []);

  const startRefreshing = useCallback(() => {
    setIsRefreshing(true);
    setError(null);
  }, []);

  const stopRefreshing = useCallback(() => {
    setIsRefreshing(false);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(initialLoading);
    setIsLoadingMore(false);
    setIsRefreshing(false);
    setError(null);
  }, [initialLoading]);

  return {
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    startLoading,
    stopLoading,
    startLoadingMore,
    stopLoadingMore,
    startRefreshing,
    stopRefreshing,
    setError,
    reset,
  };
}

/**
 * Hook simplifie pour les operations async
 */
export function useAsyncOperation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: string) => void
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMessage = err?.message || 'Une erreur est survenue';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    execute,
    reset,
    setError,
  };
}

export default useLoadingState;
