import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { publicSettingsAPI } from '../api';

interface FeatureFlags {
  phone_otp_enabled: boolean;
  sms_notifications_enabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  phone_otp_enabled: true,
  sms_notifications_enabled: true,
};

// Cache process-wide pour eviter de refetch les flags sur chaque mount.
// Les toggles admin changent rarement, on garde 60s en memoire.
let cached: { value: FeatureFlags; ts: number } | null = null;
const TTL_MS = 60_000;
// Si l'app a été backgroundée plus longtemps que cette durée, on force un
// refresh au retour au premier plan — utile quand un admin vient de toggle un
// flag pendant que l'utilisateur avait l'app en arrière-plan. Plus généreux
// que TTL_MS (15min) pour ne pas hammer l'API à chaque switch d'app.
const STALE_AFTER_BACKGROUND_MS = 15 * 60_000;

async function fetchAndCache(): Promise<FeatureFlags | null> {
  try {
    const res = await publicSettingsAPI.get();
    const next: FeatureFlags = {
      phone_otp_enabled: res.data?.phone_otp_enabled ?? true,
      sms_notifications_enabled: res.data?.sms_notifications_enabled ?? true,
    };
    cached = { value: next, ts: Date.now() };
    return next;
  } catch (err) {
    if (__DEV__) console.warn('useFeatureFlags: fallback on defaults', err);
    return null;
  }
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(() => cached?.value ?? DEFAULT_FLAGS);
  const [loading, setLoading] = useState(!cached);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Cache hit frais
    if (cached && Date.now() - cached.ts < TTL_MS) {
      setFlags(cached.value);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const next = await fetchAndCache();
      if (!cancelled && mountedRef.current) {
        if (next) setFlags(next);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh au retour au premier plan si l'app a été backgroundée longtemps.
  // Couvre le cas "admin toggle pendant que l'utilisateur a l'app en background"
  // sans rafraîchir bêtement à chaque foreground/background.
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status !== 'active') return;
      if (!cached) return;
      if (Date.now() - cached.ts < STALE_AFTER_BACKGROUND_MS) return;
      fetchAndCache().then((next) => {
        if (next && mountedRef.current) setFlags(next);
      });
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return { flags, loading };
}

/** Force le refresh du cache (a appeler depuis un admin qui vient de toggle). */
export function invalidateFeatureFlagsCache() {
  cached = null;
}
