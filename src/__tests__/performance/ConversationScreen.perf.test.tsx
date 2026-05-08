/**
 * Tests de performance — ConversationScreen.
 *
 * ConversationScreen (~1900 lignes) :
 *  - useMessagingWebSocket + useMessageState + useOfflineQueue
 *  - FlatList inversee avec MessageBubble memoizes
 *  - InputToolbar enfant
 *  - Polling fetchMessages 10s
 *
 * On reprend les mocks de ConversationScreen.test.tsx pour assurer un mount
 * sans throw, puis on mesure le temps.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: { conversationId: 'conv-1', userId: '2', userName: 'Bob' },
  }),
}));

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
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, email: 'a@b.com', first_name: 'Alice' } }),
}));

jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showConfirm: jest.fn(),
  }),
}));

jest.mock('../../api', () => ({
  __esModule: true,
  getMediaUrl: (u: string) => u,
  messagesAPI: {
    getMessages: () => Promise.resolve({ data: { results: [], next: null } }),
    getConversation: () => Promise.resolve({ data: { id: 'conv-1', participants: [] } }),
    markConversationAsRead: () => Promise.resolve({ data: {} }),
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

jest.mock('../../hooks/useMessagingWebSocket', () => ({
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

jest.mock('../../hooks/useOfflineQueue', () => ({
  useOfflineQueue: () => ({ queue: [], add: jest.fn(), remove: jest.fn() }),
}));

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
  createAudioPlayer: jest.fn(() => ({ remove: jest.fn() })),
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  RecordingPresets: { HIGH_QUALITY: {} },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() => Promise.resolve({ uri: 'file://compressed.jpg' })),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

jest.mock('../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) => React.createElement(RN.View, null, children),
    WatermarkNumeral: () => null,
  };
});

jest.mock('../../components/ui/Skeleton', () => {
  const RN = require('react-native');
  return {
    SkeletonList: () => RN.View,
    MessageSkeleton: () => RN.View,
  };
});

jest.mock('../../components/messages', () => {
  const RN = require('react-native');
  const React = require('react');
  const Stub = ({ children }: any) => React.createElement(RN.View, null, children);
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

import ConversationScreen from '../../screens/messages/ConversationScreen';

describe('ConversationScreen — performance', () => {
  // Warmup pour absorber le cout de compilation/require Jest (cold-start ~3-4s)
  beforeAll(() => {
    render(<ConversationScreen />);
  });

  beforeEach(() => jest.clearAllMocks());

  it('mounts in less than 800ms (after warmup)', () => {
    const start = performance.now();
    render(<ConversationScreen />);
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] ConversationScreen mount: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(800);
  });

  it('mounts 5 instances in less than 3000ms (regression check)', () => {
    const start = performance.now();
    for (let i = 0; i < 5; i++) {
      render(<ConversationScreen key={i} />);
    }
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] ConversationScreen x 5: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(3000);
  });
});
