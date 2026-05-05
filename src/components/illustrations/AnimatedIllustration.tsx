/**
 * AnimatedIllustration — container-level animation wrapper for SVG illustrations.
 *
 * Composes an `entry` animation (runs once on mount) with an optional `idle`
 * animation (runs forever once entry completes). Respects useReducedMotion.
 *
 * Usage:
 *   <AnimatedIllustration entry="scaleIn" idle="float">
 *     <Events color={colors.primary} size={180} />
 *   </AnimatedIllustration>
 *
 * Entry presets: fadeIn · scaleIn · slideUp · bounce · spinIn · none
 * Idle presets:  float · breathe · sway · none
 */

import React, { memo, useEffect } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

export type EntryPreset = 'fadeIn' | 'scaleIn' | 'slideUp' | 'bounce' | 'spinIn' | 'none';
export type IdlePreset = 'float' | 'breathe' | 'sway' | 'none';

interface AnimatedIllustrationProps {
  children: React.ReactNode;
  entry?: EntryPreset;
  idle?: IdlePreset;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

const EASE = Easing.out(Easing.cubic);

function AnimatedIllustrationComponent({
  children,
  entry = 'scaleIn',
  idle = 'float',
  delay = 0,
  duration = 520,
  style,
}: AnimatedIllustrationProps) {
  const reduced = useReducedMotion();

  const opacity = useSharedValue(entry === 'none' || reduced ? 1 : 0);
  const scale = useSharedValue(
    entry === 'scaleIn' || entry === 'bounce' ? 0.7 : 1,
  );
  const translateY = useSharedValue(entry === 'slideUp' ? 24 : 0);
  const rotate = useSharedValue(entry === 'spinIn' ? -0.35 : 0);

  const floatY = useSharedValue(0);
  const breathe = useSharedValue(1);
  const sway = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      scale.value = 1;
      translateY.value = 0;
      rotate.value = 0;
      return;
    }

    opacity.value = withDelay(delay, withTiming(1, { duration, easing: EASE }));

    if (entry === 'scaleIn') {
      scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 140 }));
    } else if (entry === 'bounce') {
      scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 180 }));
    } else if (entry === 'slideUp') {
      translateY.value = withDelay(delay, withTiming(0, { duration, easing: EASE }));
    } else if (entry === 'spinIn') {
      rotate.value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 120 }));
      scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 140 }));
    }

    const idleDelay = delay + duration + 150;

    if (idle === 'float') {
      floatY.value = withDelay(
        idleDelay,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
        ),
      );
    } else if (idle === 'breathe') {
      breathe.value = withDelay(
        idleDelay,
        withRepeat(
          withSequence(
            withTiming(1.035, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
        ),
      );
    } else if (idle === 'sway') {
      sway.value = withDelay(
        idleDelay,
        withRepeat(
          withSequence(
            withTiming(0.04, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
            withTiming(-0.04, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        ),
      );
    }
  }, [reduced, delay, duration, entry, idle]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value + floatY.value },
      { scale: scale.value * breathe.value },
      { rotate: `${rotate.value + sway.value}rad` },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export default memo(AnimatedIllustrationComponent);
