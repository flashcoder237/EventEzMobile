/**
 * G10 — Écran éteint contre l'oreille pendant l'écoute d'un message vocal.
 *
 * Tant que `active` est vrai, le capteur de proximité est surveillé : téléphone
 * porté à l'oreille → l'écran s'éteint (plus de joue qui met en pause ou fait
 * défiler la conversation). iOS le fait nativement (isProximityMonitoringEnabled),
 * Android via un verrou PROXIMITY_SCREEN_OFF (plafonné à 15 min côté natif).
 *
 * Coupé avec le réglage « Gestes physiques » (sensoryPrefs `motionGestures`).
 * Sans module natif (Expo Go, tests) : no-op.
 */
import { useEffect } from 'react';
import { setProximityMonitoring } from '../../modules/eventez-native/src';
import { getSensoryPref } from '../lib/sensoryPrefs';

// Plusieurs bulles peuvent demander la surveillance (lecture enchaînée) : on
// compte les demandeurs pour ne la couper qu'au dernier.
let holders = 0;

export function useProximityMonitoring(active: boolean): void {
  useEffect(() => {
    if (!active || !getSensoryPref('motionGestures')) return;
    holders += 1;
    if (holders === 1) void setProximityMonitoring(true);
    return () => {
      holders = Math.max(0, holders - 1);
      if (holders === 0) void setProximityMonitoring(false);
    };
  }, [active]);
}

/** Tests uniquement. */
export function __resetProximityHolders() {
  holders = 0;
}
