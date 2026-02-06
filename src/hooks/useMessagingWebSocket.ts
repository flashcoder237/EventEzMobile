// hooks/useMessagingWebSocket.ts
// WebSocket hook pour la messagerie en temps reel

import { useEffect, useRef, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Message } from '../types';

// Configuration
const WS_BASE_URL = Platform.select({
  ios: 'ws://localhost:8000',
  android: 'ws://10.0.2.2:8000', // Android emulator
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
}

export function useMessagingWebSocket(options: UseMessagingWebSocketOptions = {}) {
  const {
    onNewMessage,
    onTypingIndicator,
    onMessageRead,
    onReactionAdded,
    onReactionRemoved,
    onConnectionChange,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Nettoyer les indicateurs de frappe apres 5 secondes
  const clearTypingTimeout = useCallback((key: string) => {
    const existingTimeout = typingTimeoutsRef.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      typingTimeoutsRef.current.delete(key);
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'message.new':
          if (data.message && onNewMessage) {
            onNewMessage(data.message);
          }
          break;

        case 'typing.indicator':
          if (data.conversation_id !== undefined && data.user_name) {
            const conversationKey = String(data.conversation_id);
            const isTyping = data.is_typing ?? true;

            if (isTyping) {
              // Ajouter l'utilisateur qui tape
              setTypingUsers(prev => {
                const newMap = new Map(prev);
                const currentTyping = newMap.get(conversationKey) || [];
                const userExists = currentTyping.some(u => u.userId === data.user_id);

                if (!userExists && data.user_id) {
                  newMap.set(conversationKey, [
                    ...currentTyping,
                    {
                      userId: data.user_id,
                      userName: data.user_name!,
                      conversationId: data.conversation_id!,
                      startedAt: new Date(),
                    },
                  ]);
                }
                return newMap;
              });

              // Auto-clear apres 5 secondes
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
              }, 5000);
              typingTimeoutsRef.current.set(timeoutKey, timeout);
            } else {
              // Retirer l'utilisateur
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
          console.log('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [onNewMessage, onTypingIndicator, onMessageRead, onReactionAdded, onReactionRemoved, clearTypingTimeout]);

  const connect = useCallback(async () => {
    try {
      // Recuperer le token d'acces
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (!accessToken) {
        setConnectionError('Non authentifie');
        return;
      }

      // Fermer l'ancienne connexion si elle existe
      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsUrl = `${WS_BASE_URL}/ws/messages/?token=${accessToken}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.(true);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        onConnectionChange?.(false);

        // Reconnexion automatique avec backoff exponentiel
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setConnectionError('Connexion perdue. Veuillez rafraichir.');
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

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear all typing timeouts
    typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    typingTimeoutsRef.current.clear();

    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [connect, disconnect]);

  // Actions WebSocket

  const sendMessage = useCallback((conversationId: string | number, content: string, replyTo?: string | number, attachmentIds?: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message.send',
        conversation_id: conversationId,
        content,
        reply_to: replyTo,
        attachments: attachmentIds,
      }));
      return true;
    }
    return false;
  }, []);

  const startTyping = useCallback((conversationId: string | number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing.start',
        conversation_id: conversationId,
      }));
    }
  }, []);

  const stopTyping = useCallback((conversationId: string | number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing.stop',
        conversation_id: conversationId,
      }));
    }
  }, []);

  const markMessagesAsRead = useCallback((messageIds: (string | number)[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message.read',
        message_ids: messageIds,
      }));
    }
  }, []);

  const addReaction = useCallback((messageId: string | number, emoji: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reaction.add',
        message_id: messageId,
        emoji,
      }));
    }
  }, []);

  const removeReaction = useCallback((messageId: string | number, emoji: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reaction.remove',
        message_id: messageId,
        emoji,
      }));
    }
  }, []);

  // Connexion automatique au montage
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  // Recuperer les utilisateurs qui tapent pour une conversation
  const getTypingUsersForConversation = useCallback((conversationId: string | number) => {
    return typingUsers.get(String(conversationId)) || [];
  }, [typingUsers]);

  return {
    isConnected,
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
