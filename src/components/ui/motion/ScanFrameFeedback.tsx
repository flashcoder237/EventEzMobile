/**
 * ScanFrameFeedback — coins du viseur qui DISENT le résultat d'un scan (G1).
 *
 * Trois états bien distincts, pour l'agent à la porte qui regarde à peine
 * l'écran :
 *   - success : coins verts qui se resserrent (1 → 0.92 → 1) + voile vert
 *     à 18 % pendant ~140 ms ;
 *   - warning : coins ambre + « tic » horizontal de 2 px (déjà scanné,
 *     autre événement) ;
 *   - error   : coins rouges + secousse 6 px × 3 (~260 ms).
 * Retour au blanc après `holdMs`. L'haptique reste à l'appelant (elle est
 * déjà jouée au moment où le résultat tombe). « Réduire les animations » :
 * couleur seule, sans mouvement ni voile.
 */
import React, { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export type ScanFeedbackKind = 'idle' | 'success' | 'warning' | 'error';

export interface ScanFrameFeedbackProps {
  kind: ScanFeedbackKind;
  /** Change à chaque nouveau résultat (même type deux fois de suite). */
  trigger: number;
  colors: { idle?: string; success: string; warning: string; error: string };
  /** Durée avant retour au blanc (ms). */
  holdMs?: number;
  bracketSize?: number;
  inset?: number;
}

const LEVEL: Record<ScanFeedbackKind, number> = { idle: 0, success: 1, warning: 2, error: 3 };

function ScanFrameFeedbackComponent({
  kind,
  trigger,
  colors,
  holdMs = 1600,
  bracketSize = 36,
  inset = 10,
}: ScanFrameFeedbackProps) {
  const reduced = useReducedMotion();
  const level = useSharedValue(0);
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const veil = useSharedValue(0);
  const idle = colors.idle ?? '#FFFFFF';

  useEffect(() => {
    if (trigger === 0 || kind === 'idle') return;
    const target = LEVEL[kind];
    level.value = withSequence(
      withTiming(target, { duration: 150 }),
      withDelay(holdMs, withTiming(0, { duration: 400 })),
    );
    if (reduced) return;
    if (kind === 'success') {
      scale.value = withSequence(
        withTiming(0.92, { duration: 120 }),
        withSpring(1, { damping: 12, stiffness: 300 }),
      );
      veil.value = withSequence(withTiming(0.18, { duration: 60 }), withDelay(80, withTiming(0, { duration: 200 })));
    } else if (kind === 'warning') {
      shakeX.value = withSequence(
        withTiming(2, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(2, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    } else {
      shakeX.value = withSequence(
        withTiming(6, { duration: 43 }),
        withTiming(-6, { duration: 43 }),
        withTiming(6, { duration: 43 }),
        withTiming(-6, { duration: 43 }),
        withTiming(3, { duration: 43 }),
        withTiming(0, { duration: 45 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const bracketColor = useAnimatedStyle(() => ({
    borderColor: interpolateColor(level.value, [0, 1, 2, 3], [idle, colors.success, colors.warning, colors.error]),
  }));
  const group = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: scale.value }],
  }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  const b = { width: bracketSize, height: bracketSize };
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.success }, veilStyle]}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, group]}>
        <Animated.View style={[styles.bracket, b, styles.tl, { top: inset, left: inset }, bracketColor]} />
        <Animated.View style={[styles.bracket, b, styles.tr, { top: inset, right: inset }, bracketColor]} />
        <Animated.View style={[styles.bracket, b, styles.bl, { bottom: inset, left: inset }, bracketColor]} />
        <Animated.View style={[styles.bracket, b, styles.br, { bottom: inset, right: inset }, bracketColor]} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  bracket: { position: 'absolute', borderColor: '#FFFFFF' },
  tl: { borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 },
  tr: { borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 },
  bl: { borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 },
  br: { borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 },
});

export const ScanFrameFeedback = memo(ScanFrameFeedbackComponent);

/**
 * PopOnIncrease — petit « pop » (1 → 1.18 → 1) quand `value` MONTE. Rien au
 * montage, rien à la baisse, rien en reduced-motion.
 */
export interface PopOnIncreaseProps {
  value: number;
  children: React.ReactNode;
}

function PopOnIncreaseComponent({ value, children }: PopOnIncreaseProps) {
  const reduced = useReducedMotion();
  const prev = React.useRef(value);
  const s = useSharedValue(1);
  useEffect(() => {
    const up = value > prev.current;
    prev.current = value;
    if (!up || reduced) return;
    s.value = withSequence(withTiming(1.18, { duration: 110 }), withSpring(1, { damping: 10, stiffness: 320 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export const PopOnIncrease = memo(PopOnIncreaseComponent);
export default ScanFrameFeedback;
