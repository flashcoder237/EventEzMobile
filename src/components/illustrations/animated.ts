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
  withSpring,
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

/**
 * Draw-on effect for a Path. Animates `strokeDashoffset` from `pathLength` → 0
 * so the stroke appears to trace itself on screen.
 *
 * Pass the total path length (estimate with a generous value like 300-800).
 * The consuming Path must set `strokeDasharray={pathLength}` and use the
 * returned animatedProps.
 */
export function useDraw(
  pathLength: number,
  duration = 900,
  delay = 0,
) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(pathLength);

  useEffect(() => {
    if (reduced) {
      offset.value = 0;
      return;
    }
    offset.value = withDelay(
      delay,
      withTiming(0, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [reduced]);

  return useAnimatedProps(() => ({
    strokeDashoffset: offset.value as number,
  }));
}

/**
 * Staggered fade-in for a group of elements. Returns a factory that,
 * given an index, produces animatedProps with the element's opacity.
 *
 *   const fade = useStaggeredFade(5, { stagger: 80, duration: 420 });
 *   <ACircle animatedProps={fade(0)} />
 *   <ACircle animatedProps={fade(1)} />
 */
export function useStaggeredFade(
  count: number,
  opts: { stagger?: number; duration?: number; delay?: number } = {},
) {
  const { stagger = 80, duration = 420, delay = 0 } = opts;
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      v.value = 1;
      return;
    }
    v.value = withDelay(
      delay,
      withTiming(1, {
        duration: duration + stagger * count,
        easing: Easing.out(Easing.ease),
      }),
    );
  }, [reduced]);

  return (index: number) =>
    useAnimatedProps(() => {
      const start = (index * stagger) / (duration + stagger * count);
      const end = start + duration / (duration + stagger * count);
      const progress = Math.min(
        1,
        Math.max(0, (v.value - start) / (end - start)),
      );
      return { opacity: progress };
    });
}

/**
 * Animated rotation for a G (group). Returns a string for the `rotation` attr
 * via a transform origin at (cx, cy). Spins from -angle° → 0° once on mount.
 */
export function useSpinIn(
  cx: number,
  cy: number,
  startAngle = -20,
  delay = 0,
) {
  const reduced = useReducedMotion();
  const r = useSharedValue(reduced ? 0 : startAngle);

  useEffect(() => {
    if (reduced) return;
    r.value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 120 }));
  }, [reduced]);

  return useAnimatedProps(() => ({
    transform: [
      { translateX: cx },
      { translateY: cy },
      { rotate: `${r.value}deg` },
      { translateX: -cx },
      { translateY: -cy },
    ] as any,
  }));
}
