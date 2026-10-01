/**
 * H7 — Sons d'interface (très discrets) et H8 — carillon de marque.
 *
 * Fichiers synthétisés par scripts/generate_ui_sounds.py (aucun asset tiers),
 * normalisés à -12 dBFS, joués à 35 % du volume média.
 *
 * Deux réglages, deux familles :
 *  - `ui` (tap, toggle, success) → réglage « Sons d'interface » (sensoryPrefs
 *    `uiSounds`, COUPÉ par défaut) ;
 *  - `chime` (carillon de marque, vente encaissée) → réglage existant « Sons »
 *    des moments forts (soundService), activé par défaut.
 * Toujours muets en arrière-plan et en mode silencieux iOS (le mode audio est
 * posé par soundService.initialize : playsInSilentMode = false).
 */
import { AppState } from 'react-native';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { getSensoryPref } from '../sensoryPrefs';
import soundService from '../../services/soundService';

export type UiSound = 'tap' | 'toggle' | 'success';
export type ChimeSound = 'brand' | 'sale';

const VOLUME = 0.35;

function load(kind: UiSound | ChimeSound): number | null {
  try {
    switch (kind) {
      case 'tap':
        return require('../../../assets/sounds/ui-tap.wav');
      case 'toggle':
        return require('../../../assets/sounds/ui-toggle.wav');
      case 'success':
        return require('../../../assets/sounds/ui-success.wav');
      case 'brand':
        return require('../../../assets/sounds/brand-chime.wav');
      case 'sale':
        return require('../../../assets/sounds/sale-chime.wav');
    }
  } catch {
    return null;
  }
  return null;
}

const players: Partial<Record<UiSound | ChimeSound, AudioPlayer | null>> = {};

function player(kind: UiSound | ChimeSound): AudioPlayer | null {
  if (players[kind] !== undefined) return players[kind] ?? null;
  const asset = load(kind);
  let p: AudioPlayer | null = null;
  if (asset != null) {
    try {
      p = createAudioPlayer(asset);
      p.volume = VOLUME;
    } catch {
      p = null;
    }
  }
  players[kind] = p;
  return p;
}

async function play(kind: UiSound | ChimeSound): Promise<boolean> {
  if (AppState.currentState !== 'active') return false;
  await soundService.initialize();
  const p = player(kind);
  if (!p) return false;
  try {
    await p.seekTo(0);
    p.play();
    return true;
  } catch {
    return false;
  }
}

export const uiSounds = {
  /** Son d'interface : seulement si l'utilisateur les a activés. */
  ui(kind: UiSound): void {
    if (!getSensoryPref('uiSounds')) return;
    void play(kind);
  },
  /**
   * Carillon d'un moment fort. Renvoie false si rien n'a été joué (réglage
   * coupé, fichier absent) pour laisser l'appelant retomber sur son son.
   */
  async chime(kind: ChimeSound): Promise<boolean> {
    await soundService.initialize();
    if (!soundService.isEnabled()) return true; // coupé volontairement : pas de repli
    return play(kind);
  },
};

export default uiSounds;
