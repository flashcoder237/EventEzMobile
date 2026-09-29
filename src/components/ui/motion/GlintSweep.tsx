/**
 * GlintSweep — un reflet diagonal qui traverse son parent UNE fois à chaque
 * changement de `trigger` (généralise le ShimmerBand de MyTickets, sans boucle).
 *
 * À poser en dernier enfant d'un conteneur `overflow: 'hidden'` :
 *   <View style={{ overflow: 'hidden' }}>
 *     …
 *     <GlintSweep trigger={seenKey} />
 *   </View>
 *
 * `playOnMount` : joue aussi au premier rendu (ex. carte « À la une » vue
 * pour la première fois). Coupé si les animations sont réduites.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useMotionGate } from './useMotionGate';

export interface GlintSweepProps {
  trigger?: number | string | boolean;
  playOnMount?: boolean;
  duration?: number;
  delay?: number;
  /** Couleur du reflet (défaut blanc 28 %). */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

function GlintSweepComponent({
  trigger,
  playOnMount = false,
  duration = 900,
  delay = 0,
  color = 'rgba(255,255,255,0.28)',
  style,
}: GlintSweepProps) {
  const { canAnimate } = useMotionGate();
  const [w, setW] = useState(0);
  const x = useSharedValue(-1);
  const lastTrigger = useRef(trigger);
  const mountPlayed = useRef(false);

  useEffect(() => {
    // Attend la mesure : un changement de trigger survenu avant reste « dû ».
    if (w === 0) return;
    const changed = trigger !== lastTrigger.current;
    lastTrigger.current = trigger;
    const mountPlay = playOnMount && !mountPlayed.current;
    mountPlayed.current = true;
    // La simple mesure du layout ne déclenche rien : seul un vrai changement
    // de trigger (ou playOnMount, une fois) joue le reflet.
    if (!changed && !mountPlay) return;
    if (!canAnimate) return;
    x.value = -1;
    x.value = withDelay(delay, withTiming(1, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, w]);

  const band = Math.max(60, w * 0.45);
  const anim = useAnimatedStyle(() => ({
    // x : -1 → 1  ⇒  la bande part juste avant le bord gauche et sort à droite.
    transform: [{ translateX: -band + ((x.value + 1) / 2) * (w + band) }, { skewX: '-20deg' }],
    opacity: x.value <= -1 || x.value >= 1 ? 0 : 1,
  }));

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: band }, anim]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', color, 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export const GlintSweep = memo(GlintSweepComponent);
export default GlintSweep;
