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
 *
 * Règles micro-delight (style guide §6) : l'haptique tombe au PIC VISUEL
 * (fin d'une coche, contact d'un tampon), une seule par geste, rien au
 * retrait d'un état (dé-favori, désabonnement).
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
  /** Tests uniquement. */
  __resetThrottle: () => lastByKey.clear(),
};

export default haptics;
