/**
 * Hook personnalisé pour gérer l'état de la messagerie
 * Refactorise les 26+ variables d'état en un reducer centralisé
 */

import { useReducer, useCallback, useMemo } from 'react';
import { Message, User } from '../types';

// Types pour l'état
export interface AttachedFile {
  id?: string;
  uri: string;
  name: string;
  type: 'image' | 'document' | 'voice';
  duration?: number;
  uploadProgress?: number;
}

export interface MessageState {
  // Messages
  messages: Message[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  nextPageUrl: string | null;

  // Input
  newMessage: string;
  attachedFiles: AttachedFile[];
  sending: boolean;

  // Conversation
  conversationId: string | null;
  conversationTitle: string;
  otherUserAvatar: string | null;
  otherUserId: string | null;
  isNewConversation: boolean;

  // Selection et actions
  selectedMessage: Message | null;
  replyToMessage: Message | null;
  editingMessage: Message | null;

  // Modals
  showActionMenu: boolean;
  showReactionPicker: boolean;
  showForwardModal: boolean;

  // Forward
  forwardTargets: User[];
  loadingForwardTargets: boolean;

  // Recording
  isRecording: boolean;
  recordingDuration: number;

  // Playback
  playingVoiceId: string | null;

  // Typing
  typingUsers: string[];

  // Focus
  inputFocused: boolean;
}

// Actions
type MessageAction =
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_MESSAGES_BEFORE'; payload: Message[] }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<Message> } }
  | { type: 'REMOVE_MESSAGE'; payload: string }
  | { type: 'REMOVE_TEMP_MESSAGES' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_MORE'; payload: boolean }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'SET_NEXT_PAGE_URL'; payload: string | null }
  | { type: 'SET_NEW_MESSAGE'; payload: string }
  | { type: 'SET_ATTACHED_FILES'; payload: AttachedFile[] }
  | { type: 'CLEAR_ATTACHED_FILES' }
  | { type: 'SET_SENDING'; payload: boolean }
  | { type: 'SET_CONVERSATION_ID'; payload: string | null }
  | { type: 'SET_CONVERSATION_TITLE'; payload: string }
  | { type: 'SET_OTHER_USER'; payload: { avatar: string | null; id: string | null } }
  | { type: 'SET_IS_NEW_CONVERSATION'; payload: boolean }
  | { type: 'SET_SELECTED_MESSAGE'; payload: Message | null }
  | { type: 'SET_REPLY_TO_MESSAGE'; payload: Message | null }
  | { type: 'SET_EDITING_MESSAGE'; payload: Message | null }
  | { type: 'START_EDIT'; payload: Message }
  | { type: 'START_REPLY'; payload: Message }
  | { type: 'CANCEL_EDIT' }
  | { type: 'CANCEL_REPLY' }
  | { type: 'SHOW_ACTION_MENU'; payload: Message }
  | { type: 'HIDE_ACTION_MENU' }
  | { type: 'SHOW_REACTION_PICKER'; payload?: string }
  | { type: 'HIDE_REACTION_PICKER' }
  | { type: 'SHOW_FORWARD_MODAL' }
  | { type: 'HIDE_FORWARD_MODAL' }
  | { type: 'SET_FORWARD_TARGETS'; payload: User[] }
  | { type: 'SET_LOADING_FORWARD_TARGETS'; payload: boolean }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'SET_RECORDING_DURATION'; payload: number }
  | { type: 'INCREMENT_RECORDING_DURATION' }
  | { type: 'SET_PLAYING_VOICE'; payload: string | null }
  | { type: 'SET_TYPING_USERS'; payload: string[] }
  | { type: 'ADD_TYPING_USER'; payload: string }
  | { type: 'REMOVE_TYPING_USER'; payload: string }
  | { type: 'SET_INPUT_FOCUSED'; payload: boolean }
  | { type: 'ADD_REACTION'; payload: { messageId: string; emoji: string; userId: string } }
  | { type: 'REMOVE_REACTION'; payload: { messageId: string; emoji: string; userId: string } }
  | { type: 'MARK_MESSAGE_READ'; payload: { messageId: string; userId: string } }
  | { type: 'RESET' };

// État initial
const initialState: MessageState = {
  messages: [],
  loading: false,
  loadingMore: false,
  hasMore: false,
  nextPageUrl: null,
  newMessage: '',
  attachedFiles: [],
  sending: false,
  conversationId: null,
  conversationTitle: '',
  otherUserAvatar: null,
  otherUserId: null,
  isNewConversation: false,
  selectedMessage: null,
  replyToMessage: null,
  editingMessage: null,
  showActionMenu: false,
  showReactionPicker: false,
  showForwardModal: false,
  forwardTargets: [],
  loadingForwardTargets: false,
  isRecording: false,
  recordingDuration: 0,
  playingVoiceId: null,
  typingUsers: [],
  inputFocused: false,
};

// Reducer
function messageReducer(state: MessageState, action: MessageAction): MessageState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'ADD_MESSAGE': {
      // Éviter les doublons
      const exists = state.messages.some(m => m.id === action.payload.id);
      if (exists) return state;
      return { ...state, messages: [...state.messages, action.payload] };
    }

