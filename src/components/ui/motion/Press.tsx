/**
 * Press — la pression commune (round 2, M4).
 *
 * Remplace les réglages disparates des boutons, cartes et chips :
 *   - enfoncement en 100 ms (token `pressIn`), INTERRUPTIBLE : l'animation
 *     repart toujours de la valeur courante ;
 *   - relâchement en ressort « respond » (léger rebond 0,1) ;
 *   - amplitude par rôle : bouton 0,97 · carte 0,98 · chip 0,95 ;
 *   - vibration à la VALIDATION (onPress), jamais à l'enfoncement : poser le
 *     doigt sur une carte pour faire défiler ne vibre plus ;
 *   - `inList` : délai de surbrillance de 80 ms, comme iOS dans une vue qui
 *     défile (un défilement qui commence sur une carte ne l'enfonce pas).
 * Réduire les animations : aucune échelle, retour tactile seul.
 */
import React, { useCallback } from 'react';
import { GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { haptics } from '../../../utils/haptics';
import { Amplitudes, Curves, Durations, springConfig } from '../../../constants/motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export type PressRole = 'button' | 'card' | 'chip';
export type PressHaptic = boolean | 'selection' | 'light' | 'medium';

const ROLE_SCALE: Record<PressRole, number> = {
  button: Amplitudes.pressButton,
  card: Amplitudes.pressCard,
  chip: Amplitudes.pressChip,
};

export interface PressProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Rôle visuel (amplitude de pression) — distinct du `role` ARIA de Pressable. */
  variant?: PressRole;
  /** Surcharge l'amplitude du rôle. */
  scaleTo?: number;
  /** Vibration à la validation (onPress). */
  haptic?: PressHaptic;
  /** Élément dans une liste qui défile : délai de surbrillance de 80 ms. */
  inList?: boolean;
}

export function usePressScale(scaleTo: number) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const pressIn = useCallback(() => {
    if (reduced) return;
    scale.value = withTiming(scaleTo, { duration: Durations.pressIn, easing: Curves.out });
  }, [reduced, scale, scaleTo]);
  const pressOut = useCallback(() => {
    if (reduced) return;
    scale.value = withSpring(1, springConfig('respond'));
  }, [reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { pressIn, pressOut, style };
}

export function fireHaptic(h: PressHaptic | undefined) {
  if (!h) return;
  if (h === true || h === 'light') haptics.light();
  else if (h === 'selection') haptics.selection();
  else haptics.medium();
}

export function Press({
  children,
  style,
  variant = 'button',
  scaleTo,
  haptic,
  inList,
  onPressIn,
  onPressOut,
  onPress,
  accessibilityRole = 'button',
  ...rest
}: PressProps) {
  const { pressIn, pressOut, style: scaleStyle } = usePressScale(scaleTo ?? ROLE_SCALE[variant]);
  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      fireHaptic(haptic);
      onPress?.(e);
    },
    [haptic, onPress],
  );
  return (
    <AnimatedPressableBase
      {...rest}
      accessibilityRole={accessibilityRole}
      unstable_pressDelay={inList ? 80 : rest.unstable_pressDelay}
      onPressIn={(e) => {
        pressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressOut();
        onPressOut?.(e);
      }}
      onPress={handlePress}
      style={[scaleStyle, style]}
    >
      {children}
    </AnimatedPressableBase>
  );
}

export default Press;
