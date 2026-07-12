import * as Haptics from 'expo-haptics';

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
 */
function safe(run: () => Promise<unknown>): void {
  try {
    const p = run();
    if (p && typeof (p as Promise<unknown>).catch === 'function') {
      (p as Promise<unknown>).catch(() => {});
    }
  } catch {
    /* moteur haptique indisponible → no-op */
  }
}

export const haptics = {
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  selection: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export default haptics;
