/**
 * GradientBorder — bordure en dégradé indigo → violet → corail qui s'allume
 * à des moments choisis (effet « aura », catalogue A1).
 *
 * Technique (sans Skia) : un conteneur arrondi `overflow: hidden` avec un
 * padding = épaisseur ; derrière, un carré de côté = diagonale qui porte un
 * LinearGradient et TOURNE (un seul transform, thread UI) ; par-dessus, le
 * contenu sur fond plein. Seul l'anneau de `width` px reste visible.
 *
 * Modes :
 *   - `idle`   : éteint au repos ; chaque changement de `trigger` joue un
 *                balayage (comète qui fait un tour en 1,4 s puis s'efface).
 *   - `sweep`  : alias de `idle` (compat).
 *   - `focus`  : `active` = allumé, rotation lente (1 tour / 8 s) ; chaque
 *                changement d'`energy` (ex. longueur du texte) accélère un
 *                instant puis ralentit tout seul.
 *   - `busy`   : comme focus, rotation rapide (1 tour / 1,2 s) — chargement.
 *   - `static` : anneau fixe (opacité `restOpacity`, 0,35 par défaut).
 *
 * Réduire les animations : jamais de rotation, uniquement de l'opacité.
 * Fond intérieur : `colors.card` par défaut — JAMAIS `colors.white` (dark).
 */
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';
import { useMotionGate } from './useMotionGate';

export type GradientBorderMode = 'idle' | 'sweep' | 'focus' | 'busy' | 'static';

export interface GradientBorderProps {
  children?: React.ReactNode;
  mode?: GradientBorderMode;
  /** focus/busy : allumé ou non. */
  active?: boolean;
  /** idle/sweep : chaque nouvelle valeur joue un balayage. `undefined` = rien. */
  trigger?: number | string;
  /** focus : chaque nouvelle valeur donne une impulsion de vitesse (frappe). */
  energy?: number | string;
  radius?: number;
  width?: number;
  /** Couleurs du dégradé (défaut : `gradients.aurora`, variante dark auto). */
  colors?: readonly string[];
  /** Opacité au repos (0 = invisible). `static` : 0,35 par défaut. */
  restOpacity?: number;
  /** Couleur du liseré de base, visible sous l'anneau quand il est éteint. */
  baseBorderColor?: string;
  /** Fond intérieur. Défaut : colors.card. */
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const SLOW_DEG_PER_MS = 360 / 8000;
const BUSY_DEG_PER_MS = 360 / 1200;
const BOOST_DEG_PER_MS = 360 / 700;

function GradientBorderComponent({
  children,
  mode = 'idle',
  active = false,
  trigger,
  energy,
  radius = 16,
  width = 1.5,
  colors: colorsProp,
  restOpacity,
  baseBorderColor = 'transparent',
  backgroundColor,
  style,
  innerStyle,
  testID,
}: GradientBorderProps) {
  const { colors, gradients } = useTheme();
  const { canAnimate, reduced } = useMotionGate();
  const palette = (colorsProp ?? gradients.aurora) as readonly string[];
  const isSweep = mode === 'idle' || mode === 'sweep';
  const continuous = mode === 'focus' || mode === 'busy';
  const rest = restOpacity ?? (mode === 'static' ? 0.35 : 0);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w !== size.w || h !== size.h) setSize({ w, h });
  };
  const diag = Math.ceil(Math.sqrt(size.w * size.w + size.h * size.h));

  // Balayage : une « comète » (bande étroite) ; continu/statique : dégradé plein.
  const gradientColors = useMemo(() => {
    if (isSweep) {
      return [withAlpha(palette[0], 0), ...palette, withAlpha(palette[palette.length - 1], 0)];
    }
    return [...palette, palette[0]];
  }, [isSweep, palette]);
  const locations = useMemo(() => {
    if (!isSweep) return undefined;
    const inner = palette.map((_, i) => 0.42 + (0.16 * i) / Math.max(1, palette.length - 1));
    return [0.3, ...inner, 0.7];
  }, [isSweep, palette]);

  const angle = useSharedValue(0);
  const opacity = useSharedValue(rest);
  const boost = useSharedValue(0);
  const speed = useSharedValue(0);

  // --- Continu (focus / busy) : intégration angle += vitesse × dt ---------
  const frame = useFrameCallback((info) => {
    'worklet';
    const dt = info.timeSincePreviousFrame ?? 16;
    angle.value = (angle.value + (speed.value + boost.value * BOOST_DEG_PER_MS) * dt) % 360;
    boost.value = boost.value * 0.94;
  }, false);

  useEffect(() => {
    if (!continuous) return;
    speed.value = mode === 'busy' ? BUSY_DEG_PER_MS : SLOW_DEG_PER_MS;
    const on = active;
    opacity.value = withTiming(on ? 1 : rest, { duration: on ? 250 : 300 });
    frame.setActive(on && canAnimate);
    return () => frame.setActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous, mode, active, canAnimate, rest]);

  // Impulsion de frappe (focus uniquement, jamais au montage).
  const lastEnergy = useRef(energy);
  useEffect(() => {
    if (lastEnergy.current === energy) return;
    lastEnergy.current = energy;
    if (!continuous || !active || !canAnimate) return;
    boost.value = Math.min(boost.value + 1, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [energy]);

  // --- Balayage ponctuel (idle / sweep) : jamais au montage -------------
  const lastTrigger = useRef(trigger);
  useEffect(() => {
    if (!isSweep) return;
    if (lastTrigger.current === trigger) return;
    lastTrigger.current = trigger;
    if (trigger === undefined) return;
    cancelAnimation(angle);
    cancelAnimation(opacity);
    if (!canAnimate) {
      if (reduced) {
        // Fondu seul : l'anneau s'allume puis s'éteint, sans rotation.
        opacity.value = withSequence(
          withTiming(0.6, { duration: 250 }),
          withTiming(0.6, { duration: 500 }),
          withTiming(rest, { duration: 400 }),
        );
      }
      return;
    }
    angle.value = 0;
    opacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(1, { duration: 1100 }),
      withTiming(rest, { duration: 400 }),
    );
    angle.value = withTiming(360, { duration: 1400, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, isSweep]);

  // Statique : suit `restOpacity`.
  useEffect(() => {
    if (mode === 'static') opacity.value = withTiming(rest, { duration: 250 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, rest]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${angle.value}deg` }],
  }));

  const innerRadius = Math.max(0, radius - width);

  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={[
        { borderRadius: radius, padding: width, overflow: 'hidden', backgroundColor: baseBorderColor },
        style,
      ]}
    >
      {diag > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: diag,
              height: diag,
              left: (size.w - diag) / 2,
              top: (size.h - diag) / 2,
            },
            ringStyle,
          ]}
        >
          <LinearGradient
            colors={gradientColors as unknown as [string, string, ...string[]]}
            locations={locations as unknown as [number, number, ...number[]] | undefined}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      <View
        style={[
          { borderRadius: innerRadius, backgroundColor: backgroundColor ?? colors.card, overflow: 'hidden' },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export const GradientBorder = memo(GradientBorderComponent);
export default GradientBorder;
