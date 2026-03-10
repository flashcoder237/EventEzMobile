import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@eventez_search_history';
const MAX_ENTRIES = 10;

export interface UseSearchHistoryReturn {
  history: string[];
  addQuery: (query: string) => void;
  removeQuery: (query: string) => void;
  clearAll: () => void;
}

export function useSearchHistory(): UseSearchHistoryReturn {
  const [history, setHistory] = useState<string[]>([]);

  // Load on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setHistory(JSON.parse(raw));
        }
      } catch (e) {
        if (__DEV__) console.warn('[useSearchHistory] Failed to load history:', e instanceof Error ? e.message : e);
      }
    })();
  }, []);

  const persist = useCallback(async (items: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      if (__DEV__) console.warn('[useSearchHistory] Failed to persist history:', e instanceof Error ? e.message : e);
    }
  }, []);

  const addQuery = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    setHistory(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, MAX_ENTRIES);
      persist(next);
      return next;
    });
  }, [persist]);

  const removeQuery = useCallback((query: string) => {
    setHistory(prev => {
      const next = prev.filter(q => q !== query);
      persist(next);
      return next;
    });
  }, [persist]);

  const clearAll = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch((e) => {
      if (__DEV__) console.warn('[useSearchHistory] Failed to clear history:', e instanceof Error ? e.message : e);
    });
  }, []);

  return { history, addQuery, removeQuery, clearAll };
}
