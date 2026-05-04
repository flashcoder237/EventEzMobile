import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { eventBus } from '../lib/eventBus';

type ConnectionStatus = 'online' | 'offline' | 'server-down' | 'reconnecting';

interface ConnectionContextType {
  isOnline: boolean;
  isServerReachable: boolean;
  status: ConnectionStatus;
  retry: () => void;
}

const ConnectionContext = createContext<ConnectionContextType>({
  isOnline: true,
  isServerReachable: true,
  status: 'online',
  retry: () => {},
});

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';
const RETRY_INTERVAL = 15000;

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute status
  const status: ConnectionStatus = !isOnline
    ? 'offline'
    : !isServerReachable
      ? 'server-down'
      : wasOffline
        ? 'reconnecting'
        : 'online';

  const wasOfflineRef = useRef(false);
  wasOfflineRef.current = wasOffline;
  const isServerReachableRef = useRef(true);
  isServerReachableRef.current = isServerReachable;
  const failCountRef = useRef(0);

  const checkServer = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(`${API_BASE_URL}/categories/`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      // Server responded — mark as reachable, reset fail counter
      setIsServerReachable(true);
      failCountRef.current = 0;
      // If we were recovering (server was down or device was offline), show "back online" briefly
      if (!isServerReachableRef.current || wasOfflineRef.current) {
        setWasOffline(true);
        setTimeout(() => setWasOffline(false), 2000);
      }
    } catch {
      setIsServerReachable(false);
      setWasOffline(false);
    }
  }, []);

  const retry = useCallback(() => {
    checkServer();
  }, [checkServer]);

  // NetInfo listener — debounce les transitions sur 5s pour éviter de spammer
  // checkServer sur du WiFi instable / captive portal qui flicker. Une rafale
  // de "online → offline → online" en quelques centaines de ms ne déclenche
  // qu'un seul check après stabilisation.
  const recheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline((prev) => {
        if (prev && !online) {
          // Went offline — annule un éventuel recheck en attente
          if (recheckTimerRef.current) {
            clearTimeout(recheckTimerRef.current);
            recheckTimerRef.current = null;
          }
          setWasOffline(false);
        }
        if (!prev && online) {
          // Came back online — debounce le check à 5s. Si le réseau retombe
          // entre temps (cas typique WiFi pourri), on annule.
          setWasOffline(true);
          if (recheckTimerRef.current) clearTimeout(recheckTimerRef.current);
          recheckTimerRef.current = setTimeout(() => {
            recheckTimerRef.current = null;
            checkServer();
          }, 5000);
        }
        return online;
      });
    });

    return () => {
      unsubscribe();
      if (recheckTimerRef.current) {
        clearTimeout(recheckTimerRef.current);
        recheckTimerRef.current = null;
      }
    };
  }, [checkServer]);

  // Listen for server errors from API interceptor
  // Instead of immediately marking server as down, do a health check to confirm
  useEffect(() => {
    const unsub = eventBus.on('api-server-error', () => {
      failCountRef.current += 1;
      // First failure: ping to confirm before showing "server down"
      if (failCountRef.current <= 2) {
        checkServer();
      } else {
        // Multiple failures confirmed — server is truly down
        setIsServerReachable(false);
      }
    });
    return unsub;
  }, [checkServer]);

  // Auto-retry when server is unreachable
  useEffect(() => {
    if (!isServerReachable && isOnline) {
      retryTimerRef.current = setInterval(checkServer, RETRY_INTERVAL);
    } else {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }
    return () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
      }
    };
  }, [isServerReachable, isOnline, checkServer]);

  // Re-check when app comes to foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active' && !isServerReachable) {
        checkServer();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [isServerReachable, checkServer]);

  const value = useMemo(() => ({
    isOnline,
    isServerReachable,
    status,
    retry,
  }), [isOnline, isServerReachable, status, retry]);

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext);
}
