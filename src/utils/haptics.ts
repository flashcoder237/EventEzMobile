import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';
import { getSensoryPref } from '../lib/sensoryPrefs';
import { isReducedMotionCached } from '../hooks/useReducedMotion';

/**
 * Retour haptique centralisé — donne à l'app un feel « premium ».
 *
 * Toutes les fonctions sont TOLÉRANTES : sur un appareil/OS sans moteur
 * haptique, sur web, ou en cas d'erreur, elles échouent silencieusement
 * (jamais de crash, jamais de promesse rejetée non gérée).
 *
 * Convention d'usage :
 *   - `light`      : petits boutons, actions mineures
 *   - `medium`     : CTA principal
 *   - `selection`  : toggles, pickers, changement d'onglet
 *   - `success`    : scan validé, paiement réussi, check-in
 *   - `warning`    : déjà fait / attention
 *   - `error`      : scan invalide, échec d'action
 *
 * Règles micro-delight (style guide §6) : l'haptique tombe au PIC VISUEL
 * (fin d'une coche, contact d'un tampon), une seule par geste, rien au
 * retrait d'un état (dé-favori, désabonnement).
 */
function safe(run: () => Promise<unknown>): void {
  // Réglage « Vibrations » (round 3, P1) : lu en cache mémoire, synchrone.
  if (!getSensoryPref('vibrations')) return;
  try {
    const p = run();
    if (p && typeof (p as Promise<unknown>).catch === 'function') {
      (p as Promise<unknown>).catch(() => {});
    }
  } catch {
    /* moteur haptique indisponible → no-op */
  }
}

const base = {
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  selection: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticKind = keyof typeof base;

// ---------------------------------------------------------------------------
// Motifs composés (round 3, H1)
// ---------------------------------------------------------------------------
/**
 * Un motif = une suite de « pas » horodatés. Sur Android, quand le système
 * expose les retours haptiques natifs (`performAndroidHapticsAsync`, sans
 * permission VIBRATE et calibrés par le constructeur), on les préfère au
 * vibreur simulé de `impactAsync`.
 */
type IosStep = 'soft' | 'light' | 'rigid' | 'medium' | 'heavy' | 'selection';
interface PatternStep {
  at: number;
  ios: IosStep;
  android: string; // valeur de Haptics.AndroidHaptics
}

export type HapticPattern = 'heartbeat' | 'tick' | 'notch' | 'wall' | 'rise';

const PATTERNS: Record<HapticPattern, PatternStep[]> = {
  /** « Lub-dub » : les portes sont ouvertes (H2). */
  heartbeat: [
    { at: 0, ios: 'medium', android: 'long-press' },
    { at: 140, ios: 'soft', android: 'clock-tick' },
  ],
  /** Cran fin : sélecteur de quantité, secondes qui s'égrènent. */
  tick: [{ at: 0, ios: 'selection', android: 'clock-tick' }],
  /** Palier franchi (jauge 50/75/90/100 %, T-5 min). */
  notch: [{ at: 0, ios: 'rigid', android: 'segment-tick' }],
  /** Butée : on ne peut pas aller plus loin. */
  wall: [
    { at: 0, ios: 'rigid', android: 'reject' },
    { at: 70, ios: 'soft', android: 'no-haptics' },
  ],
  /** Montée : trois crans croissants. */
  rise: [
    { at: 0, ios: 'soft', android: 'segment-frequent-tick' },
    { at: 90, ios: 'light', android: 'segment-tick' },
    { at: 180, ios: 'medium', android: 'confirm' },
  ],
};

function playStep(step: PatternStep): void {
  if (Platform.OS === 'android' && typeof Haptics.performAndroidHapticsAsync === 'function') {
    if (step.android === 'no-haptics') return;
    safe(() => Haptics.performAndroidHapticsAsync(step.android as Haptics.AndroidHaptics));
    return;
  }
  const S = Haptics.ImpactFeedbackStyle as unknown as Record<string, Haptics.ImpactFeedbackStyle | undefined>;
  switch (step.ios) {
    case 'selection':
      safe(() => Haptics.selectionAsync());
      return;
    case 'soft':
      safe(() => Haptics.impactAsync(S.Soft ?? S.Light));
      return;
    case 'rigid':
      safe(() => Haptics.impactAsync(S.Rigid ?? S.Medium));
      return;
    case 'light':
      safe(() => Haptics.impactAsync(S.Light));
      return;
    case 'medium':
      safe(() => Haptics.impactAsync(S.Medium));
      return;
    case 'heavy':
      safe(() => Haptics.impactAsync(S.Heavy));
  }
}

/** Verrou global : une seule séquence composée à la fois. */
let sequenceTimers: ReturnType<typeof setTimeout>[] = [];
let sequenceUntil = 0;
let appStateHooked = false;

function cancelSequence(): void {
  sequenceTimers.forEach(clearTimeout);
  sequenceTimers = [];
  sequenceUntil = 0;
}

function hookAppState(): void {
  if (appStateHooked) return;
  appStateHooked = true;
  try {
    // Passage en arrière-plan → la séquence en cours s'arrête net.
    AppState.addEventListener?.('change', (s) => {
      if (s !== 'active') cancelSequence();
    });
  } catch {
    /* environnement sans AppState */
  }
}

/**
 * Joue un motif nommé. Respecte « Vibrations » ; « Réduire les animations »
 * ramène un motif composé à son seul premier pas ; refusé (false) si une
 * autre séquence composée joue encore ou si l'app n'est pas au premier plan.
 */
function pattern(name: HapticPattern): boolean {
  const steps = PATTERNS[name];
  if (!steps || !getSensoryPref('vibrations')) return false;
  if (AppState.currentState && AppState.currentState !== 'active') return false;
  const now = Date.now();
  if (now < sequenceUntil) return false;
  const run = steps.length > 1 && isReducedMotionCached() ? [steps[0]] : steps;
  if (run.length > 1) {
    hookAppState();
    sequenceUntil = now + run[run.length - 1].at + 40;
    sequenceTimers = run.slice(1).map((st) => setTimeout(() => playStep(st), st.at));
  }
  playStep(run[0]);
  return true;
}

const lastByKey = new Map<string, number>();

export const haptics = {
  ...base,
  /**
   * Joue `kind` au plus une fois toutes les `ms` (par clé, défaut = kind).
   * Ex. : toasts de messages en rafale → une seule vibration toutes les 3 s.
   */
  throttled: (kind: HapticKind, ms = 3000, key: string = kind) => {
    const now = Date.now();
    if (now - (lastByKey.get(key) ?? 0) < ms) return;
    lastByKey.set(key, now);
    base[kind]();
  },
  /** Moment de fête (paiement réussi, billet validé) : succès puis un écho léger. */
  celebrate: () => {
    base.success();
    setTimeout(base.light, 120);
  },
  pattern,
  /** Tests uniquement. */
  __resetThrottle: () => {
    lastByKey.clear();
    cancelSequence();
  },
};

export default haptics;
