/**
 * FeatureTour — guide utilisateur custom (coachmarks).
 *
 * Architecture :
 * - <FeatureTourProvider> wrap l'app, expose `useTour()`
 * - <TourTarget id="..."> wrap chaque element à mettre en avant — enregistre
 *   son ref dans le contexte
 * - <TourOverlay /> rend le spotlight + coachmark au top-level (rendu inline
 *   dans le provider)
 * - `tour.start([{ id, eyebrow, title, body, placement }, ...])` lance le tour
 * - Persistance via AsyncStorage avec versioning : si tu ajoutes des steps,
 *   bumpe le storageKey pour relancer le tour aux users existants.
 *
 * Pattern editorial :
 *   - eyebrow uppercase coral
 *   - title displayBold
 *   - body regular gray
 *   - step counter "01 / 04"
 *   - CTA pill primaire "Suivant" → "Compris" en dernière étape
 *   - Skip discret en bas
 *
 * Spotlight :
 *   - La target est mesurée via measureInWindow() au démarrage de chaque step
 *   - 4 vues sombres (top/right/bottom/left) entourent la box, laissant un
 *     trou clair autour de la target
 *   - Border coral autour de la zone clair pour bien marquer la cible
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TourOverlay from './TourOverlay';

// ============================================================================
// Types
// ============================================================================

export type TourPlacement = 'top' | 'bottom' | 'auto';

export interface TourStep {
  /** Identifiant unique correspondant au prop `id` du <TourTarget> */
  id: string;
  /** Petit tag uppercase au-dessus du titre (ex: "01 · DÉCOUVRIR") */
  eyebrow: string;
  /** Titre principal en displayBold */
  title: string;
  /** Corps de texte (1-2 phrases) */
  body: string;
  /** Position de la bulle par rapport à la target. 'auto' choisit selon l'espace. */
  placement?: TourPlacement;
  /** Padding ajouté autour de la box pour le spotlight (default 8) */
  padding?: number;
  /** Forme du spotlight — 'rect' pour boutons rectangulaires, 'circle' pour avatars */
  shape?: 'rect' | 'circle';
  /**
   * Si true, l'overlay re-mesure la cible en continu (suit le scroll / les
   * cibles qui bougent). Par défaut false : on mesure jusqu'à obtenir une
   * position valide puis on ARRÊTE le polling (cible statique = pas de
   * `measure()` natif inutile toutes les 150ms). À activer sur les steps dont
   * la cible est dans une zone scrollable.
   */
  follow?: boolean;
}

export interface TourTargetMeasurement {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegisteredTarget {
  ref: React.RefObject<View | null>;
}

interface TourContextValue {
  /** Si le tour est en cours */
  isActive: boolean;
  /** Index du step courant (0-based) */
  currentIndex: number;
  /** Steps actuels (vide si inactif) */
  steps: TourStep[];
  /** Démarre le tour avec une liste de steps. Si seenKey est marquée vue, no-op (sauf force=true) */
  start: (steps: TourStep[], options?: { seenKey?: string; force?: boolean }) => Promise<void>;
  /** Avance d'un step. Si dernier → finit. */
  next: () => void;
  /** Recule d'un step. Si premier → no-op. */
  back: () => void;
  /** Termine le tour proprement (marque seenKey vue si fournie) */
  finish: () => Promise<void>;
  /** Skip — comme finish mais marqué comme skipped (même side-effect mais sémantique distincte) */
  skip: () => Promise<void>;
  /** API interne pour <TourTarget> */
  __register: (id: string, target: RegisteredTarget) => void;
  __unregister: (id: string) => void;
  __getRef: (id: string) => React.RefObject<View | null> | null;
}

// ============================================================================
// Context
// ============================================================================

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within a <FeatureTourProvider>');
  }
  return ctx;
}

// ============================================================================
// Provider
// ============================================================================

interface FeatureTourProviderProps {
  children: React.ReactNode;
}

export function FeatureTourProvider({ children }: FeatureTourProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const seenKeyRef = useRef<string | null>(null);

  // Map id -> registered ref
  const targetsRef = useRef<Map<string, RegisteredTarget>>(new Map());

  const __register = useCallback((id: string, target: RegisteredTarget) => {
    targetsRef.current.set(id, target);
  }, []);

  const __unregister = useCallback((id: string) => {
    targetsRef.current.delete(id);
  }, []);

  const __getRef = useCallback((id: string) => {
    const t = targetsRef.current.get(id);
    return t ? t.ref : null;
  }, []);

  const finish = useCallback(async () => {
    if (seenKeyRef.current) {
      try {
        await AsyncStorage.setItem(seenKeyRef.current, 'true');
      } catch (e) {
        if (__DEV__) console.warn('[FeatureTour] AsyncStorage write failed:', e);
      }
    }
    setIsActive(false);
    setCurrentIndex(0);
    setSteps([]);
    seenKeyRef.current = null;
  }, []);

  const skip = useCallback(async () => {
    // Même comportement que finish — on persiste pour ne pas re-prompter
    return finish();
  }, [finish]);

  const next = useCallback(() => {
    setCurrentIndex(idx => {
      if (idx >= steps.length - 1) {
        // Last step — finish on next call
        finish();
        return idx;
      }
      return idx + 1;
    });
  }, [steps.length, finish]);

  const back = useCallback(() => {
    setCurrentIndex(idx => Math.max(0, idx - 1));
  }, []);

  const start = useCallback(
    async (
      newSteps: TourStep[],
      options?: { seenKey?: string; force?: boolean },
    ) => {
      if (newSteps.length === 0) return;

      // Check seen flag
      if (options?.seenKey && !options.force) {
        try {
          const seen = await AsyncStorage.getItem(options.seenKey);
          if (seen === 'true') return;
        } catch (e) {
          if (__DEV__) console.warn('[FeatureTour] AsyncStorage read failed:', e);
        }
      }

      seenKeyRef.current = options?.seenKey || null;
      setSteps(newSteps);
      setCurrentIndex(0);
      setIsActive(true);
    },
    [],
  );

  const value = useMemo<TourContextValue>(
    () => ({
      isActive,
      currentIndex,
      steps,
      start,
      next,
      back,
      finish,
      skip,
      __register,
      __unregister,
      __getRef,
    }),
    [isActive, currentIndex, steps, start, next, back, finish, skip, __register, __unregister, __getRef],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {isActive && steps.length > 0 && <TourOverlay />}
    </TourContext.Provider>
  );
}