    case 'ADD_MESSAGES_BEFORE':
      return {
        ...state,
        messages: [...action.payload, ...state.messages],
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      };

    case 'REMOVE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(m => m.id !== action.payload),
      };

    case 'REMOVE_TEMP_MESSAGES':
      return {
        ...state,
        messages: state.messages.filter(m => !String(m.id).startsWith('temp-')),
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_LOADING_MORE':
      return { ...state, loadingMore: action.payload };

    case 'SET_HAS_MORE':
      return { ...state, hasMore: action.payload };

    case 'SET_NEXT_PAGE_URL':
      return { ...state, nextPageUrl: action.payload };

    case 'SET_NEW_MESSAGE':
      return { ...state, newMessage: action.payload };

    case 'SET_ATTACHED_FILES':
      return { ...state, attachedFiles: action.payload };

    case 'CLEAR_ATTACHED_FILES':
      return { ...state, attachedFiles: [] };

    case 'SET_SENDING':
      return { ...state, sending: action.payload };

    case 'SET_CONVERSATION_ID':
      return { ...state, conversationId: action.payload };

    case 'SET_CONVERSATION_TITLE':
      return { ...state, conversationTitle: action.payload };

    case 'SET_OTHER_USER':
      return {
        ...state,
        otherUserAvatar: action.payload.avatar,
        otherUserId: action.payload.id,
      };

    case 'SET_IS_NEW_CONVERSATION':
      return { ...state, isNewConversation: action.payload };

    case 'SET_SELECTED_MESSAGE':
      return { ...state, selectedMessage: action.payload };

    case 'SET_REPLY_TO_MESSAGE':
      return { ...state, replyToMessage: action.payload };

    case 'SET_EDITING_MESSAGE':
      return { ...state, editingMessage: action.payload };

    case 'START_EDIT':
      return {
        ...state,
        editingMessage: action.payload,
        newMessage: action.payload.content,
        replyToMessage: null,
        showActionMenu: false,
        selectedMessage: null,
      };

    case 'START_REPLY':
      return {
        ...state,
        replyToMessage: action.payload,
        editingMessage: null,
        showActionMenu: false,
        selectedMessage: null,
      };

    case 'CANCEL_EDIT':
      return { ...state, editingMessage: null, newMessage: '' };

    case 'CANCEL_REPLY':
      return { ...state, replyToMessage: null };

    case 'SHOW_ACTION_MENU':
      return {
        ...state,
        showActionMenu: true,
        selectedMessage: action.payload,
      };

    case 'HIDE_ACTION_MENU':
      return {
        ...state,
        showActionMenu: false,
        selectedMessage: null,
      };

    case 'SHOW_REACTION_PICKER':
      return { ...state, showReactionPicker: true };

    case 'HIDE_REACTION_PICKER':
      return { ...state, showReactionPicker: false };

    case 'SHOW_FORWARD_MODAL':
      return { ...state, showForwardModal: true };

    case 'HIDE_FORWARD_MODAL':
      return {
        ...state,
        showForwardModal: false,
        selectedMessage: null,
        forwardTargets: [],
      };

    case 'SET_FORWARD_TARGETS':
      return { ...state, forwardTargets: action.payload };

    case 'SET_LOADING_FORWARD_TARGETS':
      return { ...state, loadingForwardTargets: action.payload };

    case 'SET_RECORDING':
      return {
        ...state,
        isRecording: action.payload,
        recordingDuration: action.payload ? state.recordingDuration : 0,
      };

    case 'SET_RECORDING_DURATION':
      return { ...state, recordingDuration: action.payload };

    case 'INCREMENT_RECORDING_DURATION':
      return { ...state, recordingDuration: state.recordingDuration + 1 };

    case 'SET_PLAYING_VOICE':
      return { ...state, playingVoiceId: action.payload };

    case 'SET_TYPING_USERS':
      return { ...state, typingUsers: action.payload };

    case 'ADD_TYPING_USER':
      if (state.typingUsers.includes(action.payload)) return state;
      return { ...state, typingUsers: [...state.typingUsers, action.payload] };

    case 'REMOVE_TYPING_USER':
      return {
        ...state,
        typingUsers: state.typingUsers.filter(u => u !== action.payload),
      };

    case 'SET_INPUT_FOCUSED':
      return { ...state, inputFocused: action.payload };

    case 'ADD_REACTION': {
      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id !== action.payload.messageId) return msg;
          const reactions = msg.reactions || [];
          const existingIndex = reactions.findIndex(
            r => r.emoji === action.payload.emoji && r.user === action.payload.userId
          );
          if (existingIndex >= 0) return msg;
          return {
            ...msg,
            reactions: [
              ...reactions,
              {
                id: `temp-${Date.now()}`,
                emoji: action.payload.emoji,
                user: action.payload.userId,
                created_at: new Date().toISOString(),
              },
            ],
          };
        }),
      };
    }

    case 'REMOVE_REACTION': {
      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id !== action.payload.messageId) return msg;
          return {
            ...msg,
            reactions: (msg.reactions || []).filter(
              r => !(r.emoji === action.payload.emoji && r.user === action.payload.userId)
            ),
          };
        }),
      };
    }

    case 'MARK_MESSAGE_READ': {
      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id !== action.payload.messageId) return msg;
          const readBy = msg.read_by || [];
          if (readBy.includes(action.payload.userId)) return msg;
          return { ...msg, read_by: [...readBy, action.payload.userId] };
        }),
      };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Hook
