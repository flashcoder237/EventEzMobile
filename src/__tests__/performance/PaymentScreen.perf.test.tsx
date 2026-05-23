/**
 * Tests de performance — PaymentScreen.
 *
 * PaymentScreen (~2300 lignes) :
 *  - 6 hooks custom (biometric, network, commission, savedMethods, verification)
 *  - polling paymentsAPI
 *  - WebBrowser pour cards
 *  - FXIndicator + ConvertedPrice + CountryBadgeSelector
 *
 * Mocks empruntes au test fonctionnel PaymentScreen.test.tsx.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
  }),
  useRoute: () => ({ params: { registrationId: 'reg-1' } }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showAlert: jest.fn(),
    showConfirm: jest.fn(),
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

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'a@b.com', phone: '670123456', phone_number: '670123456' },
  }),
}));

jest.mock('../../hooks/useBiometricConfirm', () => ({
  useBiometricConfirm: () => ({ confirm: () => Promise.resolve(true) }),
}));

jest.mock('../../hooks/useNetworkSpeed', () => ({
  useNetworkSpeed: () => ({ isSlowCellular: false, isOffline: false }),
}));

jest.mock('../../hooks/useCommissionConfig', () => ({
  useCommissionConfig: () => ({
    config: { commission_rate: 0.05, fixed_fee: 100, currency: 'XAF' },
    currency: 'XAF',
  }),
}));

jest.mock('../../hooks/useSavedPaymentMethods', () => ({
  useSavedPaymentMethods: () => ({
    savedMethods: [],
    hasSavedMethods: false,
    savePaymentMethod: jest.fn(),
    getMethodsByType: () => [],
    markAsUsed: jest.fn(),
  }),
  maskPhoneNumber: (s: string) => s,
  PaymentMethodType: {},
}));

jest.mock('../../hooks/usePaymentVerification', () => ({
  usePaymentVerification: () => ({
    isVerifying: false,
    currentAttempt: 0,
    maxAttempts: 36,
    startVerification: jest.fn(),
    stopVerification: jest.fn(),
    manualVerify: jest.fn(),
  }),
  isPaymentSuccess: () => false,
  isPaymentFailed: () => false,
  PAYMENT_STATUS: {},
}));

jest.mock('../../hooks', () => ({
  useSavedPaymentMethods: () => ({
    savedMethods: [],
    hasSavedMethods: false,
    savePaymentMethod: jest.fn(),
    getMethodsByType: () => [],
    markAsUsed: jest.fn(),
  }),
  maskPhoneNumber: (s: string) => s,
  PaymentMethodType: {},
}));

const baseRegistration = {
  id: 'reg-1',
  status: 'pending',
  registration_type: 'billetterie',
  event: {
    id: 'evt-1',
    title: 'Festival Indie',
    event_type: 'billetterie',
    location_country_code: 'CM',
    currency: 'XAF',
    fee_bearer: 'participant',
  },
  tickets: [
    {
      id: 't1',
      total_price: 5000,
      unit_price: 5000,
      quantity: 1,
      ticket_type_name: 'Pass Standard',
    },
  ],
};

const cmPaymentMethodsConfig = {
  country_code: 'CM',
  phone_prefix: '+237',
  phone_digits: 9,
  methods: [
    { id: 'mtn_money', name: 'MTN Mobile Money', type: 'mobile_money' },
    { id: 'orange_money', name: 'Orange Money', type: 'mobile_money' },
    { id: 'credit_card', name: 'Carte bancaire', type: 'card' },
  ],
};

jest.mock('../../api', () => ({
  __esModule: true,
  registrationsAPI: {
    getRegistration: () => Promise.resolve({ data: baseRegistration }),
  },
  paymentsAPI: {
    getPaymentMethods: () => Promise.resolve({ data: cmPaymentMethodsConfig }),
    createPayment: jest.fn(() => Promise.resolve({ data: { id: 'pay-1' } })),
    processMobileMoney: jest.fn(() => Promise.resolve({ data: {} })),
    initializePayment: jest.fn(() => Promise.resolve({ data: {} })),
    cancelPayment: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'success' })),
  WebBrowserPresentationStyle: { FULL_SCREEN: 'fullScreen' },
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('../../lib/utils/paymentIdempotency', () => ({
  getOrCreateIdempotencyKey: jest.fn(() => Promise.resolve('idem-key-1')),
  clearIdempotencyKey: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../lib/utils/phoneFormatters', () => ({
  formatPhoneInput: (s: string) => s,
  formatPhoneForDisplay: (s: string) => s,
  preparePhoneForInput: (s: string) => s,
}));

jest.mock('../../components/payment/CountryBadgeSelector', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement(RN.View, null),
    SUPPORTED_COUNTRIES: [
      { code: 'CM', name: 'Cameroun', currency: 'XAF', flag: 'CM' },
      { code: 'INTL', name: 'Autre pays', currency: '', flag: 'INTL' },
    ],
    INTL_CODE: 'INTL',
    getEventCurrency: () => 'XAF',
  };
});

jest.mock('../../components/payment/FXIndicator', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

jest.mock('../../components/common/ConvertedPrice', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

jest.mock('../../components/ui/AnimatedPressable', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, onPress }: any) =>
      React.createElement(RN.TouchableOpacity, { onPress }, children),
  };
});

jest.mock('../../components/ui/GradientButton', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, onPress }: any) =>
      React.createElement(RN.TouchableOpacity, { onPress }, children),
  };
});

jest.mock('../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) => React.createElement(RN.View, null, children),
    WatermarkNumeral: ({ children }: any) => React.createElement(RN.View, null, children),
    EditorialButton: ({ children, onPress }: any) =>
      React.createElement(RN.TouchableOpacity, { onPress }, children),
  };
});

jest.mock('../../components/ui/LoadingOverlay', () => {
  const RN = require('react-native');
  const React = require('react');
  return { LoadingSpinner: () => React.createElement(RN.View, null) };
});

jest.mock('../../constants/payment', () => ({
  calculateServiceFee: (total: number) => Math.round(total * 0.05) + 100,
  getServiceFeeLabel: () => '5% + 100',
  extractErrorMessage: (data: any, fallback: string) =>
    data?.detail || data?.message || fallback,
}));

import PaymentScreen from '../../screens/payment/PaymentScreen';

describe('PaymentScreen — performance', () => {
  // Warmup pour absorber le cout de compilation/require Jest (cold-start ~3-4s)
  beforeAll(() => {
    render(<PaymentScreen />);
  });

  beforeEach(() => jest.clearAllMocks());

  it('mounts in less than 800ms (after warmup)', () => {
    const start = performance.now();
    render(<PaymentScreen />);
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] PaymentScreen mount: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(800);
  });

  it('mounts 5 instances in less than 3000ms (regression check)', () => {
    const start = performance.now();
    for (let i = 0; i < 5; i++) {
      render(<PaymentScreen key={i} />);
    }
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] PaymentScreen x 5: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(3000);
  });
});
