/**
 * Tests Jest pour ConversationScreen (smoke + minimal interactions).
 *
 * NOTE — pourquoi un test SMOKE seulement (pas un workflow complet send) :
 *
 * ConversationScreen (~1900 lignes) couple :
 *   - useMessagingWebSocket (hook custom avec 9+ callbacks WS)
 *   - useMessageState (reducer state + actions)
 *   - useOfflineQueue (AsyncStorage + replays connexion)
 *   - expo-audio (useAudioRecorder + useAudioPlayer + AudioPlayer mutable refs)
 *   - expo-image-manipulator (compression image avant upload)
 *   - draft AsyncStorage par conversation
 *   - polling fetchMessages toutes les 10s
 *   - InputToolbar enfant qui detient le state local du texte
 *
 * Mocker tout ca pour declencher un "send" via fireEvent.changeText + fireEvent.press
 * demanderait 12+ jest.mock + reproduire le flow asynchrone reducer + WS.
 * Test brittle, peu de valeur pour le risk reel — handleSend ne marche que si
 * useMessagingWebSocket.isConnected est vrai et state.newMessage est non vide.
 *
 * Couverture utile : un smoke render ; les workflows send/edit/delete/report
 * sont deja couverts par :
 *   - src/api/__tests__/messages.test.ts (sendMessage / updateMessage / deleteMessage / reportMessage / forwardMessage)
 *   - ReportMessageModal.test.tsx (radio + submit avec reason+description)
 *   - ForwardModal.test.tsx (selection destinataire)
 *
 * On verifie ici juste que le composant peut s'instancier (pas de throw au mount).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// ── Navigation ────────────────────────────────────────────────────
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  }),
  useRoute: () => ({
    params: { conversationId: 'conv-1', userId: '2', userName: 'Bob' },
  }),
}));

// ── Theme / Auth / Alert ──────────────────────────────────────────
const themeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  text: '#111827',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, email: 'a@b.com', first_name: 'Alice' } }),
}));

jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showConfirm: jest.fn(),
  }),
}));

// ── messagesAPI ───────────────────────────────────────────────────
const mockGetMessages: jest.Mock = jest.fn(() =>
  Promise.resolve({ data: { results: [], next: null } })
);
const mockGetConversation: jest.Mock = jest.fn(() =>
  Promise.resolve({ data: { id: 'conv-1', participants: [] } })
);
const mockMarkRead: jest.Mock = jest.fn(() => Promise.resolve({ data: {} }));
jest.mock('../../../api', () => ({
  __esModule: true,
  getMediaUrl: (u: string) => u,
  messagesAPI: {
    getMessages: (...a: any[]) => mockGetMessages(...a),
    getConversation: (...a: any[]) => mockGetConversation(...a),
    markConversationAsRead: (...a: any[]) => mockMarkRead(...a),
    sendMessage: jest.fn(() => Promise.resolve({ data: {} })),
    updateMessage: jest.fn(() => Promise.resolve({ data: {} })),
    deleteMessage: jest.fn(() => Promise.resolve({ data: {} })),
    reportMessage: jest.fn(() => Promise.resolve({ data: {} })),
    forwardMessage: jest.fn(() => Promise.resolve({ data: {} })),
    getConversationQuota: jest.fn(() =>
      Promise.resolve({ data: { used_bytes: 0, max_bytes: 1, message_count: 0 } })
    ),
  },
}));

// ── WebSocket hook (renvoie connected + tous les sender stubs) ───
jest.mock('../../../hooks/useMessagingWebSocket', () => ({
  useMessagingWebSocket: () => ({
    isConnected: true,
    isAuthenticated: true,
    connectionError: null,
    reconnect: jest.fn(),
    sendMessage: jest.fn(),
    editMessage: jest.fn(),
    deleteMessage: jest.fn(),
    startTyping: jest.fn(),
    stopTyping: jest.fn(),
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
    getTypingUsersForConversation: () => [],
  }),
}));

// ── useOfflineQueue ──────────────────────────────────────────────
jest.mock('../../../hooks/useOfflineQueue', () => ({
  useOfflineQueue: () => ({ queue: [], add: jest.fn(), remove: jest.fn() }),
}));

// ── expo-audio ────────────────────────────────────────────────────
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  }),
  useAudioRecorder: () => ({
    prepareToRecordAsync: jest.fn(() => Promise.resolve()),
    record: jest.fn(),
    stop: jest.fn(() => Promise.resolve({ uri: 'file://rec.m4a' })),
    getStatusAsync: jest.fn(() => Promise.resolve({})),
  }),
  // expo-audio v0.4+ : useAudioRecorderState(recorder, pollIntervalMs) renvoie
  // un snapshot { isRecording, durationMillis, metering } — stub à l'arrêt.
  useAudioRecorderState: () => ({
    isRecording: false,
    durationMillis: 0,
    metering: -160,
  }),
  createAudioPlayer: jest.fn(() => ({ remove: jest.fn() })),
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  RecordingPresets: { HIGH_QUALITY: {} },
}));

// ── expo-image-manipulator ───────────────────────────────────────
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() => Promise.resolve({ uri: 'file://compressed.jpg' })),
  SaveFormat: { JPEG: 'jpeg' },
}));

// ── expo-image-picker ────────────────────────────────────────────
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: true, assets: [] })
  ),
  MediaTypeOptions: { Images: 'Images' },
}));

// ── expo-image ────────────────────────────────────────────────────
jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

// ── Editorial canvas / animations ────────────────────────────────
jest.mock('../../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) => React.createElement(RN.View, null, children),
    WatermarkNumeral: () => null,
  };
});

// ── Skeleton ──────────────────────────────────────────────────────
jest.mock('../../../components/ui/Skeleton', () => {
  const React = require('react');
  const RN = require('react-native');
  const Stub = () => React.createElement(RN.View, null);
  return new Proxy(
    {},
    { get: () => Stub },
  );
});

// ── Hooks divers manquants ────────────────────────────────────────
jest.mock('../../../hooks/useMessageState', () => ({
  useMessageState: () => ({
    state: {
      // conversationId truthy → l'effect mount du screen déclenche fetchMessages
      conversationId: 'conv-1',
      messages: [],
      newMessage: '',
      isLoading: false,
      editingMessage: null,
      replyingTo: null,
      attachedFiles: [],
      hasMoreMessages: false,
      isLoadingMore: false,
      offlineMessages: [],
      isOffline: false,
    },
    actions: new Proxy({}, { get: () => jest.fn() }),
  }),
}));

jest.mock('../../../hooks/useMutedConversations', () => ({
  useMutedConversations: () => ({
    isMuted: () => false,
    toggleMute: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useVoicePrefetch', () => ({
  useVoicePrefetch: jest.fn(),
  getCachedVoiceUri: jest.fn(() => null),
}));

// ── react-native-image-viewing ────────────────────────────────────
jest.mock('react-native-image-viewing', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

// ── expo-document-picker ──────────────────────────────────────────
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}));

// ── expo-file-system/legacy ───────────────────────────────────────
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(() => Promise.resolve({ uri: '' })),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  deleteAsync: jest.fn(() => Promise.resolve()),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
}));

// ── expo-sharing ──────────────────────────────────────────────────
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// ── EventActionsSheet ─────────────────────────────────────────────
jest.mock('../../../components/organizer/EventActionsSheet', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement(RN.View, null),
  };
});

// ── Composants messages internes — neutralises ──────────────────
jest.mock('../../../components/messages', () => {
  const RN = require('react-native');
  const React = require('react');
  const Stub = ({ children }: any) =>
    React.createElement(RN.View, null, children);
  return {
    MessageBubble: () => null,
    TypingIndicator: () => null,
    MessageActionModal: Stub,
    ReportMessageModal: Stub,
    ReactionPickerModal: Stub,
    ForwardModal: Stub,
    InputToolbar: () => null,
    ConversationQuotaBanner: () => null,
    GroupAdminPanel: Stub,
    MessageActionType: {},
    ReportReason: {},
    QuotaState: {},
  };
});

import ConversationScreen from '../ConversationScreen';

describe('ConversationScreen — smoke', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mounts without throwing and triggers initial fetch', async () => {
    const result = render(<ConversationScreen />);
    // fetchMessages est async (CacheService + messagesAPI) → on attend
    await waitFor(() => {
      expect(mockGetMessages).toHaveBeenCalled();
    });
    expect(result.toJSON()).toBeTruthy();
  });
});
