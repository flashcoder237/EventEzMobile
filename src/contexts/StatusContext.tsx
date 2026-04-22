import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { statusAPI } from '../api';
import { eventBus } from '../lib/eventBus';
import type {
  Incident,
  ServiceUnavailablePayload,
  StatusSnapshot,
} from '../types';

interface StatusContextValue {
  snapshot: StatusSnapshot | null;
  isLoading: boolean;
  lastFetchedAt: number | null;
  blockingIncident: ServiceUnavailablePayload | null;
  // dernieres infos issues d'un 503 intercepte
  lastServiceIncident: ServiceUnavailablePayload | null;
  refresh: () => Promise<void>;
  clearServiceIncident: () => void;
}

const StatusContext = createContext<StatusContextValue | undefined>(undefined);

const POLL_INTERVAL_MS = 60_000;

export function StatusProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [lastServiceIncident, setLastServiceIncident] =
    useState<ServiceUnavailablePayload | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await statusAPI.getSnapshot();
      setSnapshot(res.data);
      setLastFetchedAt(Date.now());
    } catch {
      // En 503, l'intercepteur axios emet `service-unavailable` — silencieux
      // Erreurs reseau silencieuses : le status est un nice-to-have, pas bloquant
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mount : fetch + polling
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  // Refresh quand l'app repasse au premier plan
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') refresh();
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [refresh]);

  // Ecoute des 503 emis par l'intercepteur axios via eventBus
  useEffect(() => {
    const unsub = eventBus.on(
      'service-unavailable',
      (payload: { incident: ServiceUnavailablePayload }) => {
        if (!payload?.incident) return;
        setLastServiceIncident(payload.incident);
        refresh();
      },
    );
    return unsub;
  }, [refresh]);

  // Blocage global = incident scope=global + is_blocking
  const blockingIncident = useMemo<ServiceUnavailablePayload | null>(() => {
    if (!snapshot) return null;
    const blocking = snapshot.active_incidents.find(
      (i) => i.is_blocking && i.scope === 'global',
    );
    if (!blocking) return null;
    return {
      id: blocking.id,
      scope: blocking.scope,
      affected_services: blocking.affected_services,
      is_blocking: blocking.is_blocking,
      status: blocking.status,
      severity: blocking.severity,
      impact: blocking.impact,
      title: blocking.title,
      public_message: blocking.public_message,
      started_at: blocking.started_at,
      latest_update: blocking.latest_update
        ? {
            message: blocking.latest_update.message,
            created_at: blocking.latest_update.created_at,
          }
        : null,
    };
  }, [snapshot]);

  const clearServiceIncident = useCallback(() => {
    setLastServiceIncident(null);
  }, []);

  const value = useMemo<StatusContextValue>(
    () => ({
      snapshot,
      isLoading,
      lastFetchedAt,
      blockingIncident,
      lastServiceIncident,
      refresh,
      clearServiceIncident,
    }),
    [
      snapshot,
      isLoading,
      lastFetchedAt,
      blockingIncident,
      lastServiceIncident,
      refresh,
      clearServiceIncident,
    ],
  );

  return (
    <StatusContext.Provider value={value}>{children}</StatusContext.Provider>
  );
}

export function useStatus() {
  const ctx = useContext(StatusContext);
  if (!ctx) throw new Error('useStatus must be used within a StatusProvider');
  return ctx;
}

/** Hook utilitaire pour savoir si un service precis est actuellement KO. */
export function useServiceHealth(serviceKey: string) {
  const { snapshot } = useStatus();
  if (!snapshot) {
    return { status: 'operational' as const, incident: null as Incident | null };
  }
  const svc = snapshot.services.find((s) => s.key === serviceKey);
  const incident = svc?.active_incident_id
    ? snapshot.active_incidents.find((i) => i.id === svc.active_incident_id) || null
    : null;
  return {
    status: svc?.current_status || 'operational',
    incident,
  };
}
