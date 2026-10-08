/**
 * feedback — l'orchestrateur image + vibration + son (round 2, M7).
 *
 * Règle : un moment se ressent en UNE frame. L'appelant déclenche `feedback.*`
 * au pic visuel (fin du trait d'une coche, contact d'un tampon) — le son et la
 * vibration partent ensemble, jamais l'un au montage et l'autre 700 ms plus
 * tard.
 *
 * Sens des vibrations (tokens motion, style guide §6) :
 *   - `celebrate` : succès + écho — RÉSERVÉ au paiement et au scan validé ;
 *   - `confirm`   : sélection — révélation, validation d'un choix ;
 *   - `warn`      : avertissement (déjà scanné, autre événement) ;
 *   - `reject`    : erreur (refusé).
 * Le son respecte le réglage de l'utilisateur (géré par soundService).
 */
import { haptics } from './haptics';
import type { SoundKey } from '../services/soundService';
import type { ChimeSound } from '../lib/native/uiSounds';

/**
 * H8 — moments qui ont leur propre signature sonore (carillon synthétisé,
 * cf. lib/native/uiSounds). Repli sur l'alias soundService si le carillon
 * n'a pas pu être joué.
 */
const CHIMES: Partial<Record<SoundKey, ChimeSound>> = {
  'ticket-received': 'brand',
  sale: 'sale',
};

function chimeOrPlay(sound: SoundKey) {
  const chime = CHIMES[sound];
  if (!chime) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { uiSounds } = require('../lib/native/uiSounds');
    uiSounds
      .chime(chime)
      .then((played: boolean) => {
        if (!played) playBase(sound);
      })
      .catch(() => playBase(sound));
    return true;
  } catch {
    return false;
  }
}

/** Dernier déclenchement par moment, pour le plafonnement. */
const lastMoment: Partial<Record<LiveMoment, number>> = {};
const MOMENT_MIN_INTERVAL_MS = 4000;

/** H7 — son d'interface discret (coupé par défaut, cf. sensoryPrefs `uiSounds`). */
function uiTick() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../lib/native/uiSounds').uiSounds.ui('tap');
  } catch {
    /* silence */
  }
}

function play(sound?: SoundKey) {
  if (!sound) return;
  if (chimeOrPlay(sound)) return;
  playBase(sound);
}

function playBase(sound: SoundKey) {
  try {
    // Chargé à la demande : le module audio natif n'est tiré qu'au premier son
    // (et jamais dans les écrans/tests qui ne vibrent que).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const soundService = require('../services/soundService').default;
    soundService?.play?.(sound)?.catch?.(() => {});
  } catch {
    /* son indisponible → silence */
  }
}

/**
 * R2 V12 — tableau UNIQUE « moment → son → haptique » de la plateforme vivante.
 * Le son respecte le réglage existant (soundService) et le mode silencieux iOS.
 */
export type LiveMoment = 'ticketReceived' | 'arrival' | 'connectionArrived' | 'sale';

export const LIVE_MOMENTS: Record<LiveMoment, { sound: SoundKey; haptic: 'success' | 'light' | 'selection' }> = {
  ticketReceived: { sound: 'ticket-received', haptic: 'success' },
  arrival: { sound: 'arrival', haptic: 'success' },
  connectionArrived: { sound: 'arrival', haptic: 'light' },
  sale: { sound: 'sale', haptic: 'light' },
};

export const feedback = {
  /** Moment de la plateforme vivante (voir LIVE_MOMENTS). */
  moment(name: LiveMoment) {
    const spec = LIVE_MOMENTS[name];
    if (!spec) return;

    // PLAFOND par moment.
    //
    // CARTOGRAPHIE (2026-10-08) : `sale` se déclenche à CHAQUE vente de
    // l'événement entier, chez l'organisateur qui le suit depuis son
    // téléphone. À l'ouverture de la billetterie d'un concert, c'est
    // plusieurs ventes par seconde — le carillon devenait une sirène, et
    // l'organisateur coupait le son au moment précis où il voulait le suivre.
    //
    // 4 s : on entend que « ça vend », sans compter chaque billet. Même
    // logique que le plafond haptique des toasts, pour la même raison.
    const now = Date.now();
    if (now - (lastMoment[name] ?? 0) < MOMENT_MIN_INTERVAL_MS) return;
    lastMoment[name] = now;

    haptics[spec.haptic]();
    play(spec.sound);
  },
  /** Paiement réussi, scan validé. */
  celebrate(sound?: SoundKey) {
    // H6 — sur iPhone, motif Core Haptics (houle + étincelles) ; ailleurs,
    // repli automatique sur haptics.celebrate.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../lib/native/richHaptics').richHaptic('celebrate');
    } catch {
      haptics.celebrate();
    }
    play(sound);
  },
  /** Révélation, choix confirmé : discret. */
  confirm(sound?: SoundKey) {
    haptics.selection();
    if (sound) play(sound);
    else uiTick();
  },
  warn(sound?: SoundKey) {
    haptics.warning();
    play(sound);
  },
  reject(sound?: SoundKey) {
    haptics.error();
    play(sound);
  },
};

export default feedback;
