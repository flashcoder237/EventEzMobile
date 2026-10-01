/**
 * H6 — Vibrations « riches » : Core Haptics sur iPhone (intensité + netteté
 * réglées pas à pas, cf. EventezHapticPatterns.swift), repli sur les motifs
 * JS (`haptics.pattern`, round 3) ou, à défaut, sur une vibration simple.
 *
 * Respecte le réglage « Vibrations » (sensoryPrefs) AVANT tout appel natif.
 */
import { getSensoryPref } from '../sensoryPrefs';
import { haptics } from '../../utils/haptics';
import { playRichHaptic, RichHapticName, supportsRichHaptics } from '../../../modules/eventez-native/src';

/** Équivalent JS le plus proche quand Core Haptics n'est pas là. */
const FALLBACK: Record<RichHapticName, string> = {
  heartbeat: 'heartbeat',
  doors: 'heartbeat',
  rise: 'rise',
  celebrate: 'celebrate',
  tick: 'tick',
  wall: 'wall',
};

function fallback(name: RichHapticName): void {
  const h = haptics as unknown as Record<string, any>;
  const key = FALLBACK[name];
  // `haptics.pattern` arrive avec le round 3 (lot 2) ; avant, on prend la
  // méthode simple de même nom si elle existe, sinon un impact léger.
  if (typeof h.pattern === 'function' && key !== 'celebrate') {
    h.pattern(key);
  } else if (typeof h[key] === 'function') {
    h[key]();
  } else {
    h.light?.();
  }
}

export function richHaptic(name: RichHapticName): void {
  if (!getSensoryPref('vibrations')) return;
  if (!supportsRichHaptics()) {
    fallback(name);
    return;
  }
  playRichHaptic(name)
    .then((ok) => {
      if (!ok) fallback(name);
    })
    .catch(() => fallback(name));
}
