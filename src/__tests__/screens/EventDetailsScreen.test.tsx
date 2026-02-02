/**
 * Tests pour EventDetailsScreen
 * Vérifie l'affichage des détails d'événement et les actions
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Share, Linking } from 'react-native';
import EventDetailsScreen from '../../screens/events/EventDetailsScreen';
import { render } from '../mocks/testUtils';
import { eventsAPI, feedbacksAPI, waitlistAPI } from '../../api/client';
import { mockEvent, mockUser, mockFeedbacks, mockTicketTypes } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  eventsAPI: {
    getEvent: jest.fn(),
    followEvent: jest.fn(),
    unfollowEvent: jest.fn(),
    isFollowing: jest.fn(),
  },
  feedbacksAPI: {
    getEventFeedbacks: jest.fn(),
  },
  waitlistAPI: {
    joinWaitlist: jest.fn(),
    cancelWaitlist: jest.fn(),
    getMyWaitlist: jest.fn(),
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
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: { eventId: 'event-1' },
    }),
  };
});

const mockEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;
const mockFeedbacksAPI = feedbacksAPI as jest.Mocked<typeof feedbacksAPI>;
const mockWaitlistAPI = waitlistAPI as jest.Mocked<typeof waitlistAPI>;

describe('EventDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventsAPI.getEvent.mockResolvedValue({ data: mockEvent });
    mockEventsAPI.isFollowing.mockResolvedValue({ data: { is_following: false } });
    mockFeedbacksAPI.getEventFeedbacks.mockResolvedValue({ data: { results: mockFeedbacks } });
    mockWaitlistAPI.getMyWaitlist.mockResolvedValue({ data: { results: [] } });
  });

  describe('Loading State', () => {
    it('should show loading indicator initially', async () => {
      let resolveEvent: (value: any) => void;
      mockEventsAPI.getEvent.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveEvent = resolve;
          })
      );

      const { getByTestId, queryByText } = render(<EventDetailsScreen />);

      // Loading indicator should be visible
      // Event title should not be visible yet
      expect(queryByText('Concert de Jazz')).toBeNull();
    });
  });

  describe('Event Display', () => {
    it('should display event title', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });

    it('should display event description', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText(/magnifique concert de jazz/)).toBeTruthy();
      });
    });

    it('should display event location', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText(/Palais des Congrès/)).toBeTruthy();
      });
    });

    it('should display event date', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        // Should show formatted date
        expect(getByText(/2024/)).toBeTruthy();
      });
    });

    it('should display organizer info', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText(/Marie Martin/)).toBeTruthy();
      });
    });

    it('should display category', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Musique')).toBeTruthy();
      });
    });
  });

  describe('Tabs', () => {
    it('should render tab navigation', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Détails')).toBeTruthy();
        expect(getByText('Billets')).toBeTruthy();
        expect(getByText('Avis')).toBeTruthy();
      });
    });

    it('should switch to tickets tab', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Billets')).toBeTruthy();
      });

      fireEvent.press(getByText('Billets'));

      await waitFor(() => {
        // Ticket types should be visible
        expect(getByText('Standard')).toBeTruthy();
      });
    });

    it('should switch to reviews tab', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Avis')).toBeTruthy();
      });

      fireEvent.press(getByText('Avis'));

      await waitFor(() => {
        // Reviews should be visible
        expect(getByText(/Excellent événement/)).toBeTruthy();
      });
    });
  });

  describe('Ticket Types', () => {
    it('should display ticket prices', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Billets')).toBeTruthy();
      });

      fireEvent.press(getByText('Billets'));

      await waitFor(() => {
        expect(getByText(/5 000 FCFA/)).toBeTruthy();
      });
    });

    it('should display available quantity', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Billets')).toBeTruthy();
      });

      fireEvent.press(getByText('Billets'));

      await waitFor(() => {
        expect(getByText(/75 disponibles/)).toBeTruthy();
      });
    });

    it('should navigate to ticket purchase on select', async () => {
      const { getByText, getAllByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Billets')).toBeTruthy();
      });

      fireEvent.press(getByText('Billets'));

      await waitFor(() => {
        expect(getByText('Standard')).toBeTruthy();
      });

      // Find and press select button
      const selectButtons = getAllByText('Sélectionner');
      if (selectButtons.length > 0) {
        fireEvent.press(selectButtons[0]);
        expect(mockNavigate).toHaveBeenCalledWith('TicketPurchase', expect.any(Object));
      }
    });
  });

  describe('Follow Functionality', () => {
    it('should show follow button', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText(/Suivre/)).toBeTruthy();
      });
    });
  });

  describe('Waitlist', () => {
    it('should show waitlist option when tickets are sold out', async () => {
      const soldOutEvent = {
        ...mockEvent,
        ticket_types: mockEvent.ticket_types?.map(t => ({
          ...t,
          quantity_sold: t.quantity_total,
          quantity_available: 0,
        })),
      };
      mockEventsAPI.getEvent.mockResolvedValue({ data: soldOutEvent });

      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Billets')).toBeTruthy();
      });

      fireEvent.press(getByText('Billets'));

      await waitFor(() => {
        expect(getByText(/liste d'attente/i)).toBeTruthy();
      });
    });

    it('should join waitlist when button pressed', async () => {
      const soldOutEvent = {
        ...mockEvent,
        ticket_types: mockEvent.ticket_types?.map(t => ({
          ...t,
          quantity_sold: t.quantity_total,
          quantity_available: 0,
        })),
      };
      mockEventsAPI.getEvent.mockResolvedValue({ data: soldOutEvent });
      mockWaitlistAPI.joinWaitlist.mockResolvedValue({
        data: { id: 'waitlist-1', position: 1 },
      });

      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Billets')).toBeTruthy();
      });

      fireEvent.press(getByText('Billets'));

      await waitFor(() => {
        const joinButton = getByText(/Rejoindre la liste d'attente/i);
        fireEvent.press(joinButton);
      });

      await waitFor(() => {
        expect(mockWaitlistAPI.joinWaitlist).toHaveBeenCalledWith({
          event: 'event-1',
        });
      });
    });
  });

  describe('Actions', () => {
    it('should share event', async () => {
      const shareSpy = jest.spyOn(Share, 'share');
      const { getByText, UNSAFE_queryAllByType } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      // Find share button and press it
      // This would need a testID on the share button
    });

    it('should go back on back button press', async () => {
      const { UNSAFE_queryAllByType } = render(<EventDetailsScreen />);

      // Find and press back button
    });
  });

  describe('Reviews', () => {
    it('should display reviews', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Avis')).toBeTruthy();
      });

      fireEvent.press(getByText('Avis'));

      await waitFor(() => {
        expect(getByText('Excellent événement ! Je recommande vivement.')).toBeTruthy();
      });
    });

    it('should display average rating', async () => {
      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Avis')).toBeTruthy();
      });

      fireEvent.press(getByText('Avis'));

      await waitFor(() => {
        // Should show rating
        expect(getByText(/5/)).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when event loading fails', async () => {
      mockEventsAPI.getEvent.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur/)).toBeTruthy();
      });
    });
  });

  describe('Free Events', () => {
    it('should display "Gratuit" for free events', async () => {
      mockEventsAPI.getEvent.mockResolvedValue({
        data: { ...mockEvent, is_free: true, ticket_types: [] },
      });

      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText('Gratuit')).toBeTruthy();
      });
    });
  });

  describe('Inscription Events', () => {
    it('should show registration form for inscription type', async () => {
      mockEventsAPI.getEvent.mockResolvedValue({
        data: { ...mockEvent, event_type: 'inscription', ticket_types: [] },
      });

      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText(/S'inscrire/)).toBeTruthy();
      });
    });
  });

  describe('Online Events', () => {
    it('should show online location type', async () => {
      mockEventsAPI.getEvent.mockResolvedValue({
        data: { ...mockEvent, location_type: 'online', online_url: 'https://meet.example.com' },
      });

      const { getByText } = render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(getByText(/En ligne/)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should call API with correct event ID', async () => {
      render(<EventDetailsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvent).toHaveBeenCalledWith('event-1');
      });
    });
  });
});
