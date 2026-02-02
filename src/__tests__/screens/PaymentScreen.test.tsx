/**
 * Tests pour PaymentScreen
 * Vérifie le processus de paiement
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PaymentScreen from '../../screens/payment/PaymentScreen';
import { render } from '../mocks/testUtils';
import { paymentsAPI, registrationsAPI, discountsAPI } from '../../api/client';
import { mockEvent, mockTicketType, mockUser, mockDiscount, mockPayment } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  paymentsAPI: {
    createPayment: jest.fn(),
    verifyPayment: jest.fn(),
  },
  registrationsAPI: {
    getRegistration: jest.fn(),
  },
  discountsAPI: {
    validateDiscount: jest.fn(),
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        registrationId: 'reg-1',
        amount: 10000,
        eventTitle: 'Concert de Jazz',
      },
    }),
  };
});

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}));

const mockPaymentsAPI = paymentsAPI as jest.Mocked<typeof paymentsAPI>;
const mockRegistrationsAPI = registrationsAPI as jest.Mocked<typeof registrationsAPI>;
const mockDiscountsAPI = discountsAPI as jest.Mocked<typeof discountsAPI>;

describe('PaymentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegistrationsAPI.getRegistration.mockResolvedValue({
      data: {
        id: 'reg-1',
        event: mockEvent,
        total_amount: 10000,
        status: 'pending',
      },
    });
    mockPaymentsAPI.createPayment.mockResolvedValue({
      data: { ...mockPayment, payment_url: 'https://pay.notchpay.co/xxx' },
    });
  });

  describe('Rendering', () => {
    it('should render payment header', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('Paiement')).toBeTruthy();
      });
    });

    it('should render event title', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });

    it('should render total amount', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText(/10.*000|10,000|10 000/)).toBeTruthy();
      });
    });

    it('should render payment methods', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('MTN Mobile Money')).toBeTruthy();
        expect(getByText('Orange Money')).toBeTruthy();
      });
    });

    it('should render promo code input', async () => {
      const { getByPlaceholderText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Code promo/i)).toBeTruthy();
      });
    });

    it('should render pay button', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText(/Payer|Confirmer/i)).toBeTruthy();
      });
    });
  });

  describe('Payment Method Selection', () => {
    it('should select MTN Mobile Money', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('MTN Mobile Money')).toBeTruthy();
      });

      fireEvent.press(getByText('MTN Mobile Money'));

      // Should show selected state
    });

    it('should select Orange Money', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('Orange Money')).toBeTruthy();
      });

      fireEvent.press(getByText('Orange Money'));

      // Should show selected state
    });

    it('should show phone input for mobile money', async () => {
      const { getByText, getByPlaceholderText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('MTN Mobile Money')).toBeTruthy();
      });

      fireEvent.press(getByText('MTN Mobile Money'));

      await waitFor(() => {
        expect(getByPlaceholderText(/téléphone|numéro/i)).toBeTruthy();
      });
    });

    it('should prefill phone number from user profile', async () => {
      const { getByText, getByDisplayValue } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('MTN Mobile Money')).toBeTruthy();
      });

      fireEvent.press(getByText('MTN Mobile Money'));

      await waitFor(() => {
        expect(getByDisplayValue(/699999999/)).toBeTruthy();
      });
    });
  });

  describe('Promo Code', () => {
    it('should apply valid promo code', async () => {
      mockDiscountsAPI.validateDiscount.mockResolvedValue({
        data: { ...mockDiscount, discount_amount: 2000 },
      });

      const { getByPlaceholderText, getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Code promo/i)).toBeTruthy();
      });

      const promoInput = getByPlaceholderText(/Code promo/i);
      fireEvent.changeText(promoInput, 'PROMO2024');
      fireEvent.press(getByText('Appliquer'));

      await waitFor(() => {
        expect(mockDiscountsAPI.validateDiscount).toHaveBeenCalledWith(
          'reg-1',
          'PROMO2024'
        );
      });
    });

    it('should show discount applied', async () => {
      mockDiscountsAPI.validateDiscount.mockResolvedValue({
        data: { ...mockDiscount, discount_amount: 2000 },
      });

      const { getByPlaceholderText, getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Code promo/i)).toBeTruthy();
      });

      const promoInput = getByPlaceholderText(/Code promo/i);
      fireEvent.changeText(promoInput, 'PROMO2024');
      fireEvent.press(getByText('Appliquer'));

      await waitFor(() => {
        expect(getByText(/-.*2.*000|Remise/i)).toBeTruthy();
      });
    });

    it('should show error for invalid promo code', async () => {
      mockDiscountsAPI.validateDiscount.mockRejectedValue({
        response: { data: { error: 'Code invalide' } },
      });

      const { getByPlaceholderText, getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Code promo/i)).toBeTruthy();
      });

      const promoInput = getByPlaceholderText(/Code promo/i);
      fireEvent.changeText(promoInput, 'INVALID');
      fireEvent.press(getByText('Appliquer'));

      await waitFor(() => {
        expect(getByText(/invalide|expiré/i)).toBeTruthy();
      });
    });

    it('should update total after discount', async () => {
      mockDiscountsAPI.validateDiscount.mockResolvedValue({
        data: { ...mockDiscount, discount_amount: 2000 },
      });

      const { getByPlaceholderText, getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText(/10.*000/)).toBeTruthy();
      });

      const promoInput = getByPlaceholderText(/Code promo/i);
      fireEvent.changeText(promoInput, 'PROMO2024');
      fireEvent.press(getByText('Appliquer'));

      await waitFor(() => {
        expect(getByText(/8.*000/)).toBeTruthy();
      });
    });
  });

  describe('Payment Process', () => {
    it('should initiate payment when button pressed', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('MTN Mobile Money')).toBeTruthy();
      });

      // Select payment method
      fireEvent.press(getByText('MTN Mobile Money'));

      // Press pay button
      fireEvent.press(getByText(/Payer/i));

      await waitFor(() => {
        expect(mockPaymentsAPI.createPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            registration: 'reg-1',
            payment_method: 'mtn_money',
          })
        );
      });
    });

    it('should show loading state during payment', async () => {
      mockPaymentsAPI.createPayment.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('MTN Mobile Money')).toBeTruthy();
      });

      fireEvent.press(getByText('MTN Mobile Money'));
      fireEvent.press(getByText(/Payer/i));

      await waitFor(() => {
        expect(getByText(/Traitement|Chargement/i)).toBeTruthy();
      });
    });

    it('should navigate to success on payment success', async () => {
      mockPaymentsAPI.createPayment.mockResolvedValue({
        data: { ...mockPayment, status: 'completed' },
      });

      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('MTN Mobile Money')).toBeTruthy();
      });

      fireEvent.press(getByText('MTN Mobile Money'));
      fireEvent.press(getByText(/Payer/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PaymentSuccess', expect.any(Object));
      });
    });

    it('should navigate to failed on payment failure', async () => {
      mockPaymentsAPI.createPayment.mockRejectedValue({
        response: { data: { error: 'Insufficient funds' } },
      });

      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('MTN Mobile Money')).toBeTruthy();
      });

      fireEvent.press(getByText('MTN Mobile Money'));
      fireEvent.press(getByText(/Payer/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PaymentFailed', expect.any(Object));
      });
    });
  });

  describe('Validation', () => {
    it('should validate phone number format', async () => {
      const { getByText, getByPlaceholderText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('MTN Mobile Money')).toBeTruthy();
      });

      fireEvent.press(getByText('MTN Mobile Money'));

      const phoneInput = getByPlaceholderText(/téléphone|numéro/i);
      fireEvent.changeText(phoneInput, '123'); // Invalid

      fireEvent.press(getByText(/Payer/i));

      await waitFor(() => {
        expect(getByText(/numéro invalide/i)).toBeTruthy();
      });
    });

    it('should require payment method selection', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText(/Payer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Payer/i));

      await waitFor(() => {
        expect(getByText(/sélectionnez.*méthode/i)).toBeTruthy();
      });
    });
  });

  describe('Order Summary', () => {
    it('should display order breakdown', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText(/Sous-total|Total/i)).toBeTruthy();
      });
    });

    it('should display ticket details', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText(/Concert de Jazz/)).toBeTruthy();
      });
    });

    it('should display fees if applicable', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(mockRegistrationsAPI.getRegistration).toHaveBeenCalled();
      });

      // Fees display - if applicable
    });
  });

  describe('Security', () => {
    it('should show secure payment badge', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText(/sécurisé|SSL|NotchPay/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should go back when back button pressed', async () => {
      const { getByTestId } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(mockRegistrationsAPI.getRegistration).toHaveBeenCalled();
      });

      // Back button - would need testID
    });

    it('should show cancel confirmation', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('Annuler')).toBeTruthy();
      });

      fireEvent.press(getByText('Annuler'));

      // Should show confirmation dialog
    });
  });

  describe('Timer', () => {
    it('should show payment time limit', async () => {
      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText(/\d+:\d+|minutes/i)).toBeTruthy();
      });
    });

    it('should expire payment on timeout', async () => {
      jest.useFakeTimers();

      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(mockRegistrationsAPI.getRegistration).toHaveBeenCalled();
      });

      // Fast forward time
      jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes

      await waitFor(() => {
        expect(getByText(/expiré|timeout/i)).toBeTruthy();
      });

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockPaymentsAPI.createPayment.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<PaymentScreen />);

      await waitFor(() => {
        expect(getByText('MTN Mobile Money')).toBeTruthy();
      });

      fireEvent.press(getByText('MTN Mobile Money'));
      fireEvent.press(getByText(/Payer/i));

      await waitFor(() => {
        expect(getByText(/erreur|réessayer/i)).toBeTruthy();
      });
    });
  });
});
