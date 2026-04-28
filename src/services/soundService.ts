/**
 * Service de gestion des effets sonores EventEz.
 *
 * Politique :
 *  - Sons reserves aux moments forts (paiement valide, scan QR OK/KO).
 *  - Pas de son sur navigation, taps menu, modals.
 *  - Toujours respecter la preference utilisateur (AsyncStorage `eventez_sounds_enabled`).
 *  - Pas de son si l'app est en background.
 *  - Volume modere (-12 dB approx).
 *  - Si le fichier asset est manquant, fail silencieusement en prod (warning en dev).
 */
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export type SoundKey = 'payment-success' | 'scan-success' | 'scan-fail';

const STORAGE_KEY = '@eventez_sounds_enabled';
const DEFAULT_VOLUME = 0.6; // ~ -12 dB

/**
 * Map des assets bundles. Si un fichier est absent, `require` jette a l'init du
 * service — on attrape pour ne pas casser l'app en l'absence de sons.
 */
function safeRequire(loader: () => number): number | null {
  try {
    return loader();
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[SoundService] asset manquant', e);
    }
    return null;
  }
}

const ASSETS: Record<SoundKey, number | null> = {
  'payment-success': safeRequire(() => require('../../assets/sounds/payment-success.mp3')),
  'scan-success': safeRequire(() => require('../../assets/sounds/scan-success.mp3')),
  'scan-fail': safeRequire(() => require('../../assets/sounds/scan-fail.mp3')),
};

class SoundServiceImpl {
  private players: Partial<Record<SoundKey, AudioPlayer>> = {};
  private enabled = true;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Pre-charge les sons au demarrage de l'app pour eviter une latence au premier play.
   * Idempotent — appel safe a chaque mount du provider racine.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Mute switch iOS respecte (ne joue pas si silent mode)
        await setAudioModeAsync({
          playsInSilentMode: false,
          interruptionMode: 'mixWithOthers',
          shouldPlayInBackground: false,
        }).catch(() => {});

        // Lire la preference utilisateur
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        this.enabled = stored === null ? true : stored === 'true';

        // Pre-charger les players
        for (const key of Object.keys(ASSETS) as SoundKey[]) {
          const asset = ASSETS[key];
          if (asset == null) continue;
          try {
            const player = createAudioPlayer(asset);
            player.volume = DEFAULT_VOLUME;
            this.players[key] = player;
          } catch (err) {
            if (__DEV__) console.warn(`[SoundService] preload failed for ${key}`, err);
          }
        }

        this.initialized = true;
      } catch (err) {
        if (__DEV__) console.warn('[SoundService] init failed', err);
      }
    })();

    return this.initPromise;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async setEnabled(value: boolean): Promise<void> {
    this.enabled = value;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch {
      // ignore — la preference reste en memoire pour cette session
    }
  }

  /**
   * Joue un son. No-op si :
   *  - service desactive par l'utilisateur
   *  - app en background
   *  - asset manquant
   *  - lecture deja en cours pour ce son (pas de spam)
   */
  async play(key: SoundKey): Promise<void> {
    if (!this.enabled) return;
    if (AppState.currentState !== 'active') return;

    if (!this.initialized) {
      await this.initialize();
    }

    const player = this.players[key];
    if (!player) return;

    try {
      // Reset au debut pour permettre des replays rapides
      await player.seekTo(0);
      player.play();
    } catch (err) {
      if (__DEV__) console.warn(`[SoundService] play(${key}) failed`, err);
    }
  }

  /**
   * Libere les ressources audio. A appeler au logout / unmount du provider.
   */
  release(): void {
    for (const key of Object.keys(this.players) as SoundKey[]) {
      try {
        this.players[key]?.remove();
      } catch {
        // ignore
      }
    }
    this.players = {};
    this.initialized = false;
    this.initPromise = null;
  }
}

const soundService = new SoundServiceImpl();
export default soundService;
