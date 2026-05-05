// ============================================
// useAppLock — verrou biométrique au cold start / app foreground
// ============================================
//
// Si l'utilisateur a activé "Verrouiller l'app" dans Paramètres, on demande
// une authentification biométrique :
//   - au cold start, AVANT d'afficher quoi que ce soit (l'écran <LockGate>
//     s'affiche par-dessus le splash et reste tant que l'auth n'a pas réussi)
//   - au retour foreground après plus de LOCK_GRACE_MS d'inactivité (par
//     défaut 60 s) — évite de reverrouiller à chaque switch d'app rapide
//
// La préférence est stockée en SecureStore ('eventez_app_lock_enabled').
// L'écran de paramètres bascule cette valeur via toggleAppLock(). On laisse
// l'utilisateur enregistrer son choix UNIQUEMENT s'il a au moins un facteur
// biométrique enrôlé (sinon le toggle serait un piège — couper la session
// sans pouvoir la rouvrir).

import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const LOCK_PREF_KEY = 'eventez_app_lock_enabled';
const LOCK_GRACE_MS = 60_000;

export type LockStatus = 'idle' | 'locked' | 'unlocked' | 'unsupported';

interface UseAppLockResult {
  /** Statut courant — l'app est verrouillée si 'locked'. */
  status: LockStatus;
  /** Le device a-t-il un facteur biométrique enrôlé ? */
  isSupported: boolean;
  /** L'utilisateur a-t-il activé l'option ? */
  isEnabled: boolean;
  /** Lance manuellement l'auth (typique : bouton "Réessayer" sur l'écran lock). */
  authenticate: () => Promise<boolean>;
  /** Active/désactive l'option (persiste en SecureStore). */
  setEnabled: (enabled: boolean) => Promise<void>;
}

export function useAppLock(): UseAppLockResult {
  const [status, setStatus] = useState<LockStatus>('idle');
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  // Vérifie hardware + enrôlement + lit la préférence persistée
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const supported = hasHardware && enrolled;
        if (cancelled) return;
        setIsSupported(supported);

        if (!supported) {
          setStatus('unsupported');
          return;
        }

        const stored = await SecureStore.getItemAsync(LOCK_PREF_KEY);
        const enabled = stored === 'true';
        if (cancelled) return;
        setIsEnabled(enabled);
        setStatus(enabled ? 'locked' : 'unlocked');
      } catch {
        if (!cancelled) {
          setIsSupported(false);
          setStatus('unsupported');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Déverrouille EventEz',
        // FaceID nécessite NSFaceIDUsageDescription dans Info.plist (déjà
        // gérée par expo-local-authentication via le plugin).
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
        fallbackLabel: 'Utiliser le code',
      });
      if (result.success) {
        setStatus('unlocked');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (enabled && !isSupported) return; // garde-fou
    await SecureStore.setItemAsync(LOCK_PREF_KEY, enabled ? 'true' : 'false');
    setIsEnabled(enabled);
    if (!enabled) setStatus('unlocked');
  }, [isSupported]);

  // Re-verrouille au retour foreground après inactivité prolongée
  useEffect(() => {
    if (!isEnabled) return;
    let lastActiveAt = Date.now();
    let lastState: AppStateStatus = AppState.currentState;

    const onChange = (next: AppStateStatus) => {
      if (lastState === 'active' && next !== 'active') {
        lastActiveAt = Date.now();
      }
      if (lastState !== 'active' && next === 'active') {
        if (Date.now() - lastActiveAt > LOCK_GRACE_MS) {
          setStatus('locked');
        }
      }
      lastState = next;
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [isEnabled]);

  return { status, isSupported, isEnabled, authenticate, setEnabled };
}
