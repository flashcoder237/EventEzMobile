/**
 * useBiometricConfirm — prompt biométrique à la demande pour confirmer une
 * action sensible (paiement, suppression compte, modification IBAN, etc.).
 *
 * Distinct de `useAppLock` :
 *  - `useAppLock` verrouille l'app entière au cold start / foreground.
 *  - `useBiometricConfirm` est appelé ponctuellement pour valider UNE action.
 *
 * Politique par défaut :
 *  - Si le device a un facteur biométrique enrôlé → on prompt et on renvoie
 *    `true`/`false` selon la réponse de l'OS.
 *  - Si le device n'a PAS de biométrique enrôlée → on renvoie `true`
 *    silencieusement (action autorisée, pas de friction inutile).
 *  - Pour bloquer l'action si pas de biométrique disponible, passer
 *    `requireBiometric: true` dans les opts → renvoie `false`.
 *
 * Le caller décide ensuite quoi faire avec le bool. Pas de side-effect
 * implicite (à la différence de `useAppLock.authenticate` qui modifie le
 * status global).
 */

import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { BiometricCategory, getBiometricPref } from './useBiometricPrefs';

export interface BiometricConfirmOptions {
  /** Texte affiché dans le prompt OS. Court et explicite. */
  promptMessage: string;
  /** Label du bouton "Annuler". Défaut : "Annuler". */
  cancelLabel?: string;
  /** Label du fallback (code device). Défaut : "Utiliser le code". */
  fallbackLabel?: string;
  /**
   * Si true et qu'aucun biométrique n'est enrôlé sur le device, renvoie `false`
   * au lieu de `true` (bloque l'action). À utiliser pour les actions VRAIMENT
   * sensibles où on veut forcer l'utilisateur à activer FaceID/empreinte.
   * Défaut : false (passe-droit silencieux).
   */
  requireBiometric?: boolean;
  /** Permet le fallback PIN/passcode device. Défaut : true. */
  allowDeviceFallback?: boolean;
  /**
   * Catégorie de l'action (payments / account / tickets / admin). Si fournie,
   * le hook lit la pref utilisateur correspondante via `getBiometricPref` :
   *   - pref OFF → renvoie true sans prompter (l'utilisateur a explicitement
   *     désactivé la confirmation pour ce type d'action).
   *   - pref ON  → comportement standard (prompt si biométrique disponible).
   * Si la catégorie n'est pas fournie, on prompt toujours (legacy behavior).
   */
  category?: BiometricCategory;
}

interface UseBiometricConfirmResult {
  /**
   * Lance le prompt biométrique. Renvoie `true` si l'utilisateur a confirmé,
   * `false` s'il a annulé / échoué / pas de biométrique (selon options).
   */
  confirm: (opts: BiometricConfirmOptions) => Promise<boolean>;
  /** Le device a-t-il un facteur biométrique enrôlé ? */
  isSupported: boolean;
  /**
   * Type biométrique disponible : 'face' (FaceID/face unlock), 'fingerprint'
   * (TouchID/empreinte), 'iris', ou null si rien. Permet d'adapter le copy
   * dans l'UI ("Touch ID requis" vs "Face ID requis").
   */
  type: 'face' | 'fingerprint' | 'iris' | null;
}

export function useBiometricConfirm(): UseBiometricConfirmResult {
  const [isSupported, setIsSupported] = useState(false);
  const [type, setType] = useState<'face' | 'fingerprint' | 'iris' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (cancelled) return;
        setIsSupported(hasHardware && enrolled);

        if (hasHardware && enrolled) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (cancelled) return;
          // Priorité face > fingerprint > iris (cohérent avec l'UX moderne).
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setType('face');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setType('fingerprint');
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setType('iris');
          } else {
            setType(null);
          }
        }
      } catch {
        if (!cancelled) {
          setIsSupported(false);
          setType(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const confirm = useCallback(async (opts: BiometricConfirmOptions): Promise<boolean> => {
    // Si une catégorie est fournie, vérifier d'abord la pref utilisateur.
    // L'user qui a désactivé la confirmation pour cette catégorie passe sans
    // prompt (politique opt-in/opt-out par bucket).
    if (opts.category) {
      const prefEnabled = await getBiometricPref(opts.category);
      if (!prefEnabled) return true;
    }

    // Pas de biométrique enrôlée → comportement selon `requireBiometric`.
    if (!isSupported) {
      return !opts.requireBiometric;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: opts.promptMessage,
        cancelLabel: opts.cancelLabel || 'Annuler',
        fallbackLabel: opts.fallbackLabel || 'Utiliser le code',
        disableDeviceFallback: opts.allowDeviceFallback === false,
      });
      return result.success === true;
    } catch {
      // Erreur native (rare, ex: prompt déjà actif sur autre flow) → on
      // refuse plutôt que d'accepter aveuglément.
      return false;
    }
  }, [isSupported]);

  return { confirm, isSupported, type };
}
