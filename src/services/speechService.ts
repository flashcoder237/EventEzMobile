/**
 * speechService — annonce vocale (TTS) du résultat de check-in.
 *
 * Pourquoi : à l'entrée d'un événement, le staff a une main sur le téléphone
 * et l'autre sur le billet, avec une file qui attend. Le son de scan existant
 * (`soundService`) ne dit que « validé / refusé » ; le NOM du participant et
 * son type de billet ne sont lisibles qu'en baissant les yeux sur l'écran.
 * L'annonce vocale porte cette information sans quitter la file du regard.
 *
 * Choix assumés :
 *  - DÉSACTIVÉ par défaut, activable sur l'écran scanner. Un organisateur seul
 *    dans une petite salle n'a pas envie que son téléphone parle, et annoncer
 *    un nom à voix haute expose une donnée personnelle à l'entourage : c'est à
 *    l'utilisateur de le décider, pas à nous.
 *  - 100 % hors ligne (moteur TTS du système) : aucun audio ne sort du
 *    téléphone, donc aucun nouveau sous-traitant de données à déclarer. Le
 *    check-in doit fonctionner sans réseau, une API cloud était exclue.
 *  - Jamais de validation « à l'oreille seule » : l'annonce DOUBLE l'affichage,
 *    elle ne le remplace pas. Un faux positif sur un billet a une conséquence
 *    monétaire.
 *  - L'annonce est coupée avant chaque nouvelle (`stop()`) : dans une file
 *    rapide, entendre la fin du scan précédent sur le scan courant est pire
 *    que pas d'annonce du tout.
 */
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@eventez_checkin_voice_enabled';

/** Langues supportées par l'annonce, alignées sur l'i18n de l'app. */
type SpeechLocale = 'fr' | 'en';

const VOICE_LANGUAGE: Record<SpeechLocale, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

class SpeechService {
  private enabled = false;
  private initialized = false;
  private locale: SpeechLocale = 'fr';

  /** Lit la préférence persistée. Idempotent. */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      // Absence de valeur = désactivé (voir en-tête : opt-in explicite).
      this.enabled = stored === 'true';
    } catch {
      this.enabled = false;
    }
    this.initialized = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async setEnabled(value: boolean): Promise<void> {
    this.enabled = value;
    if (!value) this.stop();
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch {
      /* stockage indisponible : la préférence vaut pour la session en cours */
    }
  }

  /** Langue des annonces. À synchroniser avec la langue de l'interface. */
  setLocale(locale: string | undefined): void {
    this.locale = locale?.startsWith('en') ? 'en' : 'fr';
  }

  /**
   * Annonce un texte. Sans effet si la préférence est désactivée.
   * L'annonce en cours est interrompue : l'information fraîche prime sur
   * l'ancienne dans une file qui avance.
   */
  speak(text: string): void {
    if (!this.enabled) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      Speech.stop();
      Speech.speak(trimmed, {
        language: VOICE_LANGUAGE[this.locale],
        // Légèrement accéléré : en file d'attente, une annonce traînante est
        // contre-productive. Au-delà de ~1.15 l'intelligibilité se dégrade.
        rate: 1.05,
        pitch: 1.0,
      });
    } catch {
      /* moteur TTS absent ou occupé → no-op, l'affichage reste la source */
    }
  }

  stop(): void {
    try {
      Speech.stop();
    } catch {
      /* no-op */
    }
  }

  /** Tests uniquement. */
  __reset(): void {
    this.enabled = false;
    this.initialized = false;
    this.locale = 'fr';
  }
}

export const speechService = new SpeechService();
export default speechService;
