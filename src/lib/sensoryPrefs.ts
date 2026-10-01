/**
 * Préférences sensorielles (round 3, P1) — tout doit pouvoir se couper.
 *
 *  - `vibrations`     : retours haptiques (défaut ON). Lu par utils/haptics.
 *  - `uiSounds`       : sons d'interface très discrets (défaut OFF).
 *  - `motionGestures` : gestes physiques — secouer, retourner, tendre (défaut ON),
 *                       lus par les capteurs du round 3.
 *  - `rituals`        : « Petites attentions » — anniversaire, ancienneté du
 *                       compte, fête nationale (défaut ON, jamais de push).
 * Les « sons des moments forts » gardent leur réglage existant (soundService).
 *
 * Lecture SYNCHRONE depuis un cache mémoire (une vibration ne peut pas attendre
 * AsyncStorage) ; le cache est amorcé au démarrage de l'app (`primeSensoryPrefs`)
 * et vaut les défauts tant que la lecture n'est pas revenue.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SensoryPref = 'vibrations' | 'uiSounds' | 'motionGestures' | 'rituals';

const DEFAULTS: Record<SensoryPref, boolean> = {
  vibrations: true,
  uiSounds: false,
  motionGestures: true,
  rituals: true,
};

const STORAGE_PREFIX = '@eventez_pref_';

const cache: Record<SensoryPref, boolean> = { ...DEFAULTS };
const listeners = new Set<() => void>();
let primed: Promise<void> | null = null;

export function getSensoryPref(name: SensoryPref): boolean {
  return cache[name];
}

export function primeSensoryPrefs(): Promise<void> {
  if (primed) return primed;
  primed = (async () => {
    try {
      const keys = (Object.keys(DEFAULTS) as SensoryPref[]).map((k) => STORAGE_PREFIX + k);
      const rows = await AsyncStorage.multiGet(keys);
      rows.forEach(([key, value]) => {
        const name = key.slice(STORAGE_PREFIX.length) as SensoryPref;
        if (value === 'true' || value === 'false') cache[name] = value === 'true';
      });
      listeners.forEach((l) => l());
    } catch {
      /* stockage indisponible → défauts */
    }
  })();
  return primed;
}

export async function setSensoryPref(name: SensoryPref, value: boolean): Promise<void> {
  cache[name] = value;
  listeners.forEach((l) => l());
  try {
    await AsyncStorage.setItem(STORAGE_PREFIX + name, value ? 'true' : 'false');
  } catch {
    /* la préférence reste en mémoire pour la session */
  }
}

export function subscribeSensoryPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tests uniquement. */
export function __resetSensoryPrefs() {
  Object.assign(cache, DEFAULTS);
  primed = null;
  listeners.clear();
}
