/**
 * Tests de performance — MyTicketsScreen.
 *
 * Liste avec filtres (3 tabs), reducer state, FlatList, OfflineTickets.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useFocusEffect: (fn: any) => fn(),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  warning: '#F59E0B',
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
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 1, email: 'a@b.com' },
  }),
}));

jest.mock('../../api', () => ({
  __esModule: true,
  registrationsAPI: {
    getMyRegistrations: () => Promise.resolve({ data: { results: [] } }),
  },
  ticketTransfersAPI: {
    getPendingTransfers: () => Promise.resolve({ data: { results: [] } }),
  },
}));

jest.mock('../../hooks/useOfflineTickets', () => ({
  useOfflineTickets: () => ({
    cachedRegistrations: [],
    saveOfflineTickets: jest.fn(),
    isSyncing: false,
  }),
}));

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('react-native-svg', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: RN.View,
    Svg: RN.View,
    Circle: RN.View,
  };
});

jest.mock('../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) => React.createElement(RN.View, null, children),
    WatermarkNumeral: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

jest.mock('../../components/ui/Skeleton', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    MyTicketsScreenSkeleton: () => React.createElement(RN.View, null),
  };
});

jest.mock('../../components/ui/Animations', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    StaggeredItem: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

jest.mock('../../components/illustrations', () => {
  const RN = require('react-native');
  return {
    Searching: () => RN.View,
    Empty: () => RN.View,
    AnimatedIllustration: RN.View,
  };
});

jest.mock('../../components/common/ExportButton', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

import MyTicketsScreen from '../../screens/dashboard/MyTicketsScreen';

describe('MyTicketsScreen — performance', () => {
  // Warmup pour absorber le cout de compilation/require Jest (cold-start ~3-4s)
  beforeAll(() => {
    render(<MyTicketsScreen />);
  });

  beforeEach(() => jest.clearAllMocks());

  it('mounts in less than 600ms (after warmup)', () => {
    const start = performance.now();
    render(<MyTicketsScreen />);
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] MyTicketsScreen mount: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(600);
  });

  it('mounts 10 instances in less than 3000ms (regression check)', () => {
    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      render(<MyTicketsScreen key={i} />);
    }
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] MyTicketsScreen x 10: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(3000);
  });
});
