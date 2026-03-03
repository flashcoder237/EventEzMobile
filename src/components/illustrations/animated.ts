/**
 * Shared animated SVG primitives and hooks for illustration animations.
 *
 * Animated components MUST be created at module level (not inside components).
 * Hooks return `animatedProps` objects ready to spread on animated components.
 */

import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { Circle, Path, Rect, G, Line, Ellipse } from 'react-native-svg';

// ─── Animated SVG primitives ─────────────────────────────────────────────────
export const ACircle = Animated.createAnimatedComponent(Circle);
export const APath = Animated.createAnimatedComponent(Path);
export const ARect = Animated.createAnimatedComponent(Rect);
export const AG = Animated.createAnimatedComponent(G);
export const ALine = Animated.createAnimatedComponent(Line);
export const AEllipse = Animated.createAnimatedComponent(Ellipse);

// ─── Easing shortcut ────────────────────────────────────────────────────────
const ease = Easing.inOut(Easing.ease);

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Pulsing opacity between min↔max. Returns animatedProps with `opacity`. */
export function usePulse(
  min: number,
  max: number,
  duration = 1800,
  delay = 0,
) {
  const reduced = useReducedMotion();
  const v = useSharedValue(min);

  useEffect(() => {
    if (reduced) {
      v.value = (min + max) / 2;
      return;
    }
    v.value = withDelay(
      delay,
      withRepeat(withTiming(max, { duration, easing: ease }), -1, true),
    );
  }, [reduced]);

  return useAnimatedProps(() => ({ opacity: v.value as number }));
}

/** Pulsing scale on a Circle (animates `r`). */
export function usePulseR(
  baseR: number,
  maxR: number,
  duration = 2000,
  delay = 0,
) {
  const reduced = useReducedMotion();
  const v = useSharedValue(baseR);

  useEffect(() => {
    if (reduced) return;
    v.value = withDelay(
      delay,
      withRepeat(withTiming(maxR, { duration, easing: ease }), -1, true),
    );
  }, [reduced]);

  return useAnimatedProps(() => ({ r: v.value as number }));
}

/** Gentle float on Y axis for a Circle (animates `cy`). */
export function useFloatY(
  baseCy: number,
  distance: number,
  duration = 2500,
  delay = 0,
) {
  const reduced = useReducedMotion();
  const v = useSharedValue(baseCy);

  useEffect(() => {
    if (reduced) return;
    v.value = withDelay(
      delay,
      withRepeat(
        withTiming(baseCy - distance, { duration, easing: ease }),
        -1,
        true,
      ),
    );
  }, [reduced]);

  return useAnimatedProps(() => ({ cy: v.value as number }));
}

/** Gentle swing via opacity (sequence: fade out → fade in with stagger). */
export function useWaveOpacity(
  min: number,
  max: number,
  duration = 1200,
  delay = 0,
) {
  const reduced = useReducedMotion();
  const v = useSharedValue(min);

  useEffect(() => {
    if (reduced) {
      v.value = max;
      return;
    }
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(max, { duration, easing: ease }),
          withTiming(min, { duration, easing: ease }),
        ),
        -1,
      ),
    );
  }, [reduced]);

  return useAnimatedProps(() => ({ opacity: v.value as number }));
}
