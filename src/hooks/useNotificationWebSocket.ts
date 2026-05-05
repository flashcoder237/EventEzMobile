/**
 * hooks/useNotificationWebSocket.ts
 *
 * WebSocket pour notifications temps-réel. Se connecte à /ws/notifications/
 * et écoute :
 *   - notification.new   → ajoute la notif au state local + bump count
 *   - notification.read  → autre device a marqué lu → décrémente count
 *   - unread.count       → push autoritatif du compteur (synchro reconnect, mark-all)
 *
 * Reconnexion exponentielle (1s, 2s, 4s, max 30s), refresh JWT si 4401.
 * Coexiste avec le polling 30s du NotificationContext (le polling reste un
 * filet de sécurité si le WS tombe).
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import { getAccessToken, ensureFreshAccessToken } from '../api';
import type { Notification as NotifModel } from '../types';

function getWebSocketBaseUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
  if (apiUrl) {
    try {
      const url = new URL(apiUrl);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${url.host}`;
    } catch {
      // ignore
    }
  }
  return Platform.select({
    ios: 'ws://localhost:8000',
    android: 'ws://10.0.2.2:8000',
    default: 'ws://localhost:8000',
  }) as string;
}

const WS_BASE_URL = getWebSocketBaseUrl();
const MAX_RECONNECT_DELAY = 30000;

interface UseNotificationWebSocketOptions {
  /** Activé seulement quand l'utilisateur est connecté */
  enabled: boolean;
  onNotificationNew?: (notification: NotifModel) => void;
  onNotificationRead?: (notificationId: string, unreadCount: number) => void;
  onUnreadCountChanged?: (count: number) => void;
}

export function useNotificationWebSocket({
  enabled,
  onNotificationNew,
  onNotificationRead,
  onUnreadCountChanged,
}: UseNotificationWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);
  // Stocker les callbacks dans des refs pour éviter de relancer la connexion
  // à chaque render parent (les callbacks sont souvent inline).
  const onNewRef = useRef(onNotificationNew);
  const onReadRef = useRef(onNotificationRead);
  const onCountRef = useRef(onUnreadCountChanged);
  useEffect(() => { onNewRef.current = onNotificationNew; }, [onNotificationNew]);
  useEffect(() => { onReadRef.current = onNotificationRead; }, [onNotificationRead]);
  useEffect(() => { onCountRef.current = onUnreadCountChanged; }, [onUnreadCountChanged]);

  const connect = useCallback(async () => {
    if (!enabled) return;
    if (isConnectingRef.current) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    isConnectingRef.current = true;

    let token = await getAccessToken();
    if (!token) {
      token = await ensureFreshAccessToken();
    }
    if (!token) {
      isConnectingRef.current = false;
      return;
    }

    const url = `${WS_BASE_URL}/ws/notifications/?token=${token}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      isConnectingRef.current = false;
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      isConnectingRef.current = false;
      reconnectAttemptsRef.current = 0;
      if (__DEV__) console.log('[NotifWS] connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'notification.new':
            if (data.notification) onNewRef.current?.(data.notification);
            break;
          case 'notification.read':
            if (data.notification_id) {
              onReadRef.current?.(String(data.notification_id), Number(data.unread_count ?? 0));
            }
            break;
          case 'unread.count':
            onCountRef.current?.(Number(data.count ?? 0));
            break;
          case 'pong':
            // keep-alive ack
            break;
        }
      } catch {
        // payload mal formé, on ignore
      }
    };

    ws.onerror = () => {
      // onclose va suivre — on gère la reco là-bas pour éviter double timer.
    };

    ws.onclose = (e) => {
      isConnectingRef.current = false;
      wsRef.current = null;
      if (__DEV__) console.log('[NotifWS] closed', e?.code);

      // Code 4401 = auth refusée → tenter refresh + reconnect
      if (e?.code === 4401) {
        ensureFreshAccessToken().catch(() => {});
      }

      if (enabled) {
        scheduleReconnect();
      }
    };
  }, [enabled]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    const attempt = reconnectAttemptsRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempt), MAX_RECONNECT_DELAY);
    reconnectAttemptsRef.current = attempt + 1;
    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'client disconnect');
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
  }, []);

  // (Re)connect quand enabled passe à true ; cleanup à false ou unmount.
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Reconnect au foreground si la socket est morte (sans attendre le timer).
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const ws = wsRef.current;
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          reconnectAttemptsRef.current = 0;
          connect();
        }
      }
    });
    return () => sub.remove();
  }, [enabled, connect]);

  // Heartbeat ping toutes les 25s pour éviter idle disconnect des proxies.
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // ignore
        }
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [enabled]);
}
