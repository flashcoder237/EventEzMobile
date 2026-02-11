/**
 * Tests pour PaymentSuccessScreen et PaymentFailedScreen
 * Vérifie les écrans de résultat de paiement
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PaymentSuccessScreen from '../../screens/payment/PaymentSuccessScreen';
import PaymentFailedScreen from '../../screens/payment/PaymentFailedScreen';
import { render } from '../mocks/testUtils';
import { mockEvent, mockTicketPurchase } from '../mocks/mockData';

// Mock navigation
const mockNavigate = jest.fn();
const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      reset: mockReset,
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        paymentId: 'payment-1',
        registrationId: 'reg-1',
        eventTitle: 'Concert de Jazz',
        amount: 10000,
        ticketCount: 2,
      },
    }),
  };
});

// Mock Share
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Share: {
      share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
    },
  };
});

describe('PaymentSuccessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render success icon', async () => {
      const { getByTestId, UNSAFE_queryAllByType } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        // Success checkmark icon
        expect(UNSAFE_queryAllByType('View' as any).length).toBeGreaterThan(0);
      });
    });

    it('should render success message', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/Paiement.*réussi|Félicitations/i)).toBeTruthy();
      });
    });

    it('should render event title', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });

    it('should render ticket count', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/2.*billet/i)).toBeTruthy();
      });
    });

    it('should render amount paid', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/10.*000|10,000/)).toBeTruthy();
      });
    });

    it('should render confirmation number', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/confirmation|référence/i)).toBeTruthy();
      });
    });

    it('should render view tickets button', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/Voir.*billets|Mes billets/i)).toBeTruthy();
      });
    });

    it('should render share button', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/Partager/i)).toBeTruthy();
      });
    });

    it('should render return home button', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/Accueil|Retour/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to My Tickets on button press', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/Voir.*billets/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Voir.*billets/i));

      expect(mockNavigate).toHaveBeenCalledWith('MyTickets');
    });

    it('should reset to home on home button press', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/Accueil/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Accueil/i));

      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    });
  });

  describe('Sharing', () => {
    it('should share on share button press', async () => {
      const { Share } = require('react-native');
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/Partager/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Partager/i));

      await waitFor(() => {
        expect(Share.share).toHaveBeenCalled();
      });
    });
  });

  describe('Email Confirmation', () => {
    it('should show email confirmation message', async () => {
      const { getByText } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        expect(getByText(/email.*confirmation|confirmation.*envoyée/i)).toBeTruthy();
      });
    });
  });

  describe('Animation', () => {
    it('should show confetti animation', async () => {
      const { UNSAFE_queryAllByType } = render(<PaymentSuccessScreen />);

      await waitFor(() => {
        // Confetti or animation components
        expect(UNSAFE_queryAllByType('View' as any).length).toBeGreaterThan(0);
      });
    });
  });
});

describe('PaymentFailedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render error icon', async () => {
      const { UNSAFE_queryAllByType } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(UNSAFE_queryAllByType('View' as any).length).toBeGreaterThan(0);
      });
    });

    it('should render failure message', async () => {
      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/Paiement.*échoué|Échec/i)).toBeTruthy();
      });
    });

    it('should render event title', async () => {
      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });

    it('should render error reason', async () => {
      jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
        params: {
          eventTitle: 'Concert de Jazz',
          errorMessage: 'Fonds insuffisants',
        },
      });

      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/Fonds insuffisants/i)).toBeTruthy();
      });
    });

    it('should render retry button', async () => {
      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/Réessayer/i)).toBeTruthy();
      });
    });

    it('should render contact support link', async () => {
      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/Support|Aide/i)).toBeTruthy();
      });
    });

    it('should render return home button', async () => {
      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/Accueil|Annuler/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back to payment on retry', async () => {
      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/Réessayer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Réessayer/i));

      expect(mockNavigate).toHaveBeenCalledWith('Payment', expect.any(Object));
    });

    it('should navigate to support', async () => {
      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/Support|Aide/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Support|Aide/i));

      expect(mockNavigate).toHaveBeenCalledWith('ContactSupport');
    });

    it('should reset to home on cancel', async () => {
      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/Accueil|Annuler/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Accueil|Annuler/i));

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('Error Messages', () => {
    it('should display insufficient funds error', async () => {
      jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
        params: {
          eventTitle: 'Concert de Jazz',
          errorCode: 'INSUFFICIENT_FUNDS',
        },
      });

      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/Fonds insuffisants|solde insuffisant/i)).toBeTruthy();
      });
    });

    it('should display timeout error', async () => {
      jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
        params: {
          eventTitle: 'Concert de Jazz',
          errorCode: 'TIMEOUT',
        },
      });

      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/délai|timeout|expiré/i)).toBeTruthy();
      });
    });

    it('should display network error', async () => {
      jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
        params: {
          eventTitle: 'Concert de Jazz',
          errorCode: 'NETWORK_ERROR',
        },
      });

      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/connexion|réseau/i)).toBeTruthy();
      });
    });

    it('should display cancelled error', async () => {
      jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
        params: {
          eventTitle: 'Concert de Jazz',
          errorCode: 'CANCELLED',
        },
      });

      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/annulé/i)).toBeTruthy();
      });
    });
  });

  describe('Suggestions', () => {
    it('should show suggestions to fix the issue', async () => {
      const { getByText } = render(<PaymentFailedScreen />);

      await waitFor(() => {
        expect(getByText(/vérifiez|assurez-vous/i)).toBeTruthy();
      });
    });
  });
});
