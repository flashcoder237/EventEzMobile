import { Platform, requireOptionalNativeModule } from 'expo-modules-core';

// Module natif OPTIONNEL : absent sur iOS (platforms=android) et dans Expo Go.
// requireOptionalNativeModule renvoie null au lieu de throw → API sûre partout.
const EventezPip = requireOptionalNativeModule<{
  isSupported(): boolean;
  enter(): boolean;
  isInPipMode(): boolean;
  setAutoEnter(enabled: boolean): boolean;
  addListener(event: string, listener: (payload: any) => void): { remove(): void };
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

/**
 * Arme (ou désarme) l'entrée AUTOMATIQUE en Picture-in-Picture.
 *
 * À appeler au DÉBUT de l'appel, pas au moment de quitter l'app.
 *
 * POURQUOI : Android n'accepte la demande que tant que l'activité est encore
 * VISIBLE — la documentation est explicite : « The system may disallow
 * entering picture-in-picture in various cases, including when the activity is
 * not visible ». Or l'événement JS `AppState === 'background'` n'arrive
 * qu'APRÈS que l'activité a cessé d'être visible : trop tard, la demande est
 * refusée.
 *
 * Le module natif déclenche donc le PiP depuis `onUserLeaveHint`, qui est
 * appelé juste AVANT la mise en pause, pendant que l'activité est visible.
 *
 * Réf. https://developer.android.com/develop/ui/views/picture-in-picture
 */
export function setPipAutoEnter(enabled: boolean): boolean {
  if (Platform.OS !== 'android' || !EventezPip) return false;
  try {
    return EventezPip.setAutoEnter(enabled);
  } catch {
    return false;
  }
}

/** True si l'activité est ACTUELLEMENT en fenêtre Picture-in-Picture. */
export function isInPipMode(): boolean {
  if (Platform.OS !== 'android' || !EventezPip) return false;
  try {
    return EventezPip.isInPipMode();
  } catch {
    return false;
  }
}

/**
 * S'abonne aux changements de mode Picture-in-Picture.
 *
 * Indispensable pour MASQUER l'interface de l'app pendant le PiP : Android
 * réduit TOUTE la fenêtre de l'activité, il n'extrait pas la vidéo. L'en-tête
 * et les boutons se retrouvent donc dans une vignette d'environ 200 dp, où ils
 * couvrent la vidéo et sont intouchables.
 *
 * La documentation l'impose : « Remove other UI elements before your activity
 * enters PiP and restore them when your activity becomes full screen again. »
 */
export function addPipModeListener(
  listener: (isInPipMode: boolean) => void,
): { remove(): void } {
  if (Platform.OS !== 'android' || !EventezPip) {
    return { remove() {} };
  }
  try {
    return EventezPip.addListener(
      'onPipModeChanged',
      (payload: { isInPipMode?: boolean }) => listener(!!payload?.isInPipMode),
    );
  } catch {
    return { remove() {} };
  }
}
