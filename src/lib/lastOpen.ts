/**
 * Dernière ouverture de l'app (R3 W3 + W6).
 *
 * `lastOpenAt` est lu UNE fois au démarrage (valeur de la visite PRÉCÉDENTE),
 * puis remplacé par maintenant. Un retour au premier plan après une longue
 * absence en arrière-plan compte comme une nouvelle visite. Première
 * installation = pas de visite précédente = rien à raconter.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';

export const LAST_OPEN_KEY = '@eventez_last_open_at';
export const WELCOME_BACK_AFTER_MS = 21 * 24 * 60 * 60 * 1000;

let previous: number | null = null;
let primed: Promise<number | null> | null = null;
let backgroundAt: number | null = null;
let appStateSub: { remove: () => void } | null = null;
const listeners = new Set<() => void>();

async function stamp(now: number) {
  try {
    await AsyncStorage.setItem(LAST_OPEN_KEY, String(now));
  } catch {
    /* facultatif */
  }
}

function onAppState(state: AppStateStatus) {
  const now = Date.now();
  if (state === 'background') {
    backgroundAt = now;
    stamp(now);
  } else if (state === 'active' && backgroundAt) {
    // Longue absence en arrière-plan : nouvelle « visite ».
    if (now - backgroundAt >= WELCOME_BACK_AFTER_MS) {
      previous = backgroundAt;
      listeners.forEach((l) => l());
    }
    backgroundAt = null;
    stamp(now);
  }
}

export function primeLastOpen(): Promise<number | null> {
  if (primed) return primed;
  primed = (async () => {
    try {
      const raw = await AsyncStorage.getItem(LAST_OPEN_KEY);
      const value = raw ? Number(raw) : NaN;
      previous = Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      previous = null;
    }
    stamp(Date.now());
    if (!appStateSub) appStateSub = AppState.addEventListener('change', onAppState);
    listeners.forEach((l) => l());
    return previous;
  })();
  return primed;
}

/** Visite précédente (ms) ou null. */
export function getPreviousOpenAt(): number | null {
  return previous;
}

export function isLongAbsence(prev: number | null, now: number = Date.now()): boolean {
  return typeof prev === 'number' && now - prev >= WELCOME_BACK_AFTER_MS;
}

export function subscribeLastOpen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tests uniquement. */
export function __resetLastOpen() {
  previous = null;
  primed = null;
  backgroundAt = null;
  appStateSub?.remove();
  appStateSub = null;
  listeners.clear();
}
