/**
 * hooks/useMessagingWebSocket.ts
 *
 * SINGLETON WebSocket pour la messagerie en temps reel.
 *
 * Architecture : la WS est gere par un singleton au niveau du module (pas
 * un instance par hook). Plusieurs ecrans peuvent appeler
 * `useMessagingWebSocket()` simultanement (MessagesScreen, ConversationScreen,
 * etc.) : ils partagent la MEME connexion WebSocket. Avant ce refactor,
 * chaque ecran ouvrait sa propre WS → cycle close/reconnect au switch d'ecran.
 *
 * Les callbacks (onNewMessage, onTypingIndicator, etc.) de chaque hook
 * sont stockes dans un Set de subscribers ; a chaque event WS, le manager
 * iterate et dispatch a tous.
 *
 * Refcount : la WS connecte au PREMIER subscriber, reste up tant qu'il
 * y a au moins 1 subscriber, et disconnect au DERNIER unsubscribe (avec
 * grace period pour absorber les transitions rapides d'ecrans).
 *
 * SECURITE: Le token est envoye via le premier message WebSocket, pas
 * dans l'URL (evite l'exposition dans les logs serveur).
 */

import { useEffect, useRef, useState, useCallback, MutableRefObject } from 'react';
import { Platform } from 'react-native';
import { getAccessToken, ensureFreshAccessToken } from '../api';
import { Message, WebSocketIncomingMessage } from '../types';
import { eventBus } from '../lib/eventBus';

// ============================================================================
// CONFIG
// ============================================================================

function getWebSocketBaseUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
  if (apiUrl) {
    try {
      const url = new URL(apiUrl);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${url.host}`;
    } catch {
      // URL invalide, fallback
    }
  }
  return Platform.select({
    ios: 'ws://localhost:8000',
    android: 'ws://10.0.2.2:8000',
    default: 'ws://localhost:8000',
  }) as string;
}

const WS_BASE_URL = getWebSocketBaseUrl();

const MAX_RECONNECT_ATTEMPTS = 5;
const TYPING_TIMEOUT_MS = 5000;
const CONNECTING_TIMEOUT_MS = 15000;
const HEARTBEAT_INTERVAL_MS = 15000;
const HEARTBEAT_TIMEOUT_MS = 20000;
// Grace avant de fermer la WS quand le dernier subscriber unsubscribe.
// Absorbe les transitions rapides d'ecrans (MessagesScreen → ConversationScreen
// → retour MessagesScreen) qui sinon causeraient un disconnect/reconnect.
const DISCONNECT_GRACE_MS = 5000;

// ============================================================================
// TYPES
// ============================================================================

interface WebSocketErrorMessage {
  type: 'error';
  code?: string;
  error?: string;
}

interface TypingUser {
  userId: number;
  userName: string;
  conversationId: string | number;
  startedAt: Date;
}

export interface UseMessagingWebSocketOptions {
  onNewMessage?: (message: Message) => void;
  // Accusé de réception de NOTRE message → réconcilier le tempMessage optimiste.
  onMessageSent?: (data: { clientTempId?: string | number | null; message: Message }) => void;
  onTypingIndicator?: (data: { conversationId: string | number; userName: string; isTyping: boolean }) => void;
  onMessageRead?: (data: { messageId: string | number; userId: number; readAt: string }) => void;
  onReactionAdded?: (data: { messageId: string | number; userId: number; emoji: string }) => void;
  onReactionRemoved?: (data: { messageId: string | number; userId: number; emoji: string }) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onMessageDeleted?: (data: { messageId: string | number; userId: number }) => void;
  onMessageUpdated?: (data: { messageId: string | number; content: string; editedAt: string; userId: number }) => void;
  onPresenceChanged?: (data: { userId: number; status: string; lastSeen: string }) => void;
  onUnreadDecrement?: (data: { messageIds: (string | number)[]; conversationIds: (string | number)[] }) => void;
  onConversationAdded?: (data: { conversationId: string | number }) => void;
  onConversationRemoved?: (data: { conversationId: string | number }) => void;
  onRequestStatusChanged?: (data: {
    conversationId: string | number;
    requestStatus: 'accepted' | 'declined' | 'pending_request';
    actorId?: number;
  }) => void;
  onServerError?: (code: string, message: string) => void;
}

// ============================================================================
// SINGLETON STATE
// ============================================================================
//
// Le `ws` (instance WebSocket) et tout l'etat de connexion vit ici, au niveau
// du module — partage entre toutes les instances du hook. Les listeners React
// sont notifies via `notifyListeners()` quand l'etat change → trigger les
// useState locaux des hooks pour re-render.

const state = {
  ws: null as WebSocket | null,
  isConnected: false,
  isAuthenticated: false,
  connectionError: null as string | null,
  typingUsers: new Map<string, TypingUser[]>(),

  reconnectAttempts: 0,
  reconnectTimeout: null as ReturnType<typeof setTimeout> | null,
  connectingTimeout: null as ReturnType<typeof setTimeout> | null,
  heartbeatInterval: null as ReturnType<typeof setInterval> | null,
  heartbeatTimeout: null as ReturnType<typeof setTimeout> | null,
  pendingMessages: [] as any[],
  authRefreshInProgress: false,
  fatalError: false,
  parseErrors: 0,
  typingTimeouts: new Map<string, ReturnType<typeof setTimeout>>(),

  // Subscribers : Set de refs vers les options de chaque hook instance.
  // A chaque event WS, on iterate et on appelle les callbacks dispo.
  subscribers: new Set<MutableRefObject<UseMessagingWebSocketOptions>>(),

  // Listeners pour la propagation de l'etat (isConnected, etc.) vers les
  // useState locaux des hooks → trigger re-render React.
  stateListeners: new Set<() => void>(),

  // Grace timeout avant disconnect au dernier unsubscribe.
  disconnectGraceTimeout: null as ReturnType<typeof setTimeout> | null,

  // Flag anti-race : empeche deux connect() async en parallele d'instancier
  // deux WebSockets concurrents (race window entre `await getAccessToken()`
  // et `state.ws = ws`). Set au debut de connect, clear au try/catch end ou
  // dans onclose si reset propre.
  connectInFlight: false,
};

function notifyListeners() {
  state.stateListeners.forEach(l => {
    try { l(); } catch { /* ignore — un listener cassé ne doit pas bloquer les autres */ }
  });
}

function notifyConnectionChange(connected: boolean) {
  state.subscribers.forEach(s => {
    try { s.current.onConnectionChange?.(connected); } catch { /* ignore */ }
  });
}

// ============================================================================
// HEARTBEAT
// ============================================================================

function stopHeartbeat() {
  if (state.heartbeatInterval) {
    clearInterval(state.heartbeatInterval);
    state.heartbeatInterval = null;
  }
  if (state.heartbeatTimeout) {
    clearTimeout(state.heartbeatTimeout);
    state.heartbeatTimeout = null;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  state.heartbeatInterval = setInterval(() => {
    const ws = state.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type: 'ping' }));
    } catch {
      return;
    }
    if (state.heartbeatTimeout) clearTimeout(state.heartbeatTimeout);
    state.heartbeatTimeout = setTimeout(() => {
      if (__DEV__) console.warn('[WS] heartbeat timeout — connection silently dead, closing');
      try { state.ws?.close(); } catch { /* ignore */ }
    }, HEARTBEAT_TIMEOUT_MS);
  }, HEARTBEAT_INTERVAL_MS);
}

// ============================================================================
// TYPING TIMEOUT HELPERS
// ============================================================================

function clearTypingTimeout(key: string) {
  const t = state.typingTimeouts.get(key);
  if (t) {
    clearTimeout(t);
    state.typingTimeouts.delete(key);
  }
}

function clearAllTypingTimeouts() {
  state.typingTimeouts.forEach(t => clearTimeout(t));
  state.typingTimeouts.clear();
}

// ============================================================================
// MESSAGE HANDLER — dispatch a tous les subscribers
// ============================================================================

function handleMessage(event: MessageEvent) {
  let data: WebSocketIncomingMessage | WebSocketErrorMessage | { type: 'pong' };
  try {
    data = JSON.parse(event.data);
    state.parseErrors = 0;
  } catch {
    state.parseErrors += 1;
    if (state.parseErrors >= 3) {
      if (__DEV__) console.warn('[WS] 3 parse errors, forcing reconnect');
      try { state.ws?.close(); } catch { /* ignore */ }
    }
    return;
  }

  try {
    switch (data.type) {
      case 'pong':
        if (state.heartbeatTimeout) {
          clearTimeout(state.heartbeatTimeout);
          state.heartbeatTimeout = null;
        }
        break;

      case 'auth.success':
        state.isAuthenticated = true;
        state.connectionError = null;
        state.reconnectAttempts = 0;
        state.pendingMessages.forEach(msg => {
          state.ws?.send(JSON.stringify(msg));
        });
        state.pendingMessages = [];
        startHeartbeat();
        notifyListeners();
        break;

      case 'auth.error':
        state.isAuthenticated = false;
        state.authRefreshInProgress = true;
        if (state.ws) state.ws.close();
        ensureFreshAccessToken().then((newAccess) => {
          state.authRefreshInProgress = false;
          if (newAccess) {
            if (__DEV__) console.log('[WS] Auth failed, refreshed token, reconnecting');
            state.reconnectAttempts = 0;
            connect();
          } else {
            state.connectionError = (data as any).error || "Erreur d'authentification";
            notifyListeners();
          }
        });
        notifyListeners();
        break;

      case 'message.new':
        if (data.message) {
          state.subscribers.forEach(s => {
            try { s.current.onNewMessage?.(data.message as Message); } catch { /* ignore */ }
          });
        }
        break;

      case 'message.sent':
        if (data.message) {
          state.subscribers.forEach(s => {
            try {
              s.current.onMessageSent?.({
                clientTempId: (data as any).client_temp_id ?? null,
                message: data.message as Message,
              });
            } catch { /* ignore */ }
          });
        }
        break;

      case 'message.deleted':
        if (data.message_id) {
          state.subscribers.forEach(s => {
            try {
              s.current.onMessageDeleted?.({
                messageId: data.message_id!,
                userId: data.user_id || 0,
              });
            } catch { /* ignore */ }
          });
        }
        break;

      case 'message.edited':
        if (data.message_id) {
          state.subscribers.forEach(s => {
            try {
              s.current.onMessageUpdated?.({
                messageId: data.message_id!,
                content: data.content || '',
                editedAt: data.edited_at || new Date().toISOString(),
                userId: data.user_id || 0,
              });
            } catch { /* ignore */ }
          });
        }
        break;

      case 'typing.indicator': {
        if (data.conversation_id !== undefined && data.user_name) {
          const conversationKey = String(data.conversation_id);
          const isTyping = data.is_typing ?? true;

          if (isTyping && data.user_id) {
            const newMap = new Map(state.typingUsers);
            const currentTyping = newMap.get(conversationKey) || [];
            const userExists = currentTyping.some(u => u.userId === data.user_id);
            if (!userExists) {
              newMap.set(conversationKey, [
                ...currentTyping,
                {
                  userId: data.user_id,
                  userName: data.user_name,
                  conversationId: data.conversation_id,
                  startedAt: new Date(),
                },
              ]);
            }
            state.typingUsers = newMap;

            const timeoutKey = `${conversationKey}-${data.user_id}`;
            clearTypingTimeout(timeoutKey);
            const timeout = setTimeout(() => {
              const m = new Map(state.typingUsers);
              const ct = m.get(conversationKey) || [];
              m.set(conversationKey, ct.filter(u => u.userId !== data.user_id));
              state.typingUsers = m;
              notifyListeners();
            }, TYPING_TIMEOUT_MS);
            state.typingTimeouts.set(timeoutKey, timeout);
          } else {
            const newMap = new Map(state.typingUsers);
            const currentTyping = newMap.get(conversationKey) || [];
            newMap.set(conversationKey, currentTyping.filter(u => u.userId !== data.user_id));
            state.typingUsers = newMap;
            clearTypingTimeout(`${conversationKey}-${data.user_id}`);
          }
          notifyListeners();

          state.subscribers.forEach(s => {
            try {
              s.current.onTypingIndicator?.({
                conversationId: data.conversation_id!,
                userName: data.user_name!,
                isTyping,
              });
            } catch { /* ignore */ }
          });
        }
        break;
      }

      case 'message.read':
        if (data.message_id && data.user_id && data.read_at) {
          state.subscribers.forEach(s => {
            try {
              s.current.onMessageRead?.({
                messageId: data.message_id!,
                userId: data.user_id!,
                readAt: data.read_at!,
              });
            } catch { /* ignore */ }
          });
        }
        break;

      case 'reaction.add':
        if (data.message_id && data.user_id && data.emoji) {
          state.subscribers.forEach(s => {
            try {
              s.current.onReactionAdded?.({
                messageId: data.message_id!,
                userId: data.user_id!,
                emoji: data.emoji!,
              });
            } catch { /* ignore */ }
          });
        }
        break;

      case 'reaction.remove':
        if (data.message_id && data.user_id && data.emoji) {
          state.subscribers.forEach(s => {
            try {
              s.current.onReactionRemoved?.({
                messageId: data.message_id!,
                userId: data.user_id!,
                emoji: data.emoji!,
              });
            } catch { /* ignore */ }
          });
        }
        break;

      case 'presence.changed':
        if (data.user_id) {
          state.subscribers.forEach(s => {
            try {
              s.current.onPresenceChanged?.({
                userId: data.user_id!,
                status: data.status || 'offline',
                lastSeen: data.last_seen || new Date().toISOString(),
              });
            } catch { /* ignore */ }
          });
        }
        break;

      case 'unread.decrement':
        state.subscribers.forEach(s => {
          try {
            s.current.onUnreadDecrement?.({
              messageIds: data.message_ids || [],
              conversationIds: data.conversation_ids || [],
            });
          } catch { /* ignore */ }
        });
        break;

      case 'conversation.added':
        if (data.conversation_id !== undefined) {
          state.subscribers.forEach(s => {
            try { s.current.onConversationAdded?.({ conversationId: data.conversation_id! }); } catch { /* ignore */ }
          });
        }
        break;

      case 'conversation.removed':
        if (data.conversation_id !== undefined) {
          state.subscribers.forEach(s => {
            try { s.current.onConversationRemoved?.({ conversationId: data.conversation_id! }); } catch { /* ignore */ }
          });
        }
        break;

      case 'request.status.changed':
        // Anti-spam DM : accept/decline d'une demande de message.
        // Le destinataire qui accepte → la conv bascule de "Demandes" vers
        // l'inbox normale chez les deux ; refuse → disparait des deux.
        if ((data as any).conversation_id !== undefined && (data as any).request_status) {
          state.subscribers.forEach(s => {
            try {
              s.current.onRequestStatusChanged?.({
                conversationId: (data as any).conversation_id,
                requestStatus: (data as any).request_status,
                actorId: (data as any).actor_id,
              });
            } catch { /* ignore */ }
          });
        }
        break;

      case 'error': {
        if (__DEV__) console.error('WebSocket error from server:', data);
        const errData = data as WebSocketErrorMessage;
        if (errData.code === 'max_connections') {
          state.fatalError = true;
          state.connectionError = errData.error || 'Trop de connexions ouvertes';
          notifyListeners();
        }
        if (errData.code) {
          state.subscribers.forEach(s => {
            try { s.current.onServerError?.(errData.code!, errData.error || 'Erreur serveur'); } catch { /* ignore */ }
          });
        }
        break;
      }

      case 'service_unavailable': {
        const incident = (data as any).incident;
        if (incident) {
          eventBus.emit('service-unavailable', { incident });
          state.fatalError = true;
          state.connectionError = incident.title || 'Messagerie temporairement indisponible';
          notifyListeners();
        }
        break;
      }

      default:
        if (__DEV__) {
          console.log('Unknown WebSocket message type:', (data as { type: string }).type);
        }
    }
  } catch (error) {
    if (__DEV__) console.error('Error parsing WebSocket message:', error);
  }
}

// ============================================================================
// CONNECT / DISCONNECT (module-level, singleton)
// ============================================================================

async function connect() {
  // Idempotent : si la WS est deja OPEN ou CONNECTING, ne rien faire.
  if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) {
    return;
  }
  // Anti-race : si un autre connect() est deja en train de tourner (entre
  // `await getAccessToken()` et `state.ws = ws`), on bail. Sans ce flag,
  // deux mount simultanes de hooks creent deux WebSockets concurrents.
  if (state.connectInFlight) return;
  state.connectInFlight = true;

  // Annuler une grace de disconnect en cours (un nouveau subscriber est arrive)
  if (state.disconnectGraceTimeout) {
    clearTimeout(state.disconnectGraceTimeout);
    state.disconnectGraceTimeout = null;
  }

  let ws: WebSocket | null = null;
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      state.connectionError = 'Non authentifié';
      notifyListeners();
      return;
    }

    if (state.ws) {
      state.ws.close();
    }

    const wsUrl = `${WS_BASE_URL}/ws/messages/`;
    if (!__DEV__ && !wsUrl.startsWith('wss://')) {
      if (__DEV__) console.error('[WS] Refusing insecure ws:// in release build');
      state.connectionError = 'Connexion non sécurisée';
      notifyListeners();
      return;
    }

    ws = new WebSocket(wsUrl);

    if (state.connectingTimeout) clearTimeout(state.connectingTimeout);
    state.connectingTimeout = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.CONNECTING) {
        if (__DEV__) console.warn('[WS] handshake timeout, fermeture forcée');
        state.connectionError = 'Délai de connexion dépassé. Le serveur ne répond pas.';
        notifyListeners();
        try { ws.close(); } catch { /* ignore */ }
      }
    }, CONNECTING_TIMEOUT_MS);

    ws.onopen = () => {
      if (__DEV__) console.log('WebSocket connected, authenticating...');
      if (state.connectingTimeout) {
        clearTimeout(state.connectingTimeout);
        state.connectingTimeout = null;
      }
      state.parseErrors = 0;
      state.isConnected = true;
      notifyListeners();
      notifyConnectionChange(true);
      ws?.send(JSON.stringify({ type: 'auth', token: accessToken }));
    };

    ws.onclose = (event) => {
      if (__DEV__) console.log('WebSocket closed:', event.code, event.reason);
      if (state.connectingTimeout) {
        clearTimeout(state.connectingTimeout);
        state.connectingTimeout = null;
      }
      stopHeartbeat();
      state.isConnected = false;
      state.isAuthenticated = false;
      notifyListeners();
      notifyConnectionChange(false);

      if (state.authRefreshInProgress) {
        if (__DEV__) console.log('[WS] Auto-reconnect skipped — auth refresh in progress');
        return;
      }
      if (state.fatalError) {
        if (__DEV__) console.log('[WS] Auto-reconnect skipped — fatal error received');
        return;
      }

      // Pas de reconnect si plus aucun subscriber (la WS est en cours de
      // teardown legitime apres le grace period). Sans ca on relance la
      // boucle indefiniment apres logout.
      if (state.subscribers.size === 0) {
        if (__DEV__) console.log('[WS] No subscribers — skip auto-reconnect');
        return;
      }

      if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const baseDelay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);
        const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
        const delay = Math.max(500, Math.round(baseDelay + jitter));
        state.reconnectAttempts++;
        if (__DEV__) console.log(`Reconnecting in ${delay}ms (attempt ${state.reconnectAttempts}, base=${baseDelay})`);
        state.reconnectTimeout = setTimeout(() => { connect(); }, delay);
      } else {
        state.connectionError = 'Connexion perdue. Veuillez rafraîchir.';
        notifyListeners();
      }
    };

    ws.onerror = (error) => {
      if (__DEV__) console.error('WebSocket error:', error);
      state.connectionError = 'Erreur de connexion';
      notifyListeners();
    };

    ws.onmessage = handleMessage;
    state.ws = ws;
  } catch (error) {
    if (__DEV__) console.error('Error connecting WebSocket:', error);
    state.connectionError = 'Impossible de se connecter';
    notifyListeners();
    if (ws) {
      try { ws.close(); } catch { /* ignore */ }
    }
  } finally {
    // Clear le flag dans tous les cas (succes, throw, early return apres
    // refus du token). Sans ca, un echec laisserait le flag a true et
    // bloquerait tous les futurs connect().
    state.connectInFlight = false;
  }
}

function disconnect() {
  if (state.reconnectTimeout) {
    clearTimeout(state.reconnectTimeout);
    state.reconnectTimeout = null;
  }
  if (state.connectingTimeout) {
    clearTimeout(state.connectingTimeout);
    state.connectingTimeout = null;
  }
  stopHeartbeat();
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }
  clearAllTypingTimeouts();
  state.isConnected = false;
  state.isAuthenticated = false;
  notifyListeners();
}

function manualReconnect() {
  state.reconnectAttempts = 0;
  state.fatalError = false;
  state.connectionError = null;
  notifyListeners();
  disconnect();
  connect();
}

// ============================================================================
// SEND HELPERS (module-level)
// ============================================================================

function sendWs(data: any): boolean {
  if (state.ws?.readyState === WebSocket.OPEN && state.isAuthenticated) {
    state.ws.send(JSON.stringify(data));
    return true;
  } else if (state.ws?.readyState === WebSocket.OPEN) {
    state.pendingMessages.push(data);
    return true;
  }
  return false;
}

function sendMessage(
  conversationId: string | number,
  content: string,
  replyTo?: string | number,
  attachmentIds?: string[],
  clientTempId?: string | number,
) {
  return sendWs({
    type: 'message.send',
    conversation_id: conversationId,
    content,
    reply_to: replyTo,
    attachments: attachmentIds,
    // Renvoyé par le serveur dans `message.sent` → réconciliation optimiste.
    client_temp_id: clientTempId,
  });
}

function startTyping(conversationId: string | number) {
  sendWs({ type: 'typing.start', conversation_id: conversationId });
}
function stopTyping(conversationId: string | number) {
  sendWs({ type: 'typing.stop', conversation_id: conversationId });
}
function markMessagesAsRead(messageIds: (string | number)[]) {
  sendWs({ type: 'message.read', message_ids: messageIds });
}
function addReaction(messageId: string | number, emoji: string) {
  sendWs({ type: 'reaction.add', message_id: messageId, emoji });
}
function removeReaction(messageId: string | number, emoji: string) {
  sendWs({ type: 'reaction.remove', message_id: messageId, emoji });
}
function editMessage(messageId: string | number, content: string) {
  sendWs({ type: 'message.edit', message_id: messageId, content });
}
function deleteMessage(messageId: string | number) {
  sendWs({ type: 'message.delete', message_id: messageId });
}

// ============================================================================
// HOOK
// ============================================================================

export function useMessagingWebSocket(options: UseMessagingWebSocketOptions = {}) {
  // React state mirrors module state — listener pattern pour re-render.
  const [isConnected, setIsConnected] = useState(state.isConnected);
  const [isAuthenticated, setIsAuthenticated] = useState(state.isAuthenticated);
  const [connectionError, setConnectionError] = useState<string | null>(state.connectionError);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(state.typingUsers);

  // Sync local state avec module state via listener
  useEffect(() => {
    const sync = () => {
      setIsConnected(state.isConnected);
      setIsAuthenticated(state.isAuthenticated);
      setConnectionError(state.connectionError);
      setTypingUsers(state.typingUsers);
    };
    state.stateListeners.add(sync);
    // Initial sync au mount (au cas ou la WS etait deja up via un autre hook)
    sync();
    return () => { state.stateListeners.delete(sync); };
  }, []);

  // Callbacks via cbRef — stable, lu via state.subscribers dans handleMessage
  const cbRef = useRef<UseMessagingWebSocketOptions>(options);
  useEffect(() => { cbRef.current = options; });

  // Register/unregister + refcount-based connect/disconnect
  useEffect(() => {
    state.subscribers.add(cbRef);
    // Premier subscriber → on cancel le grace timeout (si en cours) et on
    // connect (no-op si deja connecte).
    if (state.disconnectGraceTimeout) {
      clearTimeout(state.disconnectGraceTimeout);
      state.disconnectGraceTimeout = null;
    }
    // Si la WS est deja OPEN (un autre hook l'avait initiee), on fire
    // immediatement onConnectionChange(true) pour ce subscriber tardif.
    // Sans ca, son callback ne serait jamais appele pour l'etat actuel
    // (l'event onopen a deja eu lieu dans le passe).
    if (state.isConnected) {
      try { cbRef.current.onConnectionChange?.(true); } catch { /* ignore */ }
    }
    connect();

    return () => {
      state.subscribers.delete(cbRef);
      // Dernier unsubscribe → on programme une deconnexion apres grace
      // (5s) pour absorber les transitions rapides d'ecrans. Si un autre
      // hook se monte avant l'echeance, on cancel.
      if (state.subscribers.size === 0) {
        if (state.disconnectGraceTimeout) clearTimeout(state.disconnectGraceTimeout);
        state.disconnectGraceTimeout = setTimeout(() => {
          if (state.subscribers.size === 0) {
            disconnect();
          }
          state.disconnectGraceTimeout = null;
        }, DISCONNECT_GRACE_MS);
      }
    };
  }, []);

  const getTypingUsersForConversation = useCallback((conversationId: string | number) => {
    return typingUsers.get(String(conversationId)) || [];
  }, [typingUsers]);

  return {
    isConnected,
    isAuthenticated,
    connectionError,
    typingUsers,
    getTypingUsersForConversation,
    connect,
    disconnect,
    reconnect: manualReconnect,
    sendMessage,
    editMessage,
    deleteMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    addReaction,
    removeReaction,
  };
}

export default useMessagingWebSocket;
