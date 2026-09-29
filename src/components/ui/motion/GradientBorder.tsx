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
 *                balayage (comète qui fait un tour en 900 ms puis s'efface).
 *   - `sweep`  : alias de `idle` (compat).
 *   - `focus`  : `active` = anneau FIXE allumé (aucune rotation : rien ne
 *                tourne dans la vision périphérique pendant qu'on tape) ;
 *                chaque changement d'`energy` (frappe) donne un bref éclat
 *                d'opacité (120 ms) qui retombe en 400 ms.
 *   - `busy`   : rotation (1 tour / 1,2 s) — chargement. Ne démarre qu'après
 *                300 ms : un résultat rapide n'allume rien.
 *   - `static` : anneau fixe (opacité `restOpacity`, 0,35 par défaut).
 *
 * Durées et courbes : tokens `constants/motion`.
 *
 * Réduire les animations : jamais de rotation, uniquement de l'opacité.
 * Fond intérieur : `colors.card` par défaut — JAMAIS `colors.white` (dark).
 */
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
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
import { Curves, Durations } from '../../../constants/motion';

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

const BUSY_DEG_PER_MS = 360 / 1200;
/** Délai avant d'afficher l'état « chargement ». */
const BUSY_DELAY_MS = 300;
/** Opacité de l'anneau fixe au focus, et pic de l'éclat de frappe. */
const FOCUS_REST = 0.8;
const FOCUS_FLARE = 1;

/** Durée totale d'un balayage (angle et opacité). */
export const SWEEP_DURATION_MS = Durations.celebrate;

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

  // --- Chargement (busy) : rotation intégrée par frame (indépendante de la
  // fréquence d'affichage : angle += vitesse × dt). -----------------------
  const frame = useFrameCallback((info) => {
    'worklet';
    const dt = info.timeSincePreviousFrame ?? 16;
    angle.value = (angle.value + BUSY_DEG_PER_MS * dt) % 360;
  }, false);

  useEffect(() => {
    if (!continuous) return;
    const on = active;
    if (mode === 'focus') {
      frame.setActive(false);
      opacity.value = withTiming(on ? FOCUS_REST : rest, {
        duration: on ? Durations.respond : Durations.exit,
        easing: Curves.out,
      });
      return;
    }
    // busy : rien pendant 300 ms, puis anneau plein qui tourne.
    if (!on) {
      frame.setActive(false);
      opacity.value = withTiming(rest, { duration: Durations.exit, easing: Curves.out });
      return;
    }
    const id = setTimeout(() => {
      opacity.value = withTiming(1, { duration: Durations.respond, easing: Curves.out });
      frame.setActive(canAnimate);
    }, BUSY_DELAY_MS);
    return () => {
      clearTimeout(id);
      frame.setActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous, mode, active, canAnimate, rest]);

  // Éclat de frappe (focus uniquement, jamais au montage) : opacité seule.
  const lastEnergy = useRef(energy);
  useEffect(() => {
    if (lastEnergy.current === energy) return;
    lastEnergy.current = energy;
    if (mode !== 'focus' || !active || reduced) return;
    cancelAnimation(opacity);
    opacity.value = withSequence(
      withTiming(FOCUS_FLARE, { duration: 120, easing: Curves.out }),
      withTiming(FOCUS_REST, { duration: Durations.inform, easing: Curves.out }),
    );
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
          withTiming(0.6, { duration: Durations.respond }),
          withTiming(0.6, { duration: 440 }),
          withTiming(rest, { duration: 300 }),
        );
      }
      return;
    }
    // Un tour en 900 ms (budget d'un moment rare), opacité alignée.
    angle.value = 0;
    opacity.value = withSequence(
      withTiming(1, { duration: 120, easing: Curves.out }),
      withTiming(1, { duration: 480 }),
      withTiming(rest, { duration: 300, easing: Curves.out }),
    );
    angle.value = withTiming(360, { duration: SWEEP_DURATION_MS, easing: Curves.out });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, isSweep]);

  // Statique : suit `restOpacity`.
  useEffect(() => {
    if (mode === 'static') opacity.value = withTiming(rest, { duration: Durations.respond });
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
