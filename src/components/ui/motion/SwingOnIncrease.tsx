/**
 * SwingOnIncrease — la cloche « sonne » : balancement ±14° × 3 autour de son
 * sommet quand `value` AUGMENTE pendant que l'écran est affiché (catalogue D1).
 *
 * Jamais au montage, jamais quand la valeur baisse. Vibration légère une
 * seule fois, plafonnée à une toutes les 10 s par `hapticKey` (plusieurs
 * cloches sur le même écran ne vibrent qu'une fois). Réduire les animations :
 * pas de balancement, la vibration reste.
 */
import React, { memo, useEffect, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { haptics } from '../../../utils/haptics';
import { useMotionGate, useSettled } from './useMotionGate';

export interface SwingOnIncreaseProps {
  value: number;
  children: React.ReactNode;
  angle?: number;
  haptic?: boolean;
  hapticKey?: string;
  style?: StyleProp<ViewStyle>;
}

function SwingOnIncreaseComponent({
  value,
  children,
  angle = 14,
  haptic = true,
  hapticKey = 'bell-swing',
  style,
}: SwingOnIncreaseProps) {
  const { canAnimate, reduced, appActive, focused } = useMotionGate();
  const rot = useSharedValue(0);
  const prev = useRef<number | null>(null);
  const settled = useSettled();

  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    // Hausse pendant la fenêtre de chargement = compteur serveur initial :
    // ni balancement ni vibration au lancement de l'app.
    if (before === null || value <= before || !settled()) return;
    if (!appActive || !focused) return;
    if (haptic) haptics.throttled('light', 10000, hapticKey);
    if (!canAnimate || reduced) return;
    const a = angle;
    rot.value = withSequence(
      withTiming(a, { duration: 90 }),
      withTiming(-a, { duration: 150 }),
      withTiming(a * 0.7, { duration: 140 }),
      withTiming(-a * 0.7, { duration: 140 }),
      withTiming(a * 0.35, { duration: 120 }),
      withTiming(-a * 0.35, { duration: 120 }),
      withTiming(0, { duration: 100 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const swing = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <Animated.View style={[{ transformOrigin: '50% 8%' } as ViewStyle, swing, style]}>{children}</Animated.View>
  );
}

export const SwingOnIncrease = memo(SwingOnIncreaseComponent);
export default SwingOnIncrease;
