/**
 * Tokens motion EventEz — mobile.
 *
 * Source unique partagée avec le web : `EventEz/docs/motion-tokens.json`
 * (hors du projet Metro, d'où la recopie ici). Le test
 * `src/constants/__tests__/motion.parity.test.ts` échoue si les deux divergent.
 *
 * Nommés par INTENTION, pas par valeur :
 *   - press / respond : réponse immédiate à un geste (couleur, opacité, pression)
 *   - move            : un élément se déplace à l'écran (indicateur, chiffre)
 *   - enter / exit    : apparition d'un élément (bulle, toast, feuille)
 *   - inform          : une valeur change (compteur, jauge, anneau)
 *   - glint           : TOUS les reflets (sheen, tampon, tab, GlintSweep)
 *   - celebrate       : budget total d'une célébration (paiement, complet)
 *   - ambient         : boucles autorisées (radar « en direct »)
 *
 * Règles (style guide §6) :
 *   - action fréquente (> 10×/jour) : ≤ 200 ms, aucun reflet ni balayage ;
 *   - ressort sur une propriété de LAYOUT (width/height/flex) : interdit,
 *     sauf `Springs.layout` (overshootClamping) ;
 *   - un seul moment « celebrate » par écran.
 */
import { Easing } from 'react-native-reanimated';

export const Durations = {
  pressIn: 100,
  pressOut: 200,
  respond: 160,
  move: 220,
  enter: 260,
  exit: 180,
  inform: 400,
  glint: 700,
  celebrate: 900,
  ambient: 2400,
  ambientStagger: 1200,
  skeleton: 1600,
  skeletonDelay: 400,
} as const;

/** Points de contrôle cubic-bezier, identiques aux courbes CSS du web. */
export const CurvePoints = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.65, 0, 0.35, 1],
  settle: [0.16, 1, 0.3, 1],
} as const;

// Tolérant aux mocks de test qui ne fournissent pas `Easing` (theme.ts
// importe ce module : il ne doit jamais planter au chargement).
const E = (Easing ?? {}) as Partial<typeof Easing>;
const identity = (t: number) => t;
const bezier = (a: number, b: number, c: number, d: number) =>
  (typeof E.bezier === 'function' ? E.bezier(a, b, c, d) : identity) as ReturnType<typeof Easing.bezier>;

export const Curves = {
  /** Répondre, entrer. */
  out: bezier(0.23, 1, 0.32, 1),
  /** Déplacement à l'écran, tracé, parcours d'un reflet. */
  inOut: bezier(0.65, 0, 0.35, 1),
  /** Compteurs uniquement. */
  settle: bezier(0.16, 1, 0.3, 1),
  /** Boucles et animations liées au scroll ou au geste. */
  linear: (E.linear ?? identity) as typeof Easing.linear,
};

export interface SpringToken {
  /** Durée perçue (ms) — pour référence / Framer côté web. */
  duration?: number;
  /** Rebond 0..1 (dampingRatio = 1 - bounce). */
  bounce?: number;
  stiffness: number;
  damping: number;
  mass: number;
  overshootClamping?: boolean;
}

export const Springs = {
  press: { duration: 150, bounce: 0, stiffness: 700, damping: 53, mass: 1 },
  respond: { duration: 250, bounce: 0.1, stiffness: 500, damping: 40, mass: 1 },
  /** Seul ressort autorisé sur une largeur/hauteur : jamais de dépassement. */
  layout: { duration: 300, bounce: 0, stiffness: 380, damping: 39, mass: 1, overshootClamping: true },
  pop: { duration: 350, bounce: 0.3, stiffness: 420, damping: 29, mass: 1 },
  celebrate: { duration: 500, bounce: 0.4, stiffness: 300, damping: 21, mass: 1 },
  sheet: { stiffness: 300, damping: 30, mass: 0.6 },
  drift: { stiffness: 120, damping: 20, mass: 1 },
} as const satisfies Record<string, SpringToken>;

/** Config Reanimated (withSpring) d'un token : sans les champs informatifs. */
export function springConfig(name: keyof typeof Springs) {
  const s = Springs[name] as SpringToken;
  return {
    stiffness: s.stiffness,
    damping: s.damping,
    mass: s.mass,
    ...(s.overshootClamping ? { overshootClamping: true } : null),
  };
}

export const Amplitudes = {
  pressButton: 0.97,
  pressCard: 0.98,
  pressChip: 0.95,
  /** Pic maximal d'un « pop » (jamais 1,28). */
  popPeak: 1.12,
  /** Échelle de départ d'une entrée (jamais 0,6). */
  enterFrom: 0.96,
  ring: 1.6,
  tiltMaxDeg: 3,
  shakePx: 4,
  shakeCount: 3,
} as const;

export const Frequency = {
  frequentMaxMs: 200,
  rareMaxMs: 1000,
  informHapticThrottleMs: 10000,
} as const;

/** Timing Reanimated prêt à l'emploi par intention. */
export const Timing = {
  respond: { duration: Durations.respond, easing: Curves.out },
  move: { duration: Durations.move, easing: Curves.out },
  enter: { duration: Durations.enter, easing: Curves.out },
  exit: { duration: Durations.exit, easing: Curves.out },
  inform: { duration: Durations.inform, easing: Curves.settle },
  glint: { duration: Durations.glint, easing: Curves.inOut },
};

export const Motion = { Durations, Curves, CurvePoints, Springs, Amplitudes, Frequency, Timing, springConfig };
export default Motion;
