/**
 * Stamp — tampon incliné qui « s'écrase » (E4 : billet VALIDÉ, E6 : événement
 * EN REVUE).
 *
 * - `play` = true : scale 1.6 → 1 (spring sec) + opacité 0 → 0.92 ; au
 *   CONTACT (fin de la descente), `onImpact` part (haptique medium/success,
 *   règle « haptique au pic visuel »).
 * - `play` = false : tampon statique, déjà posé (état au repos).
 * - « Réduire les animations » : statique, mais `onImpact` part quand même
 *   une fois (l'haptique n'est pas du mouvement).
 */
import React, { memo, useEffect, useRef } from 'react';
import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { FontFamily } from '../../../constants/theme';
import { useFirstSeen } from './useFirstSeen';

export interface StampProps {
  label: string;
  color: string;
  play?: boolean;
  /** Inclinaison finale en degrés (défaut −8). */
  rotate?: number;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
  onImpact?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const SIZES = {
  sm: { font: 11, padH: 8, padV: 3, border: 2, radius: 6, letter: 1.2 },
  md: { font: 15, padH: 12, padV: 5, border: 2.5, radius: 8, letter: 1.6 },
  lg: { font: 20, padH: 16, padV: 7, border: 3, radius: 10, letter: 2 },
};

function StampComponent({
  label,
  color,
  play = false,
  rotate = -8,
  size = 'md',
  delay = 0,
  onImpact,
  style,
  testID,
}: StampProps) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;
  const scale = useSharedValue(animate ? 1.6 : 1);
  const opacity = useSharedValue(animate ? 0 : 0.92);
  const cb = useRef(onImpact);
  cb.current = onImpact;
  const impact = () => cb.current?.();

  useEffect(() => {
    if (!play) return;
    if (reduced) {
      scale.value = 1;
      opacity.value = 0.92;
      const t = setTimeout(impact, delay);
      return () => clearTimeout(t);
    }
    scale.value = 1.6;
    opacity.value = 0;
    opacity.value = withDelay(delay, withTiming(0.92, { duration: 140 }));
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(0.96, { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(impact)();
        }),
        withSpring(1, { damping: 10, stiffness: 420 }),
      ),
    );
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, reduced]);

  const s = SIZES[size];
  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${rotate}deg` }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.stamp,
        {
          borderColor: color,
          borderWidth: s.border,
          borderRadius: s.radius,
          paddingHorizontal: s.padH,
          paddingVertical: s.padV,
        },
        aStyle,
        style,
      ]}
    >
      <Text style={[styles.label, { color, fontSize: s.font, letterSpacing: s.letter }]} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stamp: { alignSelf: 'flex-start' },
  label: { fontFamily: FontFamily.displayExtraBold },
});

export const Stamp = memo(StampComponent);

/**
 * FirstSeenStamp — tampon qui ne s'écrase que la première fois que l'app voit
 * `id` (clé AsyncStorage `storageKey`), posé statique ensuite. Rien n'est
 * rendu tant que le stockage n'a pas répondu (pas de tampon rejoué).
 */
export interface FirstSeenStampProps extends Omit<StampProps, 'play'> {
  storageKey: string;
  id: string | number | null | undefined;
}

function FirstSeenStampComponent({ storageKey, id, onImpact, ...rest }: FirstSeenStampProps) {
  const first = useFirstSeen(storageKey, id);
  if (first === null) return null;
  return <Stamp {...rest} play={first} onImpact={first ? onImpact : undefined} />;
}

export const FirstSeenStamp = memo(FirstSeenStampComponent);
export default Stamp;
