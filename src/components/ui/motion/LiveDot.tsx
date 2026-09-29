/**
 * LiveDot — point « en direct » : pastille fixe + anneau radar qui s'étend
 * (1 → 2,4, opacité 0,55 → 0, 2,4 s). C'est la SEULE boucle permise par le
 * style guide ; elle se met en pause écran masqué, app en arrière-plan ou
 * animations réduites (point fixe seul).
 *
 * M11 (round 2) : une HORLOGE PARTAGÉE (module) pour tous les points : dans
 * une liste, ils battent en phase au lieu de pulser en désordre. L'horloge
 * tourne tant qu'au moins un point est animé, s'arrête avec le dernier.
 */
import React, { memo, useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Curves, Durations } from '../../../constants/motion';
import { useTheme } from '../../../contexts/ThemeContext';
import { useMotionGate } from './useMotionGate';

export interface LiveDotProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

type Clock = { value: number };
let clock: Clock | null = null;
let users = 0;

function getClock(): Clock {
  if (!clock) {
    const make = (Reanimated as unknown as { makeMutable?: (v: number) => Clock }).makeMutable;
    clock = typeof make === 'function' ? make(0) : { value: 0 };
  }
  return clock;
}

function acquireClock() {
  const c = getClock();
  users += 1;
  if (users === 1) {
    c.value = 0;
    c.value = withRepeat(withTiming(1, { duration: Durations.ambient, easing: Curves.out }), -1, false);
  }
}

function releaseClock() {
  users = Math.max(0, users - 1);
  if (users === 0 && clock) {
    cancelAnimation(clock as never);
    clock.value = 0;
  }
}

function LiveDotComponent({ size = 8, color, style, testID }: LiveDotProps) {
  const { colors } = useTheme();
  const { canAnimate } = useMotionGate();
  const c = color ?? colors.accent;
  const p = getClock();

  useEffect(() => {
    if (!canAnimate) return;
    acquireClock();
    return releaseClock;
  }, [canAnimate]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - p.value),
    transform: [{ scale: 1 + p.value * 1.4 }],
  }));

  return (
    <View style={[{ width: size, height: size }, style]} testID={testID} pointerEvents="none">
      {canAnimate && (
        <Animated.View
          style={[
            { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: c },
            ringStyle,
          ]}
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c }} />
    </View>
  );
}

export const LiveDot = memo(LiveDotComponent);
export default LiveDot;
