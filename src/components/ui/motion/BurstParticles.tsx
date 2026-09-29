/**
 * BurstParticles — petit éclat de 6 particules (indigo / violet / corail) qui
 * partent en étoile puis s'effacent en ~350 ms (catalogue E1).
 *
 * À poser en absolu, centré sur l'icône qui vient d'être activée. Rien ne se
 * monte tant que `trigger` n'a pas changé ; les vues disparaissent dès la fin
 * de l'éclat (coût nul dans une liste). Réduire les animations : rien.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../../contexts/ThemeContext';
import { Curves } from '../../../constants/motion';
import { useMotionGate } from './useMotionGate';

export interface BurstParticlesProps {
  /** Chaque nouvelle valeur (hors montage) joue un éclat. */
  trigger?: number | string;
  /** Distance parcourue par chaque particule (px). */
  distance?: number;
  /** Diamètre d'une particule (px). */
  dotSize?: number;
  count?: number;
  duration?: number;
}

function Particle({
  angle,
  color,
  distance,
  dotSize,
  duration,
}: {
  angle: number;
  color: string;
  distance: number;
  dotSize: number;
  duration: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration, easing: Curves.out });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rad = (angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateX: Math.cos(rad) * distance * p.value },
      { translateY: Math.sin(rad) * distance * p.value },
      { scale: 1 - p.value * 0.4 },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
          left: -dotSize / 2,
          top: -dotSize / 2,
        },
        style,
      ]}
    />
  );
}

function BurstParticlesComponent({
  trigger,
  distance = 12,
  dotSize = 3,
  count = 6,
  duration = 350,
}: BurstParticlesProps) {
  const { gradients } = useTheme();
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  const [burst, setBurst] = useState(0);
  const last = useRef(trigger);

  useEffect(() => {
    if (last.current === trigger) return;
    last.current = trigger;
    if (trigger === undefined || !canAnimate) return;
    setBurst((b) => b + 1);
    const id = setTimeout(() => setBurst(0), duration + 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (!burst) return null;
  const palette = gradients.aurora as readonly string[];
  return (
    <View pointerEvents="none" style={styles.center}>
      {Array.from({ length: count }, (_, i) => (
        <Particle
          key={`${burst}-${i}`}
          angle={(360 / count) * i - 90}
          color={palette[i % palette.length]}
          distance={distance}
          dotSize={dotSize}
          duration={duration}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 },
});

export const BurstParticles = memo(BurstParticlesComponent);
export default BurstParticles;
