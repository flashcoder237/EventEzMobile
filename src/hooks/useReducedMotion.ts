import { useState, useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

/**
 * « Réduire les animations », lu de façon SYNCHRONE dès le premier rendu.
 *
 * Avant : `false` jusqu'à la résolution asynchrone d'AccessibilityInfo, donc
 * les premières frames s'animaient quand même (tampon lancé à 1,6, compteur
 * qui démarrait). Désormais :
 *   - valeur initiale = celle que Reanimated lit au démarrage de l'app
 *     (synchrone), puis la dernière valeur connue (cache module) ;
 *   - les changements en cours de session restent suivis via AccessibilityInfo.
 */
function readStartupValue(): boolean {
  try {
    const hook = (Reanimated as unknown as { useReducedMotion?: () => boolean }).useReducedMotion;
    // Le « hook » Reanimated renvoie une constante calculée au chargement :
    // l'appeler hors composant est sans effet de bord.
    return typeof hook === 'function' ? !!hook() : false;
  } catch {
    return false;
  }
}

let cached: boolean = readStartupValue();
let primed = false;

function prime() {
  if (primed) return;
  primed = true;
  AccessibilityInfo.isReduceMotionEnabled?.()
    .then((v) => {
      cached = !!v;
    })
    .catch(() => {});
}

/** Valeur courante hors composant (utilitaires, worklets côté JS). */
export function isReducedMotionCached(): boolean {
  return cached;
}

export function useReducedMotion(): boolean {
  const [reduced, setReducedState] = useState<boolean>(cached);
  const current = useRef(reduced);
  // Pas de re-render si la valeur ne change pas (cas normal : la valeur
  // synchrone de départ était déjà la bonne).
  const setReduced = (v: boolean) => {
    if (v === current.current) return;
    current.current = v;
    setReducedState(v);
  };

  useEffect(() => {
    prime();
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => {
        cached = !!v;
        setReduced(!!v);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) => {
      cached = !!v;
      setReduced(!!v);
    });

    return () => subscription?.remove?.();
  }, []);

  return reduced;
}
