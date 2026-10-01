/**
 * usePhonePosture — socle des gestes « téléphone » (round 3, G0).
 *
 * Un seul pont capteurs (GRAVITY + ACCELEROMETER de Reanimated, thread UI,
 * aucune dépendance native → livrable en OTA) qui fait tourner les détecteurs
 * PURS de `lib/utils/posture` et remonte des événements côté JS :
 *
 *   shake · faceDown · faceUp · presentAway · presentBack · raise
 *
 * Portes (toutes obligatoires) :
 *   - écran affiché ET app au premier plan (capteurs démontés sinon : 0 batterie) ;
 *   - réglage « Gestes du téléphone » (`motionGestures`) actif ;
 *   - au moins un gestionnaire fourni ;
 *   - `shake` coupé en __DEV__ (la secousse ouvre le menu de développement),
 *     ignoré si un doigt est sur l'écran ou s'il vient d'être levé (< 300 ms,
 *     défilement inertiel probable).
 *
 * « Réduire les animations » ne coupe PAS les gestes (ce ne sont pas des
 * animations) : chaque écran décide de l'effet visuel qu'il joue derrière.
 *
 * Usage :
 *   const { sensorElement } = usePhonePosture({ faceDown: dim, faceUp: restore });
 *   return <View>{sensorElement}…</View>;
 */
import React, { useRef } from 'react';
import { Platform } from 'react-native';
import {
  runOnJS,
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useSharedValue,
} from 'react-native-reanimated';
import { useAppActive, useScreenFocused } from './useMotionGate';
import { useSensoryPref } from '../../../hooks/useSensoryPrefs';
import {
  initialPostureState,
  normalizeAxes,
  PostureEvent,
  PostureState,
  stepPosture,
} from '../../../lib/utils/posture';

export type { PostureEvent } from '../../../lib/utils/posture';
export type PostureHandlers = Partial<Record<PostureEvent, () => void>>;

/** 50 Hz : largement assez pour une secousse, sobre en batterie. */
const SENSOR_INTERVAL_MS = 20;
/** Délai après le dernier lever de doigt pendant lequel une « secousse » est ignorée. */
const TOUCH_GRACE_MS = 300;

// ---------------------------------------------------------------------------
// Activité tactile globale (branchée sur la racine de l'app, App.tsx)
// ---------------------------------------------------------------------------
let touchesDown = 0;
let lastTouchEndAt = 0;

type TouchLike = { nativeEvent?: { touches?: ArrayLike<unknown> } } | undefined;
const remaining = (e: TouchLike, fallback: number) => {
  const n = e?.nativeEvent?.touches?.length;
  return typeof n === 'number' ? n : fallback;
};

export const postureTouch = {
  start(e?: TouchLike): void {
    touchesDown = Math.max(1, remaining(e, touchesDown + 1));
  },
  end(e?: TouchLike): void {
    // Nombre de doigts RESTANTS (robuste au multi-touch, jamais bloqué > 0).
    touchesDown = Math.max(0, remaining(e, touchesDown - 1));
    lastTouchEndAt = Date.now();
  },
  /** Un doigt est posé, ou vient d'être levé (défilement inertiel probable). */
  busy(now: number = Date.now()): boolean {
    return touchesDown > 0 || now - lastTouchEndAt < TOUCH_GRACE_MS;
  },
  /** Tests uniquement. */
  __reset(): void {
    touchesDown = 0;
    lastTouchEndAt = 0;
  },
};

/** Filtre côté JS (testable) : faut-il relayer cet événement ? */
export function shouldDeliverPosture(event: PostureEvent, opts: { dev: boolean; now?: number }): boolean {
  if (event !== 'shake') return true;
  if (opts.dev) return false;
  return !postureTouch.busy(opts.now);
}

function PostureSensorBridge({ onEvent }: { onEvent: (e: PostureEvent) => void }) {
  const accel = useAnimatedSensor(SensorType.ACCELEROMETER, { interval: SENSOR_INTERVAL_MS });
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: SENSOR_INTERVAL_MS });
  const state = useSharedValue<PostureState>(initialPostureState());
  // Lu côté JS puis capturé (jamais d'appel JS dans un worklet).
  const isIOS = Platform.OS === 'ios';

  useAnimatedReaction(
    () => accel.sensor.value,
    (a) => {
      if (!a) return;
      const g = gravity.sensor.value;
      const [ax, ay, az] = normalizeAxes(a.x, a.y, a.z, isIOS);
      let gx = 0;
      let gy = 0;
      let gz = 0;
      if (g && Math.abs(g.x) + Math.abs(g.y) + Math.abs(g.z) > 5) {
        const n = normalizeAxes(g.x, g.y, g.z, isIOS);
        gx = n[0];
        gy = n[1];
        gz = n[2];
      } else {
        // Pas de capteur de gravité (rare sur Android) : composante lente de
        // l'accéléromètre, déjà calculée par les détecteurs.
        gx = state.value.lastT === 0 ? ax : state.value.lpX;
        gy = state.value.lastT === 0 ? ay : state.value.lpY;
        gz = state.value.lastT === 0 ? az : state.value.lpZ;
      }
      const r = stepPosture(state.value, { t: Date.now(), gx, gy, gz, ax, ay, az });
      state.value = r.state;
      for (let i = 0; i < r.events.length; i++) {
        runOnJS(onEvent)(r.events[i]);
      }
    },
  );
  return null;
}

export interface PhonePostureResult {
  /** À rendre n'importe où dans l'écran ; null quand les capteurs sont coupés. */
  sensorElement: React.ReactElement | null;
  /** Capteurs actifs. */
  active: boolean;
}

export function usePhonePosture(handlers: PostureHandlers, options: { enabled?: boolean } = {}): PhonePostureResult {
  const { enabled = true } = options;
  const appActive = useAppActive();
  const focused = useScreenFocused();
  const [gesturesOn] = useSensoryPref('motionGestures');

  // Gestionnaires toujours frais sans remonter le pont capteurs.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const onEventRef = useRef((e: PostureEvent) => {
    if (!shouldDeliverPosture(e, { dev: __DEV__ })) return;
    handlersRef.current[e]?.();
  });

  const hasHandler = Object.values(handlers).some(Boolean);
  const active = enabled && gesturesOn && appActive && focused && hasHandler;

  // Démonté dès qu'une porte se ferme : à la réactivation, l'état des
  // détecteurs repart de zéro (pas de faceUp fantôme hérité).
  const sensorElement = active ? <PostureSensorBridge onEvent={onEventRef.current} /> : null;
  return { sensorElement, active };
}

export default usePhonePosture;
