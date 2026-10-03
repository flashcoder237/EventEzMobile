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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  /**
   * Incidents ACTIFS non fermés par l'utilisateur, à annoncer PROACTIVEMENT
   * (sans attendre qu'une requête tombe en 503). Avant, un incident non
   * bloquant (« paiements dégradés ») n'était visible que sur la page Statut.
   */
  visibleIncidents: Incident[];
  /** Ferme le bandeau d'un incident. `persist` = ne plus le montrer tant
   *  qu'il n'a pas de nouvelle mise à jour (sinon : pour cette session). */
  dismissIncident: (incident: Pick<Incident, 'id' | 'updated_at'>, persist?: boolean) => void;
}

// Clé « vu » = id + date de dernière mise à jour : une nouvelle mise à jour
// de l'incident le ré-affiche, ce qui est le comportement attendu.
const DISMISSED_KEY = '@eventez_dismissed_incidents';
const DISMISSED_CAP = 50;
export const incidentSeenKey = (i: Pick<Incident, 'id' | 'updated_at'>) =>
  `${i.id}:${i.updated_at || ''}`;

const StatusContext = createContext<StatusContextValue | undefined>(undefined);

const POLL_INTERVAL_MS = 60_000;

export function StatusProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [lastServiceIncident, setLastServiceIncident] =
    useState<ServiceUnavailablePayload | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const persistedRef = useRef<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DISMISSED_KEY);
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!alive || !Array.isArray(list)) return;
        persistedRef.current = list;
        setDismissed((prev) => new Set([...list, ...prev]));
      } catch {
        // Stockage indisponible : on ré-affichera simplement le bandeau.
      }
    })();
    return () => { alive = false; };
  }, []);

  const dismissIncident = useCallback(
    (incident: Pick<Incident, 'id' | 'updated_at'>, persist = true) => {
      const key = incidentSeenKey(incident);
      setDismissed((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      if (persist) {
        const list = [key, ...persistedRef.current.filter((k) => k !== key)].slice(0, DISMISSED_CAP);
        persistedRef.current = list;
        AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(list)).catch(() => {});
      }
    },
    [],
  );

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

  const visibleIncidents = useMemo<Incident[]>(() => {
    if (!snapshot?.active_incidents) return [];
    return snapshot.active_incidents.filter(
      (i) => i.status !== 'resolved' && !dismissed.has(incidentSeenKey(i)),
    );
  }, [snapshot, dismissed]);

  const value = useMemo<StatusContextValue>(
    () => ({
      snapshot,
      isLoading,
      lastFetchedAt,
      blockingIncident,
      lastServiceIncident,
      refresh,
      clearServiceIncident,
      visibleIncidents,
      dismissIncident,
    }),
    [
      visibleIncidents,
      dismissIncident,
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

/**
 * Incident BLOQUANT actif sur l'un des services donnés (scope service), ou
 * null. Sert à désactiver une action AVANT que l'utilisateur ne la tente
 * (ex. bouton d'achat quand les inscriptions sont suspendues). Le backend
 * reste juge (503) : ceci n'est qu'un confort d'affichage.
 */
export function useServiceBlock(serviceKeys: string[]): Incident | null {
  const ctx = useContext(StatusContext);
  const keys = serviceKeys.join('|');
  return useMemo(() => {
    const incidents = ctx?.snapshot?.active_incidents;
    if (!incidents) return null;
    const wanted = keys.split('|').filter(Boolean);
    return incidents.find(
      (i) => i.is_blocking && i.status !== 'resolved' && i.scope === 'service'
        && i.affected_services?.some((s) => wanted.includes(s)),
    ) ?? null;
  }, [ctx?.snapshot, keys]);
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
