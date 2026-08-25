import { useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { virtualRoomsAPI } from '../api';

export interface LiveStatus {
  event_id: string;
  is_online: boolean;
  is_live: boolean;
  has_started: boolean;
  has_ended: boolean;
  starts_in_minutes: number | null;
  participants: number;
  start_date: string | null;
  end_date: string | null;
}

interface Options {
  /** Ne poller que si l'event est en ligne/hybride. */
  enabled?: boolean;
  /** Intervalle de polling en ms (défaut 30s). */
  intervalMs?: number;
}

/**
 * Poll léger du statut « en direct » d'un événement en ligne/hybride (mobile).
 *
 * - S'arrête tout seul une fois l'event terminé (has_ended).
 * - Se met en pause quand l'app passe en arrière-plan (AppState) pour économiser
 *   batterie/réseau, et reprend au retour au premier plan.
 * - Accepte un id OU un slug (l'endpoint backend résout les deux).
 */
export function useLiveStatus(eventIdOrSlug: string | undefined, opts: Options = {}) {
  const { enabled = true, intervalMs = 30_000 } = opts;
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const endedRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    if (!eventIdOrSlug) return null;
    try {
      setLoading(true);
      const res = await virtualRoomsAPI.liveStatus(eventIdOrSlug);
      if (mountedRef.current) setStatus(res.data);
      return res.data as LiveStatus;
    } catch {
      // Silencieux : un statut live indisponible ne casse pas l'écran.
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [eventIdOrSlug]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !eventIdOrSlug) return;
    endedRef.current = false;

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    const tick = async () => {
      const data = await fetchStatus();
      if (data?.has_ended) {
        endedRef.current = true;
        stop(); // plus rien à suivre
      }
    };
    const start = () => {
      stop();
      timerRef.current = setInterval(tick, intervalMs);
    };

    tick();
    start();

    // Pause en arrière-plan, reprise au premier plan (sauf si déjà terminé).
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        if (!endedRef.current) {
          tick();
          start();
        }
      } else {
        stop();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      stop();
      sub.remove();
    };
  }, [enabled, eventIdOrSlug, intervalMs, fetchStatus]);

  return { status, loading, refresh: fetchStatus };
}
