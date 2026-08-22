/**
 * Tests Jest pour RefundRequestScreen.
 *
 * Couvre :
 *  - rendu : header + référence paiement + options reason
 *  - validation : reason requis (showError si manquant)
 *  - validation : montant > 0 (en mode partiel)
 *  - validation : montant ≤ amount du paiement
 *  - submit OK : showAlert (confirmation) → biometric → refundsAPI.createRefund
 *  - error handling : detail backend remonté via showError
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
  useRoute: () => ({ params: { paymentId: 'pay-1234' } }),
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
// showAlert : (title, message, buttons?, type?). On garde la signature et on
// expose un helper pour exécuter le bouton "Confirmer" automatiquement.
const mockShowAlert = jest.fn(
  (_title: string, _message: string, buttons?: any[], _type?: string) => {
    if (buttons) {
      const confirmBtn = buttons.find((b) => b.text === 'Confirmer');
      if (confirmBtn?.onPress) confirmBtn.onPress();
    }
  },
);
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

const mockGetPayment = jest.fn();
const mockCreateRefund = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  paymentsAPI: {
    getPayment: (...args: any[]) => mockGetPayment(...args),
  },
  refundsAPI: {
    createRefund: (...args: any[]) => mockCreateRefund(...args),
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

import RefundRequestScreen from '../RefundRequestScreen';

const basePayment = {
  id: 'pay-1234',
  amount: 5000,
  currency: 'XAF',
  status: 'completed',
  payment_method: 'mtn_money',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBiometricConfirm.mockResolvedValue(true);
  mockGetPayment.mockResolvedValue({ data: basePayment });
});

describe('RefundRequestScreen', () => {
  it('renders the header + amount card after payment loads', async () => {
    const { findByText } = render(<RefundRequestScreen />);
    expect(await findByText('Réclamer un remb.')).toBeTruthy();
    // Affiche le montant payé (5 000 → "5 000")
    expect(await findByText('5 000')).toBeTruthy();
  });

  it('renders the 5 reason options', async () => {
    const { findByText } = render(<RefundRequestScreen />);
    expect(await findByText('Événement annulé')).toBeTruthy();
    expect(await findByText("Impossible d'y assister")).toBeTruthy();
    expect(await findByText('Paiement en double')).toBeTruthy();
    expect(await findByText('Mauvais événement')).toBeTruthy();
    expect(await findByText('Autre raison')).toBeTruthy();
  });

  it('blocks submit when no reason is selected (button disabled)', async () => {
    const { findByText } = render(<RefundRequestScreen />);
    const submitBtn = await findByText(/Soumettre/i);
    fireEvent.press(submitBtn);

    // Bouton disabled tant que selectedReason est null → pas d'appel
    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  it('submits a full refund with the selected reason', async () => {
    mockCreateRefund.mockResolvedValueOnce({ data: { ok: true } });

    const { findByText } = render(<RefundRequestScreen />);
    fireEvent.press(await findByText('Événement annulé'));

    const submitBtn = await findByText(/Soumettre/i);
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalled(); // confirmation modale
    });
    await waitFor(() => {
      expect(mockBiometricConfirm).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockCreateRefund).toHaveBeenCalledWith({
        payment: 'pay-1234',
        amount: 5000,
        reason: 'Événement annulé',
      });
    });
  });

  it('does NOT call createRefund when biometric confirm is rejected', async () => {
    mockBiometricConfirm.mockResolvedValueOnce(false);
    const { findByText } = render(<RefundRequestScreen />);
    fireEvent.press(await findByText('Événement annulé'));

    fireEvent.press(await findByText(/Soumettre/i));

    await waitFor(() => {
      expect(mockBiometricConfirm).toHaveBeenCalled();
    });
    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  it('shows showError when createRefund fails', async () => {
    mockCreateRefund.mockRejectedValueOnce({
      response: { data: { detail: 'Délai dépassé' } },
    });

    const { findByText } = render(<RefundRequestScreen />);
    fireEvent.press(await findByText('Événement annulé'));
    fireEvent.press(await findByText(/Soumettre/i));

    await waitFor(() => {
      // Le `detail` brut du backend n'est plus affiche tel quel : getApiErrorMessage
      // renvoie un message traduit et actionnable (cf. refactor errorHandling).
      expect(mockShowError).toHaveBeenCalledWith('Erreur', expect.any(String));
    });
  });

  it('rejects partial amount > original amount', async () => {
    const { findByText, getByPlaceholderText } = render(<RefundRequestScreen />);
    fireEvent.press(await findByText('Événement annulé'));
    // Switch to partial mode
    fireEvent.press(await findByText('Remboursement partiel'));

    // Le champ "Montant" apparaît
    const input = getByPlaceholderText('Montant');
    fireEvent.changeText(input, '99999'); // > 5000

    fireEvent.press(await findByText(/Soumettre/i));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Erreur',
        'Le montant ne peut pas dépasser le montant du paiement',
      );
    });
    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  it('rejects partial amount ≤ 0', async () => {
    const { findByText, getByPlaceholderText } = render(<RefundRequestScreen />);
    fireEvent.press(await findByText('Événement annulé'));
    fireEvent.press(await findByText('Remboursement partiel'));

    const input = getByPlaceholderText('Montant');
    fireEvent.changeText(input, '0');

    fireEvent.press(await findByText(/Soumettre/i));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Montant invalide');
    });
    expect(mockCreateRefund).not.toHaveBeenCalled();
  });
});
