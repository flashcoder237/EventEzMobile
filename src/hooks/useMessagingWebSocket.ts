/**
 * hooks/useMessagingWebSocket.ts
 * WebSocket hook pour la messagerie en temps réel
 *
 * SÉCURITÉ: Le token est envoyé via le premier message WebSocket,
 * pas dans l'URL (évite l'exposition dans les logs serveur)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { getAccessToken, ensureFreshAccessToken } from '../api';
import { Message, WebSocketIncomingMessage } from '../types';
import { eventBus } from '../lib/eventBus';

// Dériver l'URL WebSocket à partir de EXPO_PUBLIC_API_URL
// pour que le WS pointe toujours vers le même serveur que l'API REST
function getWebSocketBaseUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

  if (apiUrl) {
    try {
      const url = new URL(apiUrl);
      // http -> ws, https -> wss
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${url.host}`;
    } catch {
      // URL invalide, fallback
    }
  }

  // Fallback pour développement local
  return Platform.select({
    ios: 'ws://localhost:8000',
    android: 'ws://10.0.2.2:8000',
    default: 'ws://localhost:8000',
  }) as string;
}

const WS_BASE_URL = getWebSocketBaseUrl();

// Legacy interface kept for the generic 'error' case not in the discriminated union
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

interface UseMessagingWebSocketOptions {
  onNewMessage?: (message: Message) => void;
  onTypingIndicator?: (data: { conversationId: string | number; userName: string; isTyping: boolean }) => void;
  onMessageRead?: (data: { messageId: string | number; userId: number; readAt: string }) => void;
  onReactionAdded?: (data: { messageId: string | number; userId: number; emoji: string }) => void;
  onReactionRemoved?: (data: { messageId: string | number; userId: number; emoji: string }) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onMessageDeleted?: (data: { messageId: string | number; userId: number }) => void;
  onMessageUpdated?: (data: { messageId: string | number; content: string; editedAt: string; userId: number }) => void;
  onPresenceChanged?: (data: { userId: number; status: string; lastSeen: string }) => void;
  /**
   * Diffusé par le backend au group `user_{id}` quand l'utilisateur marque
   * des messages comme lus depuis un autre device. Permet de décrémenter
   * `conversation.unread_count` localement sans refresh REST.
   */
  onUnreadDecrement?: (data: { messageIds: (string | number)[]; conversationIds: (string | number)[] }) => void;
  /**
   * Diffusé quand l'utilisateur est ajouté à une nouvelle conversation
   * (DM initiée par un autre user, ajout dans un groupe, etc.). Le client
   * UI s'en sert pour rafraîchir la liste sans devoir poll en arrière-plan.
   */
  onConversationAdded?: (data: { conversationId: string | number }) => void;
  /**
   * Diffusé quand l'utilisateur est retiré d'une conversation. Permet de
   * la masquer immédiatement de la liste.
   */
  onConversationRemoved?: (data: { conversationId: string | number }) => void;
  onServerError?: (code: string, message: string) => void;
}

// Configuration reconnexion
const MAX_RECONNECT_ATTEMPTS = 5;
const TYPING_TIMEOUT_MS = 5000;
// Si le socket reste en CONNECTING au-delà de ce délai, on force-close pour
// sortir de l'état "Connexion..." infini (réseau bloqué, proxy/captive portal,
// pas de réponse 101 Switching Protocols). ws.close() depuis CONNECTING
// déclenche onclose et relance la chaîne de reconnexion automatique.
const CONNECTING_TIMEOUT_MS = 15000;

// Heartbeat applicatif (ping/pong JSON). Les frames natives WebSocket 0x9/0xA
// ne sont pas exposées par l'API JS de RN, on doit donc passer par un
// message app-level. Backend doit gérer { type: 'ping' } → répondre { type: 'pong' }.
const HEARTBEAT_INTERVAL_MS = 15000;
const HEARTBEAT_TIMEOUT_MS = 20000;

