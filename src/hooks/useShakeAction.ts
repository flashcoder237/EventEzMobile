import { useEffect, useRef } from 'react';
import { useScreenFocused } from '../components/ui/motion/useMotionGate';
import { shakeRouter } from '../lib/gestures/shakeRouter';

/**
 * Donne la secousse à l'écran affiché (via le `ShakeHost` global, un seul
 * capteur pour toute l'app). Inscrit seulement tant que l'écran a le focus et
 * que `enabled` est vrai ; le réglage « Gestes de mouvement » coupe le capteur
 * lui-même, donc rien n'arrive quand il est désactivé.
 *
 * Toujours fournir un bouton équivalent dans l'écran : la secousse n'est
 * qu'un raccourci.
 */
export function useShakeAction(handler: () => void, enabled = true): void {
  const focused = useScreenFocused();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled || !focused) return;
    return shakeRouter.register(() => ref.current());
  }, [enabled, focused]);
}

export default useShakeAction;
