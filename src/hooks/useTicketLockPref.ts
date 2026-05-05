/**
 * useTicketLockPref — préférence opt-in "verrouiller le QR du billet derrière
 * une auth biométrique".
 *
 * Distinct de `useAppLock` (verrouillage global de l'app au cold start) et de
 * `useBiometricConfirm` (prompt à la demande sur action sensible). Ici, c'est
 * un switch simple : si activé, QRCodeScreen demande une auth biométrique
 * avant d'afficher le QR. Utile contre le vol de téléphone à la queue d'entrée
 * d'un événement (l'attaquant ne peut pas scanner le QR à votre place).
 *
 * Storage : SecureStore (pas AsyncStorage) — on traite ça comme une pref de
 * sécurité. La clé est globale, pas par-billet : c'est tout ou rien.
 */

import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const TICKET_LOCK_PREF_KEY = 'eventez_ticket_lock_enabled';

interface UseTicketLockPrefResult {
  /** L'utilisateur a-t-il activé le verrouillage des billets ? */
  isEnabled: boolean;
  /** True tant que la lecture initiale de SecureStore n'est pas terminée. */
  loading: boolean;
  /** Bascule la pref (persiste en SecureStore). */
  setEnabled: (enabled: boolean) => Promise<void>;
}

export function useTicketLockPref(): UseTicketLockPrefResult {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TICKET_LOCK_PREF_KEY);
        if (!cancelled) setIsEnabled(stored === 'true');
      } catch {
        // Lecture impossible (rare) → on reste sur false par défaut.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    await SecureStore.setItemAsync(TICKET_LOCK_PREF_KEY, enabled ? 'true' : 'false');
    setIsEnabled(enabled);
  }, []);

  return { isEnabled, loading, setEnabled };
}
