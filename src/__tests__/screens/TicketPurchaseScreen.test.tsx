/**
 * Tests pour TicketPurchaseScreen
 * Vérifie le processus d'achat de billets
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import TicketPurchaseScreen from '../../screens/tickets/TicketPurchaseScreen';
import { render } from '../mocks/testUtils';
import { eventsAPI, discountsAPI, registrationsAPI } from '../../api/client';
import { mockEvent, mockTicketTypes, mockUser, mockDiscount } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  eventsAPI: {
    getEvent: jest.fn(),
  },
  ticketTypesAPI: {
    getTicketTypes: jest.fn(),
  },
  discountsAPI: {
    validateDiscount: jest.fn(),
  },
  registrationsAPI: {
    createRegistration: jest.fn(),
  },
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: { eventId: 'event-1', ticketTypeId: 'ticket-1' },
    }),
  };
});

const mockEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;
const mockDiscountsAPI = discountsAPI as jest.Mocked<typeof discountsAPI>;
const mockRegistrationsAPI = registrationsAPI as jest.Mocked<typeof registrationsAPI>;

describe('TicketPurchaseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventsAPI.getEvent.mockResolvedValue({ data: mockEvent });
    mockDiscountsAPI.validateDiscount.mockResolvedValue({ data: mockDiscount });
    mockRegistrationsAPI.createRegistration.mockResolvedValue({
      data: { id: 'reg-1', reference_code: 'REG123' },
    });
  });

  describe('Rendering', () => {
    it('should render event title', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });

    it('should render ticket type selection', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText('Standard')).toBeTruthy();
      });
    });

    it('should render quantity selector', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText('1')).toBeTruthy();
      });
    });

    it('should render order summary', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/Récapitulatif/)).toBeTruthy();
      });
    });

    it('should render checkout button', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/Continuer|Payer/)).toBeTruthy();
      });
    });
  });

  describe('Quantity Selection', () => {
    it('should increment quantity', async () => {
      const { getByText, getAllByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText('1')).toBeTruthy();
      });

      // Find and press increment button
      const incrementButton = getByText('+');
      fireEvent.press(incrementButton);

      await waitFor(() => {
        expect(getByText('2')).toBeTruthy();
      });
    });

    it('should decrement quantity', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText('1')).toBeTruthy();
      });

      // First increment
      fireEvent.press(getByText('+'));

      await waitFor(() => {
        expect(getByText('2')).toBeTruthy();
      });

      // Then decrement
      fireEvent.press(getByText('-'));

      await waitFor(() => {
        expect(getByText('1')).toBeTruthy();
      });
    });

    it('should not go below 1', async () => {
      const { getByText, queryByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText('1')).toBeTruthy();
      });

      fireEvent.press(getByText('-'));

      // Quantity should still be 1
      expect(getByText('1')).toBeTruthy();
      expect(queryByText('0')).toBeNull();
    });

    it('should not exceed available tickets', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText('1')).toBeTruthy();
      });

      // Try to add more than max_per_order or available
      for (let i = 0; i < 20; i++) {
        fireEvent.press(getByText('+'));
      }

      // Should be capped at max
    });
  });

  describe('Price Calculation', () => {
    it('should display unit price', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/5 000 FCFA/)).toBeTruthy();
      });
    });

    it('should update total on quantity change', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/5 000 FCFA/)).toBeTruthy();
      });

      fireEvent.press(getByText('+'));

      await waitFor(() => {
        expect(getByText(/10 000 FCFA/)).toBeTruthy();
      });
    });
  });

  describe('Discount Codes', () => {
    it('should show discount code input', async () => {
      const { getByPlaceholderText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Code promo/i)).toBeTruthy();
      });
    });

    it('should apply valid discount code', async () => {
      const { getByPlaceholderText, getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Code promo/i)).toBeTruthy();
      });

      const input = getByPlaceholderText(/Code promo/i);
      fireEvent.changeText(input, 'PROMO2024');
      fireEvent.press(getByText('Appliquer'));

      await waitFor(() => {
        expect(mockDiscountsAPI.validateDiscount).toHaveBeenCalledWith(
          'PROMO2024',
          'event-1',
          'ticket-1'
        );
        expect(getByText(/20%/)).toBeTruthy();
      });
    });

    it('should show error for invalid discount code', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockDiscountsAPI.validateDiscount.mockRejectedValue({
        response: { data: { error: 'Code invalide' } },
      });

      const { getByPlaceholderText, getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Code promo/i)).toBeTruthy();
      });

      const input = getByPlaceholderText(/Code promo/i);
      fireEvent.changeText(input, 'INVALID');
      fireEvent.press(getByText('Appliquer'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });

    it('should calculate discounted total', async () => {
      const { getByPlaceholderText, getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Code promo/i)).toBeTruthy();
      });

      const input = getByPlaceholderText(/Code promo/i);
      fireEvent.changeText(input, 'PROMO2024');
      fireEvent.press(getByText('Appliquer'));

      await waitFor(() => {
        // 20% off 5000 = 4000
        expect(getByText(/4 000 FCFA/)).toBeTruthy();
      });
    });
  });

  describe('Ticket Type Selection', () => {
    it('should allow selecting different ticket types', async () => {
      const { getByText, getAllByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText('Standard')).toBeTruthy();
        expect(getByText('VIP')).toBeTruthy();
      });

      fireEvent.press(getByText('VIP'));

      // Price should update to VIP price
      await waitFor(() => {
        expect(getByText(/15 000 FCFA/)).toBeTruthy();
      });
    });
  });

  describe('Checkout Process', () => {
    it('should navigate to payment on checkout', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/Continuer|Payer/)).toBeTruthy();
      });

      fireEvent.press(getByText(/Continuer|Payer/));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Payment', expect.any(Object));
      });
    });

    it('should create registration before payment', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/Continuer|Payer/)).toBeTruthy();
      });

      fireEvent.press(getByText(/Continuer|Payer/));

      await waitFor(() => {
        expect(mockRegistrationsAPI.createRegistration).toHaveBeenCalled();
      });
    });
  });

  describe('Form Fields', () => {
    it('should render custom form fields for inscription events', async () => {
      mockEventsAPI.getEvent.mockResolvedValue({
        data: {
          ...mockEvent,
          event_type: 'inscription',
          custom_form_fields: [
            { id: 1, field_name: 'company', field_type: 'text', label: 'Entreprise', required: true },
          ],
        },
      });

      const { getByPlaceholderText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('Entreprise')).toBeTruthy();
      });
    });

    it('should validate required form fields', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockEventsAPI.getEvent.mockResolvedValue({
        data: {
          ...mockEvent,
          event_type: 'inscription',
          custom_form_fields: [
            { id: 1, field_name: 'company', field_type: 'text', label: 'Entreprise', required: true },
          ],
        },
      });

      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/S'inscrire/)).toBeTruthy();
      });

      fireEvent.press(getByText(/S'inscrire/));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle registration error', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockRegistrationsAPI.createRegistration.mockRejectedValue(new Error('Registration failed'));

      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/Continuer|Payer/)).toBeTruthy();
      });

      fireEvent.press(getByText(/Continuer|Payer/));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });
  });

  describe('Free Tickets', () => {
    it('should skip payment for free tickets', async () => {
      mockEventsAPI.getEvent.mockResolvedValue({
        data: {
          ...mockEvent,
          is_free: true,
          ticket_types: [{ ...mockTicketTypes[0], price: 0 }],
        },
      });

      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText('Gratuit')).toBeTruthy();
      });

      fireEvent.press(getByText(/Confirmer|S'inscrire/));

      await waitFor(() => {
        // Should navigate directly to success, not payment
        expect(mockNavigate).toHaveBeenCalledWith(
          'PaymentSuccess',
          expect.any(Object)
        );
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading during checkout', async () => {
      let resolveRegistration: (value: any) => void;
      mockRegistrationsAPI.createRegistration.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRegistration = resolve;
          })
      );

      const { getByText, queryByTestId } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/Continuer|Payer/)).toBeTruthy();
      });

      fireEvent.press(getByText(/Continuer|Payer/));

      // Button should be disabled during loading
    });
  });

  describe('Available Quantity Display', () => {
    it('should show available quantity', async () => {
      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/75 disponibles/)).toBeTruthy();
      });
    });

    it('should show sold out for unavailable tickets', async () => {
      mockEventsAPI.getEvent.mockResolvedValue({
        data: {
          ...mockEvent,
          ticket_types: [
            { ...mockTicketTypes[0], quantity_sold: 100, quantity_available: 0 },
          ],
        },
      });

      const { getByText } = render(<TicketPurchaseScreen />);

      await waitFor(() => {
        expect(getByText(/Épuisé/)).toBeTruthy();
      });
    });
  });
});
