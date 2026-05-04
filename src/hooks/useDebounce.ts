import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Retourne `value` après un délai stable (rebondit à chaque changement).
 *
 * Usage : éviter les requêtes réseau à chaque keystroke / mouvement de slider.
 *
 * @example
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 300);
 *   useEffect(() => { fetchSearch(debouncedQuery); }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

/**
 * Wrappe une fonction pour qu'elle ne s'exécute que `delay` ms après le dernier
 * appel — pratique pour les handlers `onChangeText` qui doivent appeler une API.
 *
 * Renvoie aussi un `cancel()` pour annuler manuellement (au démontage par ex.).
 *
 * @example
 *   const debouncedSearch = useDebouncedCallback((q: string) => fetchSearch(q), 300);
 *   <TextInput onChangeText={debouncedSearch} />
 */
export function useDebouncedCallback<Args extends any[]>(
  fn: (...args: Args) => void,
  delay: number = 300,
): ((...args: Args) => void) & { cancel: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);

  // On garde toujours la dernière version de la fn pour éviter les closures stale.
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  // Cleanup au démontage : pas d'appel zombie après unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const debounced = useCallback(
    (...args: Args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay],
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return Object.assign(debounced, { cancel });
}
