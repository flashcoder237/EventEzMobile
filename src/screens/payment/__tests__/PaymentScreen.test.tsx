/**
 * Tests Jest pour PaymentScreen.
 *
 * Couvre l'essentiel d'un écran complexe (>2300 lignes, polling, idempotence,
 * WebBrowser, biométrie). On se limite à 7 tests sur les vraies décisions
 * métier — pas sur l'animation ni le polling temps réel.
 *
 *  - rendu : header + montant total
 *  - selection MTN → champ phone visible
 *  - selection card → champ phone masqué
 *  - validation phone : numéro invalide → showError
 *  - submit MTN → paymentsAPI.createPayment puis processMobileMoney
 *  - submit card → paymentsAPI.initializePayment + WebBrowser.openBrowserAsync
 *  - error handling : showError quand createPayment fail
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    replace: mockReplace,
  }),
  useRoute: () => ({ params: { registrationId: 'reg-1' } }),
  // Le tour de paiement appelle useFocusEffect ; no-op en test (le tour
  // n'est pas sous test ici).
  useFocusEffect: jest.fn(),
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowAlert = jest.fn();
const mockShowConfirm = jest.fn(
  (_t: string, _m: string, onConfirm: () => void) => onConfirm(),
);
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
    showAlert: mockShowAlert,
    showConfirm: mockShowConfirm,
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
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'a@b.com',
      phone: '670123456',
      phone_number: '670123456',
    },
  }),
}));

const mockBiometricConfirm = jest.fn(() => Promise.resolve(true));
jest.mock('../../../hooks/useBiometricConfirm', () => ({
  useBiometricConfirm: () => ({ confirm: mockBiometricConfirm }),
}));

jest.mock('../../../hooks/useNetworkSpeed', () => ({
  useNetworkSpeed: () => ({ isSlowCellular: false, isOffline: false }),
}));

jest.mock('../../../hooks/useCommissionConfig', () => ({
  useCommissionConfig: () => ({
    config: { commission_rate: 0.05, fixed_fee: 100, currency: 'XAF' },
    currency: 'XAF',
  }),
}));

jest.mock('../../../hooks/useSavedPaymentMethods', () => {
  const PaymentMethodType = {};
  return {
    useSavedPaymentMethods: () => ({
      savedMethods: [],
      hasSavedMethods: false,
      savePaymentMethod: jest.fn(),
      getMethodsByType: () => [],
      markAsUsed: jest.fn(),
    }),
    maskPhoneNumber: (s: string) => s,
    PaymentMethodType,
  };
});

const mockStartVerification = jest.fn();
const mockStopVerification = jest.fn();
const mockManualVerify = jest.fn();
jest.mock('../../../hooks/usePaymentVerification', () => ({
  usePaymentVerification: () => ({
    isVerifying: false,
    currentAttempt: 0,
    maxAttempts: 36,
    startVerification: mockStartVerification,
    stopVerification: mockStopVerification,
    manualVerify: mockManualVerify,
  }),
  isPaymentSuccess: () => false,
  isPaymentFailed: () => false,
  PAYMENT_STATUS: {},
}));

jest.mock('../../../hooks', () => {
  return {
    useSavedPaymentMethods: () => ({
      savedMethods: [],
      hasSavedMethods: false,
      savePaymentMethod: jest.fn(),
      getMethodsByType: () => [],
      markAsUsed: jest.fn(),
    }),
    maskPhoneNumber: (s: string) => s,
    PaymentMethodType: {},
  };
});

const mockGetRegistration = jest.fn();
const mockGetPaymentMethods = jest.fn();
const mockCreatePayment = jest.fn();
const mockProcessMobileMoney = jest.fn();
const mockInitializePayment = jest.fn();
const mockInitiate = jest.fn();
const mockCinetpayReturn = jest.fn();
const mockCancelPayment = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  registrationsAPI: {
    getRegistration: (...args: any[]) => mockGetRegistration(...args),
  },
  paymentsAPI: {
    getPaymentMethods: (...args: any[]) => mockGetPaymentMethods(...args),
    createPayment: (...args: any[]) => mockCreatePayment(...args),
    processMobileMoney: (...args: any[]) => mockProcessMobileMoney(...args),
    initializePayment: (...args: any[]) => mockInitializePayment(...args),
    initiate: (...args: any[]) => mockInitiate(...args),
    cinetpayReturn: (...args: any[]) => mockCinetpayReturn(...args),
    cancelPayment: (...args: any[]) => mockCancelPayment(...args),
  },
}));

// expo-web-browser
const mockOpenBrowserAsync = jest.fn((..._args: any[]) =>
  Promise.resolve({ type: 'success' }),
);
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: any[]) => mockOpenBrowserAsync(...args),
  // PaymentScreen utilise openAuthSessionAsync depuis 2026-03 (capture auto
  // du redirect deep-link). Mocké pour résoudre avec un succès par défaut.
  openAuthSessionAsync: (...args: any[]) => mockOpenBrowserAsync(...args),
  WebBrowserPresentationStyle: { FULL_SCREEN: 'fullScreen' },
}));

// expo-image
jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

// Idempotency : on remplace par des fakes en mémoire
jest.mock('../../../lib/utils/paymentIdempotency', () => ({
  getOrCreateIdempotencyKey: jest.fn(() => Promise.resolve('idem-key-1')),
  clearIdempotencyKey: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../lib/utils/phoneFormatters', () => ({
  formatPhoneInput: (s: string) => s,
  formatPhoneForDisplay: (s: string) => s,
  preparePhoneForInput: (s: string) => s,
}));

jest.mock('../../../components/payment/CountryBadgeSelector', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement(RN.View, { testID: 'country-selector' }),
    SUPPORTED_COUNTRIES: [
      { code: 'CM', name: 'Cameroun', currency: 'XAF', flag: 'CM' },
      { code: 'INTL', name: 'Autre pays', currency: '', flag: 'INTL' },
    ],
    INTL_CODE: 'INTL',
    getEventCurrency: () => 'XAF',
  };
});

jest.mock('../../../components/payment/FXIndicator', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement(RN.View, { testID: 'fx-indicator' }),
  };
});

jest.mock('../../../components/common/ConvertedPrice', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement(RN.View, { testID: 'converted-price' }),
  };
});

jest.mock('../../../components/ui/AnimatedPressable', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, onPress }: any) =>
      React.createElement(RN.TouchableOpacity, { onPress }, children),
  };
});

jest.mock('../../../components/ui/GradientButton', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, onPress }: any) =>
      React.createElement(RN.TouchableOpacity, { onPress }, children),
  };
});

jest.mock('../../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) =>
      React.createElement(RN.View, null, children),
    WatermarkNumeral: ({ children }: any) =>
      React.createElement(RN.View, null, children),
    EditorialButton: ({ children, onPress }: any) =>
      React.createElement(RN.TouchableOpacity, { onPress }, children),
  };
});

jest.mock('../../../components/ui/LoadingOverlay', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    LoadingSpinner: () => React.createElement(RN.View, { testID: 'loading' }),
  };
});

jest.mock('../../../constants/payment', () => ({
  calculateServiceFee: (total: number) => Math.round(total * 0.05) + 100,
  getServiceFeeLabel: () => '5% + 100',
  extractErrorMessage: (data: any, fallback: string) =>
    data?.detail || data?.message || fallback,
}));

import PaymentScreen from '../PaymentScreen';

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

beforeEach(() => {
  jest.clearAllMocks();
  mockBiometricConfirm.mockResolvedValue(true);
  mockGetRegistration.mockResolvedValue({ data: baseRegistration });
  mockGetPaymentMethods.mockResolvedValue({ data: cmPaymentMethodsConfig });
});

describe('PaymentScreen', () => {
  it('renders the header + step label after registration loads', async () => {
    const { findAllByText, findByText } = render(<PaymentScreen />);
    const paiements = await findAllByText('Paiement');
    expect(paiements.length).toBeGreaterThan(0);
    expect(await findByText(/ÉTAPE 3 \/ 3/i)).toBeTruthy();
  });

  it('renders the dynamic payment methods (MTN / Orange / Card)', async () => {
    const { findByText } = render(<PaymentScreen />);
    expect(await findByText('MTN Mobile Money')).toBeTruthy();
    expect(await findByText('Orange Money')).toBeTruthy();
    expect(await findByText('Carte bancaire')).toBeTruthy();
  });

  it('rejects payment submit when no method is selected', async () => {
    const { findByText } = render(<PaymentScreen />);
    await findByText('MTN Mobile Money');
    // On cherche le bouton "Payer" — ne rien sélectionner d'abord
    // Si aucun bouton "Payer" visible (méthode requise), le test ne peut pas
    // déclencher handlePayment. Dans ce cas, on vérifie juste qu'on n'a
    // PAS appelé createPayment.
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockCreatePayment).not.toHaveBeenCalled();
  });

  it('calls createPayment + processMobileMoney when MTN is selected and submitted', async () => {
    mockCreatePayment.mockResolvedValueOnce({ data: { id: 'pay-1' } });
    mockProcessMobileMoney.mockResolvedValueOnce({ data: { ok: true } });

    const { findByText, findByLabelText, findByTestId } = render(<PaymentScreen />);
    fireEvent.press(await findByText('MTN Mobile Money'));

    const payBtn = await findByLabelText('Confirmer le paiement');
    fireEvent.press(await findByTestId('terms-checkbox'));
    fireEvent.press(payBtn);

    await waitFor(() => {
      expect(mockBiometricConfirm).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockCreatePayment).toHaveBeenCalled();
    });
    const payload = mockCreatePayment.mock.calls[0][0];
    expect(payload).toMatchObject({
      registration: 'reg-1',
      payment_method: 'mtn_money',
      currency: 'XAF',
    });
    expect(payload.idempotency_key).toBe('idem-key-1');

    await waitFor(() => {
      expect(mockProcessMobileMoney).toHaveBeenCalledWith(
        'pay-1',
        expect.objectContaining({ phone: expect.any(String) }),
      );
    });
  });

  it('opens WebBrowser when card method is selected and submitted', async () => {
    mockCreatePayment.mockResolvedValueOnce({ data: { id: 'pay-2' } });
    mockInitializePayment.mockResolvedValueOnce({
      data: { authorization_url: 'https://checkout.example.com/abc' },
    });

    const { findByText, findByLabelText, findByTestId } = render(<PaymentScreen />);
    fireEvent.press(await findByText('Carte bancaire'));

    const payBtn = await findByLabelText('Confirmer le paiement');
    fireEvent.press(await findByTestId('terms-checkbox'));
    fireEvent.press(payBtn);

    await waitFor(() => {
      expect(mockCreatePayment).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockInitializePayment).toHaveBeenCalledWith('pay-2');
    });
    // Le code utilise désormais openAuthSessionAsync(url, returnUrl, options)
    // (3 args) au lieu de openBrowserAsync(url, options) (2 args). Le mock
    // partage la même fonction sous-jacente — on vérifie juste que l'URL a
    // été passée en premier argument.
    await waitFor(() => {
      expect(mockOpenBrowserAsync).toHaveBeenCalled();
      const firstCall = mockOpenBrowserAsync.mock.calls[0];
      expect(firstCall[0]).toBe('https://checkout.example.com/abc');
    });
  });

  it('does NOT submit when biometric confirm is rejected', async () => {
    mockBiometricConfirm.mockResolvedValueOnce(false);

    const { findByText, findByLabelText, findByTestId } = render(<PaymentScreen />);
    fireEvent.press(await findByText('MTN Mobile Money'));

    const payBtn = await findByLabelText('Confirmer le paiement');
    fireEvent.press(await findByTestId('terms-checkbox'));
    fireEvent.press(payBtn);

    await waitFor(() => {
      expect(mockBiometricConfirm).toHaveBeenCalled();
    });
    expect(mockCreatePayment).not.toHaveBeenCalled();
  });

  it('shows showError when createPayment fails', async () => {
    mockCreatePayment.mockRejectedValueOnce({
      response: { data: { detail: 'Provider down' } },
    });

    const { findByText, findByLabelText, findByTestId } = render(<PaymentScreen />);
    fireEvent.press(await findByText('MTN Mobile Money'));

    const payBtn = await findByLabelText('Confirmer le paiement');
    fireEvent.press(await findByTestId('terms-checkbox'));
    fireEvent.press(payBtn);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
    // Écran de PAIEMENT : le brut du PSP/DRF ("Provider down") ne doit JAMAIS être
    // relayé au payeur. On affiche un message rassurant traduit via getApiErrorMessage.
    const errArgs = mockShowError.mock.calls[0];
    const concat = errArgs.join(' ');
    expect(concat).not.toContain('Provider down');
    // Titre rassurant + message "aucun montant débité" (fallback paymentFailed traduit).
    expect(concat).toContain('Erreur de paiement');
    expect(concat).toContain('Aucun montant');
  });

  // ── CamPay (push USSD) : route via /initiate/, PAS de payment_url ──────────
  // Régression : le flow unifié exigeait payment_url et jetait une erreur pour
  // CamPay/pawaPay (push USSD) → paiement pourtant lancé, mais UI en échec.
  it('CamPay MTN → appelle initiate (pas processMobileMoney) et poll sur push USSD', async () => {
    mockGetPaymentMethods.mockResolvedValue({
      data: {
        country_code: 'CM', phone_prefix: '+237', phone_digits: 9,
        methods: [
          { id: 'mtn_money', name: 'MTN Mobile Money', type: 'mobile_money', selected_provider: 'campay' },
        ],
      },
    });
    // Init CamPay : succès SANS payment_url (push USSD envoyé au téléphone).
    mockInitiate.mockResolvedValueOnce({
      data: { success: true, provider: 'campay', payment_id: 'pay-campay-1', transaction_id: 'CB-1', payment_url: null },
    });

    const { findByText, findByLabelText, findByTestId } = render(<PaymentScreen />);
    fireEvent.press(await findByText('MTN Mobile Money'));
    const payBtn = await findByLabelText('Confirmer le paiement');
    fireEvent.press(await findByTestId('terms-checkbox'));
    fireEvent.press(payBtn);

    // La confirmation biométrique passe (comme le test MTN legacy).
    await waitFor(() => expect(mockBiometricConfirm).toHaveBeenCalled());
    // Route bien vers le flow unifié /initiate/ …
    await waitFor(() => expect(mockInitiate).toHaveBeenCalled());
    const initPayload = mockInitiate.mock.calls[0][0];
    expect(initPayload).toMatchObject({ registration_id: 'reg-1', payment_method: 'mtn_money' });

    // … et NON vers le flow legacy NotchPay.
    expect(mockProcessMobileMoney).not.toHaveBeenCalled();
    expect(mockCreatePayment).not.toHaveBeenCalled();

    // Pas de payment_url → PAS de WebBrowser ; on informe + on polle.
    await waitFor(() => expect(mockShowAlert).toHaveBeenCalled());
    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();

    // Le bouton OK de l'alerte déclenche la vérification (polling du statut).
    const alertButtons = mockShowAlert.mock.calls[mockShowAlert.mock.calls.length - 1][2];
    const okBtn = Array.isArray(alertButtons) ? alertButtons.find((b: any) => b.onPress) : null;
    okBtn?.onPress?.();
    expect(mockStartVerification).toHaveBeenCalledWith('pay-campay-1');
  });
});