export function useMessageState(initialConversationId?: string, userName?: string) {
  const [state, dispatch] = useReducer(messageReducer, {
    ...initialState,
    conversationId: initialConversationId || null,
    conversationTitle: userName || '',
    isNewConversation: !initialConversationId && !!userName,
    loading: !!initialConversationId,
  });

  // Actions mémorisées
  const actions = useMemo(
    () => ({
      setMessages: (messages: Message[]) =>
        dispatch({ type: 'SET_MESSAGES', payload: messages }),

      addMessage: (message: Message) =>
        dispatch({ type: 'ADD_MESSAGE', payload: message }),

      addMessagesBefore: (messages: Message[]) =>
        dispatch({ type: 'ADD_MESSAGES_BEFORE', payload: messages }),

      updateMessage: (id: string, updates: Partial<Message>) =>
        dispatch({ type: 'UPDATE_MESSAGE', payload: { id, updates } }),

      removeMessage: (id: string) =>
        dispatch({ type: 'REMOVE_MESSAGE', payload: id }),

      removeTempMessages: () =>
        dispatch({ type: 'REMOVE_TEMP_MESSAGES' }),

      setLoading: (loading: boolean) =>
        dispatch({ type: 'SET_LOADING', payload: loading }),

      setLoadingMore: (loading: boolean) =>
        dispatch({ type: 'SET_LOADING_MORE', payload: loading }),

      setHasMore: (hasMore: boolean) =>
        dispatch({ type: 'SET_HAS_MORE', payload: hasMore }),

      setNextPageUrl: (url: string | null) =>
        dispatch({ type: 'SET_NEXT_PAGE_URL', payload: url }),

      setNewMessage: (message: string) =>
        dispatch({ type: 'SET_NEW_MESSAGE', payload: message }),

      setAttachedFiles: (files: AttachedFile[]) =>
        dispatch({ type: 'SET_ATTACHED_FILES', payload: files }),

      clearAttachedFiles: () =>
        dispatch({ type: 'CLEAR_ATTACHED_FILES' }),

      setSending: (sending: boolean) =>
        dispatch({ type: 'SET_SENDING', payload: sending }),

      setConversationId: (id: string | null) =>
        dispatch({ type: 'SET_CONVERSATION_ID', payload: id }),

      setConversationTitle: (title: string) =>
        dispatch({ type: 'SET_CONVERSATION_TITLE', payload: title }),

      setOtherUser: (avatar: string | null, id: string | null) =>
        dispatch({ type: 'SET_OTHER_USER', payload: { avatar, id } }),

      setIsNewConversation: (isNew: boolean) =>
        dispatch({ type: 'SET_IS_NEW_CONVERSATION', payload: isNew }),

      showActionMenu: (message: Message) =>
        dispatch({ type: 'SHOW_ACTION_MENU', payload: message }),

      hideActionMenu: () =>
        dispatch({ type: 'HIDE_ACTION_MENU' }),

      startEdit: (message: Message) =>
        dispatch({ type: 'START_EDIT', payload: message }),

      cancelEdit: () =>
        dispatch({ type: 'CANCEL_EDIT' }),

      startReply: (message: Message) =>
        dispatch({ type: 'START_REPLY', payload: message }),

      cancelReply: () =>
        dispatch({ type: 'CANCEL_REPLY' }),

      showReactionPicker: () =>
        dispatch({ type: 'SHOW_REACTION_PICKER' }),

      hideReactionPicker: () =>
        dispatch({ type: 'HIDE_REACTION_PICKER' }),

      showForwardModal: () =>
        dispatch({ type: 'SHOW_FORWARD_MODAL' }),

      hideForwardModal: () =>
        dispatch({ type: 'HIDE_FORWARD_MODAL' }),

      setForwardTargets: (targets: User[]) =>
        dispatch({ type: 'SET_FORWARD_TARGETS', payload: targets }),

      setLoadingForwardTargets: (loading: boolean) =>
        dispatch({ type: 'SET_LOADING_FORWARD_TARGETS', payload: loading }),

      setRecording: (recording: boolean) =>
        dispatch({ type: 'SET_RECORDING', payload: recording }),

      setRecordingDuration: (duration: number) =>
        dispatch({ type: 'SET_RECORDING_DURATION', payload: duration }),

      incrementRecordingDuration: () =>
        dispatch({ type: 'INCREMENT_RECORDING_DURATION' }),

      setPlayingVoice: (id: string | null) =>
        dispatch({ type: 'SET_PLAYING_VOICE', payload: id }),

      setTypingUsers: (users: string[]) =>
        dispatch({ type: 'SET_TYPING_USERS', payload: users }),

      addTypingUser: (user: string) =>
        dispatch({ type: 'ADD_TYPING_USER', payload: user }),

      removeTypingUser: (user: string) =>
        dispatch({ type: 'REMOVE_TYPING_USER', payload: user }),

      setInputFocused: (focused: boolean) =>
        dispatch({ type: 'SET_INPUT_FOCUSED', payload: focused }),

      addReaction: (messageId: string, emoji: string, userId: string) =>
        dispatch({ type: 'ADD_REACTION', payload: { messageId, emoji, userId } }),

      removeReaction: (messageId: string, emoji: string, userId: string) =>
        dispatch({ type: 'REMOVE_REACTION', payload: { messageId, emoji, userId } }),

      markMessageRead: (messageId: string, userId: string) =>
        dispatch({ type: 'MARK_MESSAGE_READ', payload: { messageId, userId } }),

      reset: () => dispatch({ type: 'RESET' }),
    }),
    []
  );

  return { state, actions, dispatch };
}

export default useMessageState;