export function useMessagingWebSocket(options: UseMessagingWebSocketOptions = {}) {
  const {
    onNewMessage,
    onTypingIndicator,
    onMessageRead,
    onReactionAdded,
    onReactionRemoved,
    onConnectionChange,
    onMessageDeleted,
    onMessageUpdated,
    onPresenceChanged,
    onUnreadDecrement,
    onConversationAdded,
    onConversationRemoved,
    onServerError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Heartbeat : interval qui envoie des pings, et timeout qui attend le pong.
  // Si pas de pong dans HEARTBEAT_TIMEOUT_MS, on force-close pour relancer le
  // cycle de reconnexion (cas où le serveur est down sans avoir close le socket).
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  // Si le serveur envoie un code d'erreur "permanent" (max_connections, etc.),
  // on bloque la reconnexion auto pour éviter un storm.
  const fatalErrorRef = useRef(false);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingMessagesRef = useRef<any[]>([]);
  // Ref vers connect() pour pouvoir l'appeler depuis handleMessage sans créer
  // une dépendance circulaire (connect est défini après handleMessage).
  const connectRef = useRef<(() => void) | null>(null);
  // Évite que onclose ne reconnecte automatiquement pendant qu'on refresh le
  // token manuellement après un auth.error (sinon on se retrouve avec 2 WS).
  const authRefreshInProgressRef = useRef(false);
  // Compte les JSON.parse failures consécutifs : à 3, on force un reconnect.
  // Évite de rester collé sur une connexion qui pousse du payload corrompu.
  const parseErrorsRef = useRef(0);

  // Stoppe l'interval de ping et le timeout de pong (cleanup).
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Démarre le heartbeat applicatif. Toutes les HEARTBEAT_INTERVAL_MS, on envoie
  // un { type: 'ping' } et on arme un timeout HEARTBEAT_TIMEOUT_MS — si le pong
  // n'arrive pas, on force-close le socket (déclenche onclose → reconnect auto).
  // Backend doit gérer { type: 'ping' } → répondre { type: 'pong' }.
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.send(JSON.stringify({ type: 'ping' }));
      } catch {
        // ignore — le close arrivera de lui-même
        return;
      }
      // Arme le timeout de pong (s'il est déjà armé, on le remplace).
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      heartbeatTimeoutRef.current = setTimeout(() => {
        if (__DEV__) console.warn('[WS] heartbeat timeout — connection silently dead, closing');
        try {
          wsRef.current?.close();
        } catch {
          // ignore
        }
      }, HEARTBEAT_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }, [stopHeartbeat]);

  // Cleanup typing timeout
  const clearTypingTimeout = useCallback((key: string) => {
    const existingTimeout = typingTimeoutsRef.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      typingTimeoutsRef.current.delete(key);
    }
  }, []);

  // Clear all typing timeouts
  const clearAllTypingTimeouts = useCallback(() => {
    typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    typingTimeoutsRef.current.clear();
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    let data: WebSocketIncomingMessage | WebSocketErrorMessage | { type: 'pong' };
    try {
      data = JSON.parse(event.data);
      // Reset après chaque parse réussi.
      parseErrorsRef.current = 0;
    } catch {
      parseErrorsRef.current += 1;
      if (parseErrorsRef.current >= 3) {
        if (__DEV__) console.warn('[WS] 3 parse errors, forcing reconnect');
        try { wsRef.current?.close(); } catch { /* ignore */ }
      }
      return;
    }
    try {
      switch (data.type) {
        case 'pong':
          // Reset le timeout de pong : la connexion est vivante.
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
          }
          break;

        case 'auth.success':
          setIsAuthenticated(true);
          setConnectionError(null);
          // Reset le compteur ici (et pas dans onopen) : on a la confirmation
          // que la session est vraiment établie côté serveur.
          reconnectAttemptsRef.current = 0;
          // Envoyer les messages en attente
          pendingMessagesRef.current.forEach(msg => {
            wsRef.current?.send(JSON.stringify(msg));
          });
          pendingMessagesRef.current = [];
          // Démarre le heartbeat une fois la session pleinement établie.
          startHeartbeat();
          break;

        case 'auth.error':
          // Le token envoyé a été rejeté — typiquement expiré (access JWT
          // dure 30 min, le WS peut rester ouvert plus longtemps). On tente
          // un refresh puis on reconnecte. Si le refresh échoue, c'est que
          // la session est cuite — l'intercepteur API aura émis api-auth-error.
          setIsAuthenticated(false);
          authRefreshInProgressRef.current = true;
          if (wsRef.current) {
            wsRef.current.close();
          }
          ensureFreshAccessToken().then((newAccess) => {
            authRefreshInProgressRef.current = false;
            if (newAccess) {
              if (__DEV__) console.log('[WS] Auth failed, refreshed token, reconnecting');
              reconnectAttemptsRef.current = 0;
              connectRef.current?.();
            } else {
              setConnectionError(data.error || 'Erreur d\'authentification');
            }
          });
          break;

        case 'message.new':
          if (data.message && onNewMessage) {
            onNewMessage(data.message);
          }
          break;

        case 'message.deleted':
          if (data.message_id && onMessageDeleted) {
            onMessageDeleted({ messageId: data.message_id, userId: data.user_id || 0 });
          }
          break;

        case 'message.edited':
          if (data.message_id && onMessageUpdated) {
            onMessageUpdated({
              messageId: data.message_id,
              content: data.content || '',
              editedAt: data.edited_at || new Date().toISOString(),
              userId: data.user_id || 0,
            });
          }
          break;

        case 'typing.indicator': {
          if (data.conversation_id !== undefined && data.user_name) {
            const conversationKey = String(data.conversation_id);
            const isTyping = data.is_typing ?? true;

            if (isTyping && data.user_id) {
              setTypingUsers(prev => {
                const newMap = new Map(prev);
                const currentTyping = newMap.get(conversationKey) || [];
                const userExists = currentTyping.some(u => u.userId === data.user_id);

                if (!userExists) {
                  newMap.set(conversationKey, [
                    ...currentTyping,
                    {
                      userId: data.user_id!,
                      userName: data.user_name!,
                      conversationId: data.conversation_id!,
                      startedAt: new Date(),
                    },
                  ]);
                }
                return newMap;
              });

              // Auto-clear après timeout
              const timeoutKey = `${conversationKey}-${data.user_id}`;
              clearTypingTimeout(timeoutKey);
              const timeout = setTimeout(() => {
                setTypingUsers(prev => {
                  const newMap = new Map(prev);
                  const currentTyping = newMap.get(conversationKey) || [];
                  newMap.set(
                    conversationKey,
                    currentTyping.filter(u => u.userId !== data.user_id)
                  );
                  return newMap;
                });
              }, TYPING_TIMEOUT_MS);
              typingTimeoutsRef.current.set(timeoutKey, timeout);
            } else {
              setTypingUsers(prev => {
                const newMap = new Map(prev);
                const currentTyping = newMap.get(conversationKey) || [];
                newMap.set(
                  conversationKey,
                  currentTyping.filter(u => u.userId !== data.user_id)
                );
                return newMap;
              });
              clearTypingTimeout(`${conversationKey}-${data.user_id}`);
            }

            if (onTypingIndicator) {
              onTypingIndicator({
                conversationId: data.conversation_id,
                userName: data.user_name,
                isTyping,
              });
            }
          }
          break;
        }

        case 'message.read':
          if (onMessageRead && data.message_id && data.user_id && data.read_at) {
            onMessageRead({
              messageId: data.message_id,
              userId: data.user_id,
              readAt: data.read_at,
            });
          }
          break;

        case 'reaction.add':
          if (onReactionAdded && data.message_id && data.user_id && data.emoji) {
            onReactionAdded({
              messageId: data.message_id,
              userId: data.user_id,
              emoji: data.emoji,
            });
          }
          break;

        case 'reaction.remove':
          if (onReactionRemoved && data.message_id && data.user_id && data.emoji) {
            onReactionRemoved({
              messageId: data.message_id,
              userId: data.user_id,
              emoji: data.emoji,
            });
          }
          break;

        case 'presence.changed':
          if (onPresenceChanged && data.user_id) {
            onPresenceChanged({
              userId: data.user_id,
              status: data.status || 'offline',
              lastSeen: data.last_seen || new Date().toISOString(),
            });
          }
          break;

        case 'unread.decrement':
          if (onUnreadDecrement) {
            onUnreadDecrement({
              messageIds: data.message_ids || [],
              conversationIds: data.conversation_ids || [],
            });
          }
          break;

        // Émis par le backend (consumers.conversation_join) quand l'user vient
        // d'être ajouté à une conversation. Le client refetch sa liste pour
        // l'afficher immédiatement, plutôt que d'attendre un refresh manuel.
        case 'conversation.added':
          if (onConversationAdded && data.conversation_id !== undefined) {
            onConversationAdded({ conversationId: data.conversation_id });
          }
          break;

        case 'conversation.removed':
          if (onConversationRemoved && data.conversation_id !== undefined) {
            onConversationRemoved({ conversationId: data.conversation_id });
          }
          break;

        case 'error': {
          if (__DEV__) console.error('WebSocket error from server:', data);
          const errData = data as WebSocketErrorMessage;
          // Erreurs "permanentes" pour cette session : on stoppe la reconnexion
          // auto sinon on crée un storm (le serveur va continuer de rejeter).
          if (errData.code === 'max_connections') {
            fatalErrorRef.current = true;
            setConnectionError(errData.error || 'Trop de connexions ouvertes');
          }
          // Propagate all error codes to caller for user-facing feedback
          if (onServerError && errData.code) {
            onServerError(errData.code, errData.error || 'Erreur serveur');
          }
          break;
        }

        case 'service_unavailable': {
          // Le ChatConsumer ferme le WS avec close code 4503 quand un incident
          // bloquant 'messaging' est actif. Le payload contient l'objet
          // incident — on le forward au StatusContext via eventBus pour
          // déclencher l'IncidentBanner (filtré sur les écrans messagerie).
          //
          // Sans ce relais, l'utilisateur voyait juste le spinner reconnect en
          // boucle sans explication.
          const incident = data.incident;
          if (incident) {
            eventBus.emit('service-unavailable', { incident });
            // Stoppe la reconnexion auto — on ne va pas spam le backend
            // tant que l'incident n'est pas résolu. Le StatusContext refetch
            // /api/status/ et reconnectera quand le service repasse healthy.
            fatalErrorRef.current = true;
            setConnectionError(
              incident.title || "Messagerie temporairement indisponible",
            );
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
  }, [
    onNewMessage,
    onTypingIndicator,
    onMessageRead,
    onReactionAdded,
    onReactionRemoved,
    onMessageDeleted,
    onMessageUpdated,
    onPresenceChanged,
    onUnreadDecrement,
    onConversationAdded,
    onConversationRemoved,
    onServerError,
    clearTypingTimeout,
    startHeartbeat,
  ]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    // Fix memory leak : variable locale pour le socket. Si la creation reussit
    // mais qu'une erreur survient pendant la setup (avant `wsRef.current = ws`),
    // le socket reste ouvert et leak. On garde une reference locale pour
    // pouvoir le fermer dans le catch.
    let ws: WebSocket | null = null;
    try {
      // Récupérer le token d'accès via le helper centralisé
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setConnectionError('Non authentifié');
        return;
      }

      // Fermer l'ancienne connexion
      if (wsRef.current) {
        wsRef.current.close();
      }

      // SÉCURITÉ: Ne pas inclure le token dans l'URL
      const wsUrl = `${WS_BASE_URL}/ws/messages/`;

      // Garde anti-fuite en production : on refuse ws:// non chiffré hors DEV
      // (le token JWT est envoyé dans le 1er frame — il doit être chiffré TLS).
      if (!__DEV__ && !wsUrl.startsWith('wss://')) {
        if (__DEV__) console.error('[WS] Refusing insecure ws:// in release build');
        setConnectionError('Connexion non sécurisée');
        return;
      }

      ws = new WebSocket(wsUrl);

      // Watchdog handshake : si le socket ne dépasse pas l'état CONNECTING
      // dans le délai imparti, on le ferme pour relancer la boucle de
      // reconnexion. Sans ça, l'UI reste sur "Connexion..." indéfiniment
      // quand le serveur est joignable mais ne répond pas au handshake.
      if (connectingTimeoutRef.current) {
        clearTimeout(connectingTimeoutRef.current);
      }
      connectingTimeoutRef.current = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.CONNECTING) {
          if (__DEV__) console.warn('[WS] handshake timeout, fermeture forcée');
          setConnectionError('Délai de connexion dépassé. Le serveur ne répond pas.');
          try {
            ws.close();
          } catch {
            // ignore
          }
        }
      }, CONNECTING_TIMEOUT_MS);

      ws.onopen = () => {
        if (__DEV__) console.log('WebSocket connected, authenticating...');
        if (connectingTimeoutRef.current) {
          clearTimeout(connectingTimeoutRef.current);
          connectingTimeoutRef.current = null;
        }
        // Reset compteur de parse errors à chaque nouvelle connexion.
        parseErrorsRef.current = 0;
        setIsConnected(true);
        // Ne PAS reset reconnectAttemptsRef ici — le backend accepte toujours
        // le WS avant d'authentifier, donc onopen ne signifie pas "session OK".
        // Le reset se fait dans le case 'auth.success' de handleMessage.
        onConnectionChange?.(true);

        // Envoyer l'authentification via le premier message
        ws?.send(JSON.stringify({
          type: 'auth',
          token: accessToken,
        }));
      };

      ws.onclose = (event) => {
        if (__DEV__) console.log('WebSocket closed:', event.code, event.reason);
        if (connectingTimeoutRef.current) {
          clearTimeout(connectingTimeoutRef.current);
          connectingTimeoutRef.current = null;
        }
        // Stoppe le heartbeat — il sera redémarré au prochain auth.success.
        stopHeartbeat();
        setIsConnected(false);
        setIsAuthenticated(false);
        onConnectionChange?.(false);

        // Si on est en train de refresh manuellement le token après auth.error,
        // ne pas enclencher la reconnexion auto — elle sera faite par le .then()
        // une fois le refresh terminé (évite les doubles WS).
        if (authRefreshInProgressRef.current) {
          if (__DEV__) console.log('[WS] Auto-reconnect skipped — auth refresh in progress');
          return;
        }

        // Erreur fatale (max_connections, etc.) : pas de reconnexion auto.
        // L'utilisateur peut appeler reconnect() manuellement quand il veut.
        if (fatalErrorRef.current) {
          if (__DEV__) console.log('[WS] Auto-reconnect skipped — fatal error received');
          return;
        }

        // Reconnexion automatique avec backoff exponentiel + jitter.
        // Sans jitter, après une coupure réseau côté ISP, tous les clients
        // tapent le serveur en synchronie aux mêmes timestamps (1s, 2s, 4s…).
        // Le jitter ±25% étale les retries → courbe lissée côté backend
        // (« thundering herd » mitigée). Pratique courante AWS/Google.
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1); // ±25%
          const delay = Math.max(500, Math.round(baseDelay + jitter));
          reconnectAttemptsRef.current++;
          if (__DEV__) console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}, base=${baseDelay})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setConnectionError('Connexion perdue. Veuillez rafraîchir.');
        }
      };

      ws.onerror = (error) => {
        if (__DEV__) console.error('WebSocket error:', error);
        setConnectionError('Erreur de connexion');
      };

      ws.onmessage = handleMessage;

      wsRef.current = ws;
    } catch (error) {
      if (__DEV__) console.error('Error connecting WebSocket:', error);
      setConnectionError('Impossible de se connecter');
      // Fix memory leak : si la creation a reussi mais que la setup a throw
      // avant l'assignation a wsRef, on ferme le socket orphelin.
      if (ws) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
    }
  }, [handleMessage, onConnectionChange, stopHeartbeat]);

  // Synchronise connectRef avec la dernière version de connect (utilisé par
  // handleMessage.auth.error qui ne peut pas capturer connect directement
  // sans créer une boucle de deps).
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectingTimeoutRef.current) {
      clearTimeout(connectingTimeoutRef.current);
      connectingTimeoutRef.current = null;
    }
    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    clearAllTypingTimeouts();
    setIsConnected(false);
    setIsAuthenticated(false);
  }, [clearAllTypingTimeouts, stopHeartbeat]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    fatalErrorRef.current = false;
    setConnectionError(null);
    disconnect();
    connect();
  }, [connect, disconnect]);

  // Send a message (with queueing if not authenticated)
  const sendWsMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticated) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    } else if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Queued for after authentication
      pendingMessagesRef.current.push(data);
      return true;
    }
    return false;
  }, [isAuthenticated]);

  // Actions WebSocket
  const sendMessage = useCallback((
    conversationId: string | number,
    content: string,
    replyTo?: string | number,
    attachmentIds?: string[]
  ) => {
    return sendWsMessage({
      type: 'message.send',
      conversation_id: conversationId,
      content,
      reply_to: replyTo,
      attachments: attachmentIds,
    });
  }, [sendWsMessage]);

  const startTyping = useCallback((conversationId: string | number) => {
    sendWsMessage({
      type: 'typing.start',
      conversation_id: conversationId,
    });
  }, [sendWsMessage]);

  const stopTyping = useCallback((conversationId: string | number) => {
    sendWsMessage({
      type: 'typing.stop',
      conversation_id: conversationId,
    });
  }, [sendWsMessage]);

  const markMessagesAsRead = useCallback((messageIds: (string | number)[]) => {
    sendWsMessage({
      type: 'message.read',
      message_ids: messageIds,
    });
  }, [sendWsMessage]);

  const addReaction = useCallback((messageId: string | number, emoji: string) => {
    sendWsMessage({
      type: 'reaction.add',
      message_id: messageId,
      emoji,
    });
  }, [sendWsMessage]);

  const removeReaction = useCallback((messageId: string | number, emoji: string) => {
    sendWsMessage({
      type: 'reaction.remove',
      message_id: messageId,
      emoji,
    });
  }, [sendWsMessage]);

  const editMessage = useCallback((messageId: string | number, content: string) => {
    sendWsMessage({
      type: 'message.edit',
      message_id: messageId,
      content,
    });
  }, [sendWsMessage]);

  const deleteMessage = useCallback((messageId: string | number) => {
    sendWsMessage({
      type: 'message.delete',
      message_id: messageId,
    });
  }, [sendWsMessage]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  // Fix memory leak : cleanup dedie pour les typing timeouts. Si le hook
  // unmount avant que `disconnect()` soit appele (cas ou disconnect est
  // skippe ou throw), les timeouts armes dans la Map restent vivants et
  // tentent un setState sur un composant demonte.
  useEffect(() => {
    return () => {
      typingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      typingTimeoutsRef.current.clear();
    };
  }, []);

  // Get typing users for a specific conversation
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
    reconnect,
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
