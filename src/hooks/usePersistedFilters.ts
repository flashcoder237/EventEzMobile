import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVE_DEBOUNCE_MS = 1000;

export interface UsePersistedFiltersReturn<T> {
  filters: T;
  setFilters: (filters: T | ((prev: T) => T)) => void;
  resetFilters: () => void;
  isLoaded: boolean;
}

export function usePersistedFilters<T extends object>(
  storageKey: string,
  defaults: T,
): UsePersistedFiltersReturn<T> {
  const [filters, setFiltersState] = useState<T>(defaults);
  const [isLoaded, setIsLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<T>;
          // Merge with defaults to handle new keys added in future versions
          setFiltersState({ ...defaults, ...saved });
        }
      } catch {
        // Use defaults
      } finally {
        setIsLoaded(true);
      }
    })();
  }, [storageKey]);

  // Debounced save
  const scheduleSave = useCallback((value: T) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(value)).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }, [storageKey]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const setFilters = useCallback((updater: T | ((prev: T) => T)) => {
    setFiltersState(prev => {
      const next = typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater;
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const resetFilters = useCallback(() => {
    setFiltersState(defaults);
    AsyncStorage.removeItem(storageKey).catch(() => {});
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [storageKey, defaults]);

  return { filters, setFilters, resetFilters, isLoaded };
}
