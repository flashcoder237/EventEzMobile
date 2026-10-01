/**
 * ValidityProofRing — « preuve de validité » d'un billet (round 3, G7).
 *
 * Appui long sur le QR : un anneau en dégradé tourne AUTOUR du cadre blanc du
 * QR (jamais dessus) et suit l'inclinaison du téléphone, et l'heure s'affiche
 * à la seconde. Une capture d'écran ne bouge pas et ne donne pas l'heure :
 * le contrôleur voit tout de suite qu'il s'agit d'un billet vivant.
 *
 * Technique : celle de GradientBorder — un conteneur arrondi `overflow:hidden`
 * placé DERRIÈRE le cadre du QR ; dedans, un carré (côté = diagonale) qui porte
 * un LinearGradient et tourne (un seul transform, thread UI). Le cadre blanc
 * du QR recouvre le centre : seul l'anneau extérieur est visible.
 *
 * Réduire les animations : pas d'anneau, l'heure seule (ProofClock).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextStyle, StyleProp } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import haptics from '../../utils/haptics';

/** Vitesse de base (tour / 4 s) : vivant sans être agité. */
const DEG_PER_MS = 360 / 4000;
/** Inclinaison ±1 → ±120° de décalage de l'anneau. */
const TILT_DEG = 120;

export interface ValidityProofRingProps {
  active: boolean;
  /** Côté extérieur de la zone où dessiner l'anneau (px). */
  size: number;
  inset: number;
  radius: number;
  colors: readonly string[];
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  reduced: boolean;
}

export function ValidityProofRing({ active, size, inset, radius, colors, tiltX, tiltY, reduced }: ValidityProofRingProps) {
  const spin = useSharedValue(0);
  const opacity = useSharedValue(0);
  const on = active && !reduced;

  const frame = useFrameCallback((f) => {
    spin.value = (spin.value + (f.timeSincePreviousFrame ?? 16) * DEG_PER_MS) % 360;
  }, false);

  useEffect(() => {
    frame.setActive(on);
    opacity.value = withTiming(on ? 1 : 0, { duration: on ? 120 : 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  const diag = Math.ceil(size * Math.SQRT2);
  const rotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value + tiltX.value * TILT_DEG + tiltY.value * (TILT_DEG / 2)}deg` }],
  }));
  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (reduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { top: inset, left: inset, right: inset, bottom: inset, borderRadius: radius },
        wrapStyle,
      ]}
    >
      <Animated.View
        style={[
          { position: 'absolute', width: diag, height: diag, left: '50%', top: '50%', marginLeft: -diag / 2, marginTop: -diag / 2 },
          rotStyle,
        ]}
      >
        <LinearGradient
          colors={colors as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

/**
 * Heure à la seconde, tant que `active`. `tickHaptic` : un cran léger à chaque
 * seconde (le doigt est posé — G7).
 */
export function ProofClock({
  active,
  tickHaptic,
  style,
  label,
}: {
  active: boolean;
  tickHaptic: boolean;
  style?: StyleProp<TextStyle>;
  label: (time: string) => string;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      // Calé sur le changement de seconde réel (pas de dérive).
      timer = setTimeout(() => {
        setNow(new Date());
        if (tickHaptic) haptics.light();
        loop();
      }, 1000 - (Date.now() % 1000) + 5);
    };
    loop();
    return () => clearTimeout(timer);
  }, [active, tickHaptic]);
  if (!active) return null;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return (
    <Text style={style} accessibilityLiveRegion="polite" accessibilityLabel={label(time)}>
      {time}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    overflow: 'hidden',
  },
});

export default ValidityProofRing;
