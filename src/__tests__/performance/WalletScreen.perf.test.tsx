/**
 * Tests de performance — WalletScreen.
 *
 * WalletScreen (~2300 lignes, 4 tabs, modals payout + bank).
 * Mocks empruntes au test fonctionnel WalletScreen.test.tsx.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showAlert: jest.fn(),
  }),
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

jest.mock('../../hooks/useBiometricConfirm', () => ({
  useBiometricConfirm: () => ({ confirm: () => Promise.resolve(true) }),
}));

jest.mock('../../hooks/useCommissionConfig', () => ({
  useCommissionConfig: () => ({
    config: { commission_rate: 0.05, fixed_fee: 100, currency: 'XAF' },
    currency: 'XAF',
  }),
}));

const baseWallet = {
  id: 'wallet-1',
  available_balance: 50000,
  pending_balance: 10000,
  total_earnings: 100000,
  total_withdrawn: 50000,
  minimum_payout: 5000,
  can_withdraw: true,
  currency: 'XAF',
  bank_name: 'Afriland',
  bank_account_name: 'Alice M',
  bank_account_number: '1234567890',
  mobile_money_number: '670123456',
  mobile_money_provider: 'mtn_money',
};

jest.mock('../../api', () => ({
  __esModule: true,
  walletAPI: {
    getMyWallet: () => Promise.resolve({ data: baseWallet }),
    getTransactions: () => Promise.resolve({ data: { results: [] } }),
    getPendingEarnings: () => Promise.resolve({ data: { results: [] } }),
    updateBankDetails: jest.fn(() => Promise.resolve({ data: {} })),
  },
  payoutsAPI: {
    getPayouts: () => Promise.resolve({ data: { results: [] } }),
    getAvailableMethods: () =>
      Promise.resolve({
        data: {
          methods: [
            { id: 'mtn_money', name: 'MTN Mobile Money', channel: 'mtn', type: 'mobile_money' },
          ],
        },
      }),
    requestPayout: jest.fn(() => Promise.resolve({ data: {} })),
    cancelPayout: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) => React.createElement(RN.View, null, children),
    WatermarkNumeral: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

jest.mock('../../components/ui/LoadingOverlay', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    LoadingSpinner: () => React.createElement(RN.View, null),
  };
});

jest.mock('../../components/ui/Skeleton', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    WalletScreenSkeleton: () => React.createElement(RN.View, null),
  };
});

jest.mock('../../components/ui/Animations', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    StaggeredItem: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

jest.mock('../../components/ui/Badge', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => React.createElement(RN.Text, null, children),
  };
});

jest.mock('../../components/common/ExportButton', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

import WalletScreen from '../../screens/organizer/WalletScreen';

describe('WalletScreen — performance', () => {
  // Warmup pour absorber le cout de compilation/require Jest (cold-start ~3-4s)
  beforeAll(() => {
    render(<WalletScreen />);
  });

  beforeEach(() => jest.clearAllMocks());

  it('mounts in less than 800ms (after warmup)', () => {
    const start = performance.now();
    render(<WalletScreen />);
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] WalletScreen mount: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(800);
  });

  it('mounts 5 instances in less than 3000ms (regression check)', () => {
    const start = performance.now();
    for (let i = 0; i < 5; i++) {
      render(<WalletScreen key={i} />);
    }
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] WalletScreen x 5: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(3000);
  });
});
