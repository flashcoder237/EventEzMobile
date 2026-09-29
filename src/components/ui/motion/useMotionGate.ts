/**
 * Portes d'accès au mouvement « micro-delight ».
 *
 * Règle du style guide (§6) : toute animation déclenchée ou en boucle passe
 * par `useMotionGate()`. Elle ne joue que si :
 *   - l'utilisateur n'a pas activé « Réduire les animations »,
 *   - l'app est au premier plan,
 *   - l'écran qui la porte est affiché (si on est dans un navigateur),
 *   - le mode économie n'est pas demandé par l'appelant (`lowPower`).
 *
 * `moments` orchestre les effets ponctuels : un seul à la fois dans le champ
 * de vision, « une fois par session », et un plafond de fréquence.
 */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as ReactNavigation from '@react-navigation/native';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

// Repli si le module de navigation est mocké sans NavigationContext (tests).
const NoNavigation = createContext<undefined>(undefined);
const NavContext = (ReactNavigation.NavigationContext ?? NoNavigation) as typeof ReactNavigation.NavigationContext;

/** Focus de l'écran courant — `true` hors navigateur (pas de crash). */
export function useScreenFocused(): boolean {
  const nav = useContext(NavContext);
  const [focused, setFocused] = useState(() => (nav ? nav.isFocused() : true));
  useEffect(() => {
    if (!nav) return;
    setFocused(nav.isFocused());
    const offFocus = nav.addListener('focus', () => setFocused(true));
    const offBlur = nav.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [nav]);
  return focused;
}

export interface MotionGate {
  /** true = on peut animer. */
  canAnimate: boolean;
  /** « Réduire les animations » actif : jouer l'état final, sans mouvement. */
  reduced: boolean;
  appActive: boolean;
  focused: boolean;
}

export function useMotionGate(options: { lowPower?: boolean; ignoreFocus?: boolean } = {}): MotionGate {
  const reduced = useReducedMotion();
  const appActive = useAppActive();
  const screenFocused = useScreenFocused();
  const focused = options.ignoreFocus ? true : screenFocused;
  return {
    canAnimate: !reduced && appActive && focused && !options.lowPower,
    reduced,
    appActive,
    focused,
  };
}

/**
 * Délai après le montage pendant lequel une hausse de compteur est considérée
 * comme le CHARGEMENT initial (0 → valeur serveur), pas comme une arrivée en
 * direct : sans lui, badges et cloche « éclatent » et vibrent à chaque
 * lancement de l'app.
 */
export const INCREASE_SETTLE_MS = 4000;

/** Renvoie une fonction : true une fois la fenêtre de chargement passée. */
export function useSettled(ms: number = INCREASE_SETTLE_MS): () => boolean {
  const mountedAt = useRef(Date.now());
  return () => Date.now() - mountedAt.current >= ms;
}

/**
 * Compteur qui s'incrémente quand l'app revient au premier plan après au
 * moins `minAwayMs` d'absence. À passer en `trigger` d'un effet.
 */
export function useAppWake(minAwayMs = 10 * 60 * 1000): number {
  const [wake, setWake] = useState(0);
  const leftAt = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') {
        if (leftAt.current !== null && Date.now() - leftAt.current >= minAwayMs) {
          setWake((w) => w + 1);
        }
        leftAt.current = null;
      } else if (leftAt.current === null) {
        leftAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [minAwayMs]);
  return wake;
}

// ---------------------------------------------------------------------------
// Orchestrateur de moments (module singleton)
// ---------------------------------------------------------------------------
let activeMoment: string | null = null;
let activeUntil = 0;
const sessionOnce = new Set<string>();
const lastPlayed = new Map<string, number>();

export const moments = {
  /**
   * Réserve la scène pour `durationMs`. Refuse si un AUTRE moment joue déjà :
   * un seul effet ponctuel à la fois dans le champ de vision.
   */
  claim(id: string, durationMs: number): boolean {
    const now = Date.now();
    if (activeMoment && activeMoment !== id && now < activeUntil) return false;
    activeMoment = id;
    activeUntil = now + durationMs;
    return true;
  },
  /** true la première fois de la session (process) pour cette clé. */
  once(key: string): boolean {
    if (sessionOnce.has(key)) return false;
    sessionOnce.add(key);
    return true;
  },
  /** true si la clé n'a pas joué depuis `ms`. */
  throttle(key: string, ms: number): boolean {
    const now = Date.now();
    const last = lastPlayed.get(key) ?? 0;
    if (now - last < ms) return false;
    lastPlayed.set(key, now);
    return true;
  },
  /** Tests uniquement. */
  __reset(): void {
    activeMoment = null;
    activeUntil = 0;
    sessionOnce.clear();
    lastPlayed.clear();
  },
};
