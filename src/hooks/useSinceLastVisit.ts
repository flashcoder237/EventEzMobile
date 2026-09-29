/**
 * O5 — « depuis votre dernière visite ».
 *
 * Lit le relevé précédent de `key` (AsyncStorage), calcule l'écart avec la
 * valeur courante, puis enregistre le nouveau relevé (sauf pendant la fenêtre
 * de 2 h, pour ne pas avaler l'écart d'une visite à l'autre dans la soirée).
 * Le calcul n'a lieu qu'UNE fois par montage, à la première valeur connue :
 * un rafraîchissement ne rejoue pas le compteur.
 */
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeSince, shouldStoreSnapshot, SinceResult, SinceSnapshot } from '../lib/utils/organizerMoments';

const PREFIX = 'ez:since:';
const NONE: SinceResult = { from: null, delta: null, since: null };

export interface SinceState extends SinceResult {
  /** Le relevé précédent a été lu : on peut monter le compteur avec `from`. */
  ready: boolean;
}

export function useSinceLastVisit(key: string | null, current: number | null | undefined): SinceState {
  const [result, setResult] = useState<SinceState>({ ...NONE, ready: false });
  const done = useRef<string | null>(null);
  // Démontage seulement : un changement de `current` (rafraîchissement) ne
  // doit pas annuler la lecture en cours, sinon `ready` resterait à false.
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  useEffect(() => {
    if (!key || current === null || current === undefined || !Number.isFinite(current)) return;
    if (done.current === key) return;
    done.current = key;
    const storageKey = PREFIX + key;
    (async () => {
      let prev: SinceSnapshot | null = null;
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        prev = raw ? (JSON.parse(raw) as SinceSnapshot) : null;
      } catch {
        prev = null;
      }
      const now = Date.now();
      if (mounted.current) setResult({ ...computeSince(prev, current, now), ready: true });
      if (shouldStoreSnapshot(prev, now)) {
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify({ value: current, at: now }));
        } catch {
          /* stockage indisponible : l'effet ne jouera simplement pas la prochaine fois */
        }
      }
    })();
  }, [key, current]);

  return result;
}

/** Lit l'horodatage de la dernière visite sans l'écrire (O7). */
export async function readLastVisit(key: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    const snap = raw ? (JSON.parse(raw) as SinceSnapshot) : null;
    return snap && Number.isFinite(snap.at) ? snap.at : null;
  } catch {
    return null;
  }
}

export default useSinceLastVisit;
