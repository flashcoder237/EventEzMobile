/**
 * Tests de performance — MessagesScreen.
 *
 * Liste de conversations avec FlatList + 4 tabs (all/unread/events/archived).
 * Hook useMessagingWebSocket pour presence + new messages.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  success: '#10B981',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  card: '#FFFFFF',
  white: '#FFFFFF',
  text: '#111827',
  border: '#E5E7EB',
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
  useAuth: () => ({ user: { id: 1, email: 'a@b.com' } }),
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
    getConversations: () => Promise.resolve({ data: { results: [] } }),
    getArchivedConversations: () => Promise.resolve({ data: { results: [] } }),
    archiveConversation: jest.fn(() => Promise.resolve({ data: {} })),
    unarchiveConversation: jest.fn(() => Promise.resolve({ data: {} })),
    deleteConversation: jest.fn(() => Promise.resolve({ data: {} })),
    createConversation: jest.fn(() => Promise.resolve({ data: {} })),
  },
  usersAPI: {
    searchUsers: () => Promise.resolve({ data: { results: [] } }),
  },
}));

jest.mock('../../services/CacheService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => null),
    set: jest.fn(),
    invalidate: jest.fn(),
  },
}));

jest.mock('../../hooks/useMutedConversations', () => ({
  useMutedConversations: () => ({
    isMuted: () => false,
    mute: jest.fn(),
    unmute: jest.fn(),
  }),
}));

jest.mock('../../hooks/useMessagingWebSocket', () => ({
  useMessagingWebSocket: () => ({
    isConnected: true,
    isAuthenticated: true,
    onlineUsers: new Set(),
    sendMessage: jest.fn(),
  }),
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  return {
    KeyboardAvoidingView: ({ children }: any) => children,
    KeyboardProvider: ({ children }: any) => children,
  };
});

jest.mock('../../components/ui/Skeleton', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    ConversationItemSkeleton: () => React.createElement(RN.View, null),
    MessagesScreenSkeleton: () => React.createElement(RN.View, null),
  };
});

jest.mock('../../components/illustrations', () => {
  const RN = require('react-native');
  return {
    NewMessage: () => RN.View,
    PeopleSearch: () => RN.View,
    AnimatedIllustration: RN.View,
  };
});

jest.mock('../../components/ui/Animations', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    StaggeredItem: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

import MessagesScreen from '../../screens/messages/MessagesScreen';

describe('MessagesScreen — performance', () => {
  // Warmup pour absorber le cout de compilation/require Jest
  beforeAll(() => {
    render(<MessagesScreen />);
  });

  beforeEach(() => jest.clearAllMocks());

  it('mounts in less than 600ms (after warmup)', () => {
    const start = performance.now();
    render(<MessagesScreen />);
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] MessagesScreen mount: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(600);
  });

  it('mounts 10 instances in less than 3000ms (regression check)', () => {
    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      render(<MessagesScreen key={i} />);
    }
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] MessagesScreen x 10: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(3000);
  });
});
