/**
 * useFirstSeen — « est-ce la PREMIÈRE fois que l'app voit cet état ? »
 *
 * Sert aux moments qui ne doivent jouer qu'une fois dans la vie d'un objet
 * (tampon « VALIDÉ » d'un billet scanné, E4). Les identifiants déjà vus
 * sont persistés en AsyncStorage (plafonnés), avec un cache mémoire partagé
 * entre écrans pour que MyTickets et QRCode ne rejouent pas deux fois.
 *
 * Retourne `null` tant que le stockage n'a pas répondu (ne rien afficher
 * d'animé), puis `true` la première fois, `false` ensuite. Toute erreur de
 * stockage → `false` (on préfère un tampon statique à un tampon rejoué).
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_IDS = 500;
const caches = new Map<string, Promise<Set<string>>>();

function load(storageKey: string): Promise<Set<string>> {
  let p = caches.get(storageKey);
  if (!p) {
    p = AsyncStorage.getItem(storageKey)
      .then((raw) => {
        const arr = raw ? JSON.parse(raw) : [];
        return new Set<string>(Array.isArray(arr) ? arr.map(String) : []);
      })
      .catch(() => new Set<string>());
    caches.set(storageKey, p);
  }
  return p;
}

/** Marque `id` comme vu ; renvoie true s'il ne l'était pas encore. */
export async function markFirstSeen(storageKey: string, id: string): Promise<boolean> {
  const set = await load(storageKey);
  if (set.has(id)) return false;
  set.add(id);
  const arr = Array.from(set).slice(-MAX_IDS);
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(arr));
  } catch {
    /* stockage indisponible : l'effet a joué une fois, tant pis pour la suite */
  }
  return true;
}

export function useFirstSeen(storageKey: string, id: string | number | null | undefined, enabled = true): boolean | null {
  const [first, setFirst] = useState<boolean | null>(null);
  useEffect(() => {
    if (!enabled || id === null || id === undefined || id === '') {
      setFirst(null);
      return;
    }
    let alive = true;
    markFirstSeen(storageKey, String(id))
      .then((isFirst) => alive && setFirst(isFirst))
      .catch(() => alive && setFirst(false));
    return () => {
      alive = false;
    };
  }, [storageKey, id, enabled]);
  return first;
}

/** Tests uniquement. */
export function __resetFirstSeen(): void {
  caches.clear();
}

export default useFirstSeen;
