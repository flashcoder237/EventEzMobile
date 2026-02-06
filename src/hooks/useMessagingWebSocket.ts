/**
 * hooks/useMessagingWebSocket.ts
 * WebSocket hook pour la messagerie en temps réel
 *
 * SÉCURITÉ: Le token est envoyé via le premier message WebSocket,
 * pas dans l'URL (évite l'exposition dans les logs serveur)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Message } from '../types';

// Configuration
const WS_BASE_URL = Platform.select({
  ios: 'ws://localhost:8000',
  android: 'ws://10.0.2.2:8000',
  default: 'ws://localhost:8000',
});

// Pour production, utiliser wss:// avec le vrai domaine
// const WS_BASE_URL = 'wss://api.eventez.com';

interface WebSocketMessage {
  type: string;
  message?: any;
  conversation_id?: string | number;
  message_id?: string | number;
  user_id?: number;
  user_name?: string;
  emoji?: string;
  is_typing?: boolean;
  read_at?: string;
  reaction_id?: string | number;
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
  onMessageDeleted?: (data: { messageId: string | number }) => void;
  onMessageUpdated?: (data: { messageId: string | number; content: string }) => void;
}

// Configuration reconnexion
const MAX_RECONNECT_ATTEMPTS = 5;
const TYPING_TIMEOUT_MS = 5000;

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
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingMessagesRef = useRef<any[]>([]);

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
      const data: WebSocketMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'auth.success':
          setIsAuthenticated(true);
          setConnectionError(null);
          // Envoyer les messages en attente
          pendingMessagesRef.current.forEach(msg => {
            wsRef.current?.send(JSON.stringify(msg));
          });
          pendingMessagesRef.current = [];
          break;

        case 'auth.error':
          setConnectionError(data.error || 'Erreur d\'authentification');
          setIsAuthenticated(false);
          break;

        case 'message.new':
          if (data.message && onNewMessage) {
            onNewMessage(data.message);
          }
          break;

        case 'message.deleted':
          if (data.message_id && onMessageDeleted) {
            onMessageDeleted({ messageId: data.message_id });
          }
          break;

        case 'message.updated':
          if (data.message_id && onMessageUpdated) {
            onMessageUpdated({
              messageId: data.message_id,
              content: (data as any).content || '',
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

        case 'error':
          console.error('WebSocket error from server:', data);
          break;

        default:
          if (__DEV__) {
            console.log('Unknown WebSocket message type:', data.type);
          }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [
    onNewMessage,
    onTypingIndicator,
    onMessageRead,
    onReactionAdded,
    onReactionRemoved,
    onMessageDeleted,
    onMessageUpdated,
    clearTypingTimeout,
  ]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      // Récupérer le token d'accès
      const accessToken = await SecureStore.getItemAsync('accessToken');
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
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected, authenticating...');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.(true);

        // Envoyer l'authentification via le premier message
        ws.send(JSON.stringify({
          type: 'auth',
          token: accessToken,
        }));
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsAuthenticated(false);
        onConnectionChange?.(false);

        // Reconnexion automatique avec backoff exponentiel
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setConnectionError('Connexion perdue. Veuillez rafraîchir.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Erreur de connexion');
      };

      ws.onmessage = handleMessage;

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      setConnectionError('Impossible de se connecter');
    }
  }, [handleMessage, onConnectionChange]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
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
    startTyping,
    stopTyping,
    markMessagesAsRead,
    addReaction,
    removeReaction,
  };
}

export default useMessagingWebSocket;
