/**
 * useTilt — inclinaison lissée (-1 … 1 sur deux axes) pilotée par le
 * gyroscope, avec repli au doigt. Sert au billet holographique (E3).
 *
 * - Capteur : `useAnimatedSensor(SensorType.ROTATION)` de Reanimated → tourne
 *   sur le thread UI, AUCUNE dépendance native ajoutée (livrable en OTA).
 * - Le capteur vit dans un composant `sensorElement` que l'appelant rend :
 *   il n'est monté que si le mouvement est permis (écran affiché, app active,
 *   animations non réduites) → zéro coût batterie sinon.
 * - La position « neutre » suit lentement la façon dont on tient le téléphone.
 *
 * Usage :
 *   const { tiltX, tiltY, gesture, sensorElement } = useTilt();
 *   const style = useAnimatedStyle(() => ({
 *     transform: [{ perspective: 800 }, { rotateY: `${tiltX.value * 2.5}deg` }],
 *   }));
 *   return (
 *     <GestureDetector gesture={gesture}>
 *       <Animated.View style={style}>{sensorElement}…</Animated.View>
 *     </GestureDetector>
 *   );
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  runOnJS,
  SensorType,
  SharedValue,
  useAnimatedReaction,
  useAnimatedSensor,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { useMotionGate } from './useMotionGate';
import { springConfig } from '../../../constants/motion';

const RANGE = 0.45; // radians d'inclinaison pour atteindre ±1
/** Capteur coupé après ce délai d'immobilité (batterie) ; un toucher le réveille. */
const IDLE_MS = 15000;
const MOVE_EPS = 0.004; // radians : en dessous, le téléphone est « posé »
/**
 * Après 2 s sans mouvement, l'inclinaison est FIGÉE : le billet ne bouge plus
 * quand on le présente au scanner (QR stable). Tout mouvement la relâche.
 */
const FREEZE_MS = 2000;
/** Constante de temps du lissage (ms) — indépendant de la fréquence d'écran. */
const SMOOTH_MS = 80;

function clamp(v: number): number {
  'worklet';
  return Math.max(-1, Math.min(1, v));
}

function TiltSensorBridge({
  tiltX,
  tiltY,
  onIdle,
}: {
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  onIdle: () => void;
}) {
  // 'auto' : cadence native de l'écran (60/120 Hz) — plus de paliers visibles
  // d'un échantillonnage fixe à 30 Hz.
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 'auto' });
  const baseRoll = useSharedValue<number | null>(null);
  const basePitch = useSharedValue<number | null>(null);
  const lastRoll = useSharedValue(0);
  const lastPitch = useSharedValue(0);
  const lastMoveAt = useSharedValue(0);
  const lastSampleAt = useSharedValue(0);
  const idleSent = useSharedValue(false);

  useAnimatedReaction(
    () => sensor.sensor.value,
    (v) => {
      if (!v) return;
      const now = Date.now();
      if (baseRoll.value === null || basePitch.value === null) {
        baseRoll.value = v.roll;
        basePitch.value = v.pitch;
        lastRoll.value = v.roll;
        lastPitch.value = v.pitch;
        lastMoveAt.value = now;
        lastSampleAt.value = now;
        return;
      }
      const dt = Math.max(1, Math.min(100, now - lastSampleAt.value));
      lastSampleAt.value = now;
      // Immobilité prolongée → on rend la main (le capteur est démonté).
      if (Math.abs(v.roll - lastRoll.value) + Math.abs(v.pitch - lastPitch.value) > MOVE_EPS) {
        lastMoveAt.value = now;
      }
      lastRoll.value = v.roll;
      lastPitch.value = v.pitch;
      if (!idleSent.value && now - lastMoveAt.value > IDLE_MS) {
        idleSent.value = true;
        runOnJS(onIdle)();
      }
      // Immobile depuis 2 s : inclinaison figée (QR stable devant le scanner).
      if (now - lastMoveAt.value > FREEZE_MS) return;
      // Lissage par frame, facteur fonction de dt (même rendu à 60 ou 120 Hz).
      const k = 1 - Math.exp(-dt / SMOOTH_MS);
      // La position neutre dérive doucement vers la tenue actuelle.
      const kBase = 1 - Math.exp(-dt / 1600);
      baseRoll.value += (v.roll - baseRoll.value) * kBase;
      basePitch.value += (v.pitch - basePitch.value) * kBase;
      const tx = clamp((v.roll - baseRoll.value) / RANGE);
      const ty = clamp((v.pitch - basePitch.value) / RANGE);
      tiltX.value += (tx - tiltX.value) * k;
      tiltY.value += (ty - tiltY.value) * k;
    },
  );
  return null;
}

export interface TiltResult {
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  /** Geste de repli (doigt) ; à passer à <GestureDetector>. */
  gesture: ReturnType<typeof Gesture.Pan>;
  /** À rendre n'importe où sous l'écran ; null quand le mouvement est coupé. */
  sensorElement: React.ReactElement | null;
  enabled: boolean;
  /** Capteur endormi après 15 s d'immobilité (un toucher le réveille). */
  asleep: boolean;
  wake: () => void;
}

export function useTilt(options: { enabled?: boolean; sensor?: boolean } = {}): TiltResult {
  const { enabled = true, sensor = true } = options;
  const { canAnimate } = useMotionGate();
  const on = enabled && canAnimate;
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const [asleep, setAsleep] = useState(false);
  const wake = useCallback(() => setAsleep(false), []);
  const sleep = useCallback(() => {
    setAsleep(true);
    tiltX.value = withSpring(0, springConfig('drift'));
    tiltY.value = withSpring(0, springConfig('drift'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retour sur l'écran / dans l'app : capteur réarmé.
  useEffect(() => {
    if (on) setAsleep(false);
  }, [on]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(on)
        // Horizontal seulement : le défilement vertical de l'écran reste prioritaire.
        .activeOffsetX([-12, 12])
        .failOffsetY([-10, 10])
        .onBegin(() => {
          runOnJS(wake)();
        })
        .onUpdate((e) => {
          tiltX.value = clamp(e.translationX / 140);
          tiltY.value = clamp(-e.translationY / 140);
        })
        .onEnd(() => {
          tiltX.value = withSpring(0, springConfig('drift'));
          tiltY.value = withSpring(0, springConfig('drift'));
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [on],
  );

  const sensorElement =
    on && sensor && !asleep ? <TiltSensorBridge tiltX={tiltX} tiltY={tiltY} onIdle={sleep} /> : null;

  useEffect(() => {
    if (on) return;
    tiltX.value = withSpring(0, springConfig('drift'));
    tiltY.value = withSpring(0, springConfig('drift'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  return { tiltX, tiltY, gesture, sensorElement, enabled: on, asleep, wake };
}

export default useTilt;
