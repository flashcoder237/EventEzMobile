import { Platform, requireOptionalNativeModule } from 'expo-modules-core';

// Module natif OPTIONNEL : absent sur iOS (platforms=android) et dans Expo Go.
// requireOptionalNativeModule renvoie null au lieu de throw → API sûre partout.
const EventezPip = requireOptionalNativeModule<{
  isSupported(): boolean;
  enter(): boolean;
}>('EventezPip');

/** True si l'appareil supporte le Picture-in-Picture (Android API 26+). */
export function isPipSupported(): boolean {
  if (Platform.OS !== 'android' || !EventezPip) return false;
  try {
    return EventezPip.isSupported();
  } catch {
    return false;
  }
}

/** Fait entrer l'activité courante en Picture-in-Picture. No-op hors Android. */
export function enterPip(): boolean {
  if (Platform.OS !== 'android' || !EventezPip) return false;
  try {
    return EventezPip.enter();
  } catch {
    return false;
  }
}
