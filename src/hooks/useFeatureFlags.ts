import { useEffect, useState, useRef } from 'react';
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
      try {
        const res = await publicSettingsAPI.get();
        const next: FeatureFlags = {
          phone_otp_enabled: res.data?.phone_otp_enabled ?? true,
          sms_notifications_enabled: res.data?.sms_notifications_enabled ?? true,
        };
        cached = { value: next, ts: Date.now() };
        if (!cancelled && mountedRef.current) {
          setFlags(next);
        }
      } catch (err) {
        // En cas d'echec : on reste sur les defaults (tout active).
        // Le backend rejettera de toute facon avec un message clair si besoin.
        if (__DEV__) console.warn('useFeatureFlags: fallback on defaults', err);
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { flags, loading };
}

/** Force le refresh du cache (a appeler depuis un admin qui vient de toggle). */
export function invalidateFeatureFlagsCache() {
  cached = null;
}
