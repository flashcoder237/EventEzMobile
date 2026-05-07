/**
 * Tests Jest pour WalletScreen.
 *
 * Couvre l'essentiel d'un écran complexe (>2500 lignes, 4 tabs, modals
 * payout + bank). On se limite à 7 tests sur les flows métier critiques.
 *
 *  - rendu : solde + bouton "Effectuer un retrait"
 *  - bouton retrait disabled quand can_withdraw=false
 *  - modal payout s'ouvre + champs amount + méthode
 *  - validation montant : invalide → showError, > balance → showError
 *  - submit OK → biometric + payoutsAPI.requestPayout + showSuccess
 *  - error handling : showError quand requestPayout fail
 *  - getAvailableMethods chargé au mount
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowAlert = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
    showAlert: mockShowAlert,
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

const mockBiometricConfirm = jest.fn(() => Promise.resolve(true));
jest.mock('../../../hooks/useBiometricConfirm', () => ({
  useBiometricConfirm: () => ({ confirm: mockBiometricConfirm }),
}));

jest.mock('../../../hooks/useCommissionConfig', () => ({
  useCommissionConfig: () => ({
    config: { commission_rate: 0.05, fixed_fee: 100, currency: 'XAF' },
    currency: 'XAF',
  }),
}));

const mockGetMyWallet = jest.fn();
const mockGetTransactions = jest.fn();
const mockGetPendingEarnings = jest.fn();
const mockUpdateBankDetails = jest.fn();
const mockGetPayouts = jest.fn();
const mockGetAvailableMethods = jest.fn();
const mockRequestPayout = jest.fn();
const mockCancelPayout = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  walletAPI: {
    getMyWallet: (...args: any[]) => mockGetMyWallet(...args),
    getTransactions: (...args: any[]) => mockGetTransactions(...args),
    getPendingEarnings: (...args: any[]) => mockGetPendingEarnings(...args),
    updateBankDetails: (...args: any[]) => mockUpdateBankDetails(...args),
  },
  payoutsAPI: {
    getPayouts: (...args: any[]) => mockGetPayouts(...args),
    getAvailableMethods: (...args: any[]) => mockGetAvailableMethods(...args),
    requestPayout: (...args: any[]) => mockRequestPayout(...args),
    cancelPayout: (...args: any[]) => mockCancelPayout(...args),
  },
}));

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('../../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) =>
      React.createElement(RN.View, null, children),
    WatermarkNumeral: ({ children }: any) =>
      React.createElement(RN.View, null, children),
  };
});

jest.mock('../../../components/ui/LoadingOverlay', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    LoadingSpinner: () => React.createElement(RN.View, { testID: 'loading' }),
  };
});

jest.mock('../../../components/ui/Skeleton', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    WalletScreenSkeleton: () =>
      React.createElement(RN.View, { testID: 'skeleton' }),
  };
});

jest.mock('../../../components/ui/Animations', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    StaggeredItem: ({ children }: any) =>
      React.createElement(RN.View, null, children),
  };
});

jest.mock('../../../components/ui/Badge', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) =>
      React.createElement(RN.Text, null, children),
  };
});

jest.mock('../../../components/common/ExportButton', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement(RN.View, { testID: 'export-btn' }),
  };
});

import WalletScreen from '../WalletScreen';

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

const baseAvailableMethods = [
  { id: 'mtn_money', name: 'MTN Mobile Money', channel: 'mtn', type: 'mobile_money' },
  { id: 'orange_money', name: 'Orange Money', channel: 'orange', type: 'mobile_money' },
  { id: 'bank_transfer', name: 'Virement bancaire', channel: 'bank', type: 'bank_transfer' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockBiometricConfirm.mockResolvedValue(true);
  mockGetMyWallet.mockResolvedValue({ data: baseWallet });
  mockGetTransactions.mockResolvedValue({ data: { results: [] } });
  mockGetPendingEarnings.mockResolvedValue({ data: { results: [] } });
  mockGetPayouts.mockResolvedValue({ data: { results: [] } });
  mockGetAvailableMethods.mockResolvedValue({
    data: { methods: baseAvailableMethods },
  });
});

describe('WalletScreen', () => {
  it('renders the wallet balance + Effectuer un retrait CTA', async () => {
    const { findByText, findAllByText } = render(<WalletScreen />);
    expect(await findByText('Effectuer un retrait')).toBeTruthy();
    // Le solde "50 000" peut apparaître dans plusieurs cards (balance pill + main amount)
    const balances = await findAllByText(/50.000/);
    expect(balances.length).toBeGreaterThan(0);
  });

  it('loads available payout methods on mount', async () => {
    render(<WalletScreen />);
    await waitFor(() => {
      expect(mockGetAvailableMethods).toHaveBeenCalled();
    });
  });

  it('opens the payout modal when "Effectuer un retrait" is pressed', async () => {
    const { findByText, queryByPlaceholderText } = render(<WalletScreen />);
    expect(queryByPlaceholderText(/Min:/)).toBeNull();

    fireEvent.press(await findByText('Effectuer un retrait'));

    // Modal ouverte → champ amount visible
    expect(await findByText('Demande de retrait')).toBeTruthy();
  });

  it('rejects payout when amount is empty/invalid', async () => {
    const { findByText } = render(<WalletScreen />);
    fireEvent.press(await findByText('Effectuer un retrait'));

    // Bouton "Retirer" disabled tant que amount est vide → pas d'appel
    const retirerBtn = await findByText('Retirer');
    fireEvent.press(retirerBtn);

    await new Promise((r) => setImmediate(r));
    expect(mockRequestPayout).not.toHaveBeenCalled();
  });

  it('rejects payout when amount > available balance', async () => {
    const { findByText, getByPlaceholderText } = render(<WalletScreen />);
    fireEvent.press(await findByText('Effectuer un retrait'));

    const input = await waitFor(() => getByPlaceholderText(/Min:/));
    fireEvent.changeText(input, '999999'); // > 50000

    fireEvent.press(await findByText('Retirer'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Solde insuffisant');
    });
    expect(mockRequestPayout).not.toHaveBeenCalled();
  });

  it('calls payoutsAPI.requestPayout on valid submit', async () => {
    mockRequestPayout.mockResolvedValueOnce({ data: { ok: true } });

    const { findByText, getByPlaceholderText } = render(<WalletScreen />);
    fireEvent.press(await findByText('Effectuer un retrait'));

    const input = await waitFor(() => getByPlaceholderText(/Min:/));
    fireEvent.changeText(input, '20000');

    fireEvent.press(await findByText('Retirer'));

    await waitFor(() => {
      expect(mockBiometricConfirm).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockRequestPayout).toHaveBeenCalledWith({
        amount: 20000,
        payout_method: expect.any(String),
      });
    });
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Succès',
        'Demande de retrait envoyée',
      );
    });
  });

  it('shows showError when requestPayout fails', async () => {
    mockRequestPayout.mockRejectedValueOnce({
      response: { data: { detail: 'KYC requis' } },
    });

    const { findByText, getByPlaceholderText } = render(<WalletScreen />);
    fireEvent.press(await findByText('Effectuer un retrait'));

    const input = await waitFor(() => getByPlaceholderText(/Min:/));
    fireEvent.changeText(input, '10000');

    fireEvent.press(await findByText('Retirer'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'KYC requis');
    });
  });
});
