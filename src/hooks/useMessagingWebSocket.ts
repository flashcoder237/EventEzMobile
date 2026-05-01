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
}

// Configuration reconnexion
const MAX_RECONNECT_ATTEMPTS = 5;
const TYPING_TIMEOUT_MS = 5000;
// Si le socket reste en CONNECTING au-delà de ce délai, on force-close pour
// sortir de l'état "Connexion..." infini (réseau bloqué, proxy/captive portal,
// pas de réponse 101 Switching Protocols). ws.close() depuis CONNECTING
// déclenche onclose et relance la chaîne de reconnexion automatique.
const CONNECTING_TIMEOUT_MS = 15000;

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
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    try {
      const data: WebSocketIncomingMessage | WebSocketErrorMessage = JSON.parse(event.data);

      switch (data.type) {
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

        case 'error': {
          if (__DEV__) console.error('WebSocket error from server:', data);
          const errData = data as WebSocketErrorMessage;
          // Erreurs "permanentes" pour cette session : on stoppe la reconnexion
          // auto sinon on crée un storm (le serveur va continuer de rejeter).
          if (errData.code === 'max_connections') {
            fatalErrorRef.current = true;
            setConnectionError(errData.error || 'Trop de connexions ouvertes');
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
    clearTypingTimeout,
  ]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
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

      const ws = new WebSocket(wsUrl);

      // Watchdog handshake : si le socket ne dépasse pas l'état CONNECTING
      // dans le délai imparti, on le ferme pour relancer la boucle de
      // reconnexion. Sans ça, l'UI reste sur "Connexion..." indéfiniment
      // quand le serveur est joignable mais ne répond pas au handshake.
      if (connectingTimeoutRef.current) {
        clearTimeout(connectingTimeoutRef.current);
      }
      connectingTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
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
        setIsConnected(true);
        // Ne PAS reset reconnectAttemptsRef ici — le backend accepte toujours
        // le WS avant d'authentifier, donc onopen ne signifie pas "session OK".
        // Le reset se fait dans le case 'auth.success' de handleMessage.
        onConnectionChange?.(true);

        // Envoyer l'authentification via le premier message
        ws.send(JSON.stringify({
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

        // Reconnexion automatique avec backoff exponentiel
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          if (__DEV__) console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

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
    }
  }, [handleMessage, onConnectionChange]);

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

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    clearAllTypingTimeouts();
    setIsConnected(false);
    setIsAuthenticated(false);
  }, [clearAllTypingTimeouts]);

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
