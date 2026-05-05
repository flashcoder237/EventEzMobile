/**
 * useBiometricPrefs — préférences par catégorie pour les confirmations
 * biométriques (FaceID / empreinte) sur actions sensibles.
 *
 * Pourquoi des catégories et pas un toggle unique ? Les usagers ont des seuils
 * de tolérance différents selon le type d'action :
 *   - Un retrait de 50000 FCFA → presque tout le monde veut une confirmation.
 *   - Modifier son email → certains préfèrent zéro friction (ils ont déjà un
 *     mot de passe à taper), d'autres veulent la double couche.
 *   - Actions admin → l'organisation peut imposer une politique stricte.
 *
 * Quatre catégories couvrent l'essentiel sans sur-fragmenter :
 *   - payments : retrait wallet, modif IBAN, paiement carte, remboursement
 *   - account  : suppression compte, modif email, changement password
 *   - tickets  : reveal QR à l'entrée (anti-vol queue)
 *   - admin    : bulk verify/désactiver users, validation event, etc.
 *
 * Chaque catégorie a un défaut : ON pour payments/account/admin, OFF pour
 * tickets (cas d'usage de niche). Les toggles sont en SecureStore.
 *
 * Le hook expose `enabled[cat]` et `setEnabled(cat, v)`. Pour la lecture
 * inline (sans React), utiliser `getPrefSync()` (cf. notes en bas).
 */

import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type BiometricCategory = 'payments' | 'account' | 'tickets' | 'admin';

const PREF_KEY: Record<BiometricCategory, string> = {
  payments: 'eventez_biometric_payments',
  account: 'eventez_biometric_account',
  tickets: 'eventez_biometric_tickets',
  admin: 'eventez_biometric_admin',
};

// Défaut quand l'utilisateur n'a jamais touché au toggle. ON pour les
// catégories à fort enjeu, OFF pour tickets (cas d'usage facultatif).
const DEFAULT_ENABLED: Record<BiometricCategory, boolean> = {
  payments: true,
  account: true,
  tickets: false,
  admin: true,
};

export type BiometricPrefsMap = Record<BiometricCategory, boolean>;

interface UseBiometricPrefsResult {
  /** Map cat → enabled. */
  enabled: BiometricPrefsMap;
  /** True tant que la lecture initiale de SecureStore n'est pas terminée. */
  loading: boolean;
  /** Bascule une catégorie. */
  setEnabled: (category: BiometricCategory, enabled: boolean) => Promise<void>;
}

const ALL_CATEGORIES: BiometricCategory[] = ['payments', 'account', 'tickets', 'admin'];

/**
 * Lit la pref depuis SecureStore en gardant les défauts si la clé n'existe pas.
 * Stockage : "true" / "false" en string (SecureStore ne stocke que des strings).
 */
async function readPref(category: BiometricCategory): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(PREF_KEY[category]);
    if (stored === null) return DEFAULT_ENABLED[category];
    return stored === 'true';
  } catch {
    return DEFAULT_ENABLED[category];
  }
}

export function useBiometricPrefs(): UseBiometricPrefsResult {
  const [enabled, setEnabledState] = useState<BiometricPrefsMap>({ ...DEFAULT_ENABLED });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          ALL_CATEGORIES.map(async (cat) => [cat, await readPref(cat)] as const),
        );
        if (cancelled) return;
        const map: BiometricPrefsMap = { ...DEFAULT_ENABLED };
        for (const [cat, val] of entries) {
          map[cat] = val;
        }
        setEnabledState(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setEnabled = useCallback(async (category: BiometricCategory, value: boolean) => {
    await SecureStore.setItemAsync(PREF_KEY[category], value ? 'true' : 'false');
    setEnabledState((prev) => ({ ...prev, [category]: value }));
  }, []);

  return { enabled, loading, setEnabled };
}

/**
 * Lecture asynchrone hors-React de la pref d'une catégorie. Utile dans des
 * helpers ou services qui n'ont pas accès aux hooks.
 */
export async function getBiometricPref(category: BiometricCategory): Promise<boolean> {
  return readPref(category);
}
