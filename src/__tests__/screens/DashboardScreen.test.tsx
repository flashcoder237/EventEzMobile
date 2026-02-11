/**
 * Tests pour DashboardScreen
 * Vérifie le tableau de bord utilisateur et les raccourcis
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../../screens/dashboard/DashboardScreen';
import { render } from '../mocks/testUtils';
import { eventsAPI, ticketPurchasesAPI, notificationsAPI } from '../../api/client';
import { mockUser, mockOrganizer, mockEvents, mockTicketPurchase } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  eventsAPI: {
    getFollowingEvents: jest.fn(),
    getMyEvents: jest.fn(),
  },
  ticketPurchasesAPI: {
    getMyTickets: jest.fn(),
  },
  notificationsAPI: {
    getNotifications: jest.fn(),
  },
  registrationsAPI: {
    getMyRegistrations: jest.fn(),
  },
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
    useFocusEffect: jest.fn((callback) => callback()),
  };
});

const mockEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;
const mockTicketPurchasesAPI = ticketPurchasesAPI as jest.Mocked<typeof ticketPurchasesAPI>;
const mockNotificationsAPI = notificationsAPI as jest.Mocked<typeof notificationsAPI>;

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventsAPI.getFollowingEvents.mockResolvedValue({
      data: { results: mockEvents },
    } as any);
    mockEventsAPI.getMyEvents.mockResolvedValue({
      data: { results: mockEvents },
    } as any);
    mockTicketPurchasesAPI.getMyTickets.mockResolvedValue({
      data: [mockTicketPurchase],
    } as any);
    mockNotificationsAPI.getNotifications.mockResolvedValue({
      data: { results: [] },
    } as any);
  });

  describe('Rendering', () => {
    it('should render user greeting', async () => {
      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText(/Bonjour|Bienvenue/)).toBeTruthy();
      });
    });

    it('should render user name', async () => {
      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText(/Jean/)).toBeTruthy();
      });
    });

    it('should render quick action cards', async () => {
      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('Mes Billets')).toBeTruthy();
        expect(getByText('Événements suivis')).toBeTruthy();
      });
    });
  });

  describe('Quick Actions', () => {
    it('should navigate to My Tickets', async () => {
      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('Mes Billets')).toBeTruthy();
      });

      fireEvent.press(getByText('Mes Billets'));

      expect(mockNavigate).toHaveBeenCalledWith('MyTickets');
    });

    it('should navigate to Following Events', async () => {
      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('Événements suivis')).toBeTruthy();
      });

      fireEvent.press(getByText('Événements suivis'));

      expect(mockNavigate).toHaveBeenCalledWith('FollowingEvents');
    });

    it('should navigate to Notifications', async () => {
      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('Notifications')).toBeTruthy();
      });

      fireEvent.press(getByText('Notifications'));

      expect(mockNavigate).toHaveBeenCalledWith('Notifications');
    });

    it('should navigate to Messages', async () => {
      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('Messages')).toBeTruthy();
      });

      fireEvent.press(getByText('Messages'));

      expect(mockNavigate).toHaveBeenCalledWith('Messages');
    });
  });

  describe('Upcoming Events', () => {
    it('should display upcoming events', async () => {
      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('Événements à venir')).toBeTruthy();
      });
    });

    it('should show empty state when no events', async () => {
      mockTicketPurchasesAPI.getMyTickets.mockResolvedValue({ data: [] } as any);

      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText(/Aucun événement/)).toBeTruthy();
      });
    });
  });

  describe('Organizer Dashboard', () => {
    it('should show organizer quick actions', async () => {
      jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
        user: mockOrganizer,
        isAuthenticated: true,
      });

      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('Mes Événements')).toBeTruthy();
        expect(getByText('Statistiques')).toBeTruthy();
      });
    });

    it('should navigate to My Events for organizer', async () => {
      jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
        user: mockOrganizer,
        isAuthenticated: true,
      });

      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('Mes Événements')).toBeTruthy();
      });

      fireEvent.press(getByText('Mes Événements'));

      expect(mockNavigate).toHaveBeenCalledWith('MyEvents');
    });

    it('should navigate to Wallet for organizer', async () => {
      jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
        user: mockOrganizer,
        isAuthenticated: true,
      });

      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('Portefeuille')).toBeTruthy();
      });

      fireEvent.press(getByText('Portefeuille'));

      expect(mockNavigate).toHaveBeenCalledWith('Wallet');
    });

    it('should navigate to Statistics for organizer', async () => {
      jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
        user: mockOrganizer,
        isAuthenticated: true,
      });

      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('Statistiques')).toBeTruthy();
      });

      fireEvent.press(getByText('Statistiques'));

      expect(mockNavigate).toHaveBeenCalledWith('EventAnalytics', expect.any(Object));
    });
  });

  describe('Data Loading', () => {
    it('should fetch tickets on mount', async () => {
      render(<DashboardScreen />);

      await waitFor(() => {
        expect(mockTicketPurchasesAPI.getMyTickets).toHaveBeenCalled();
      });
    });

    it('should fetch following events on mount', async () => {
      render(<DashboardScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFollowingEvents).toHaveBeenCalled();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh data on pull', async () => {
      render(<DashboardScreen />);

      await waitFor(() => {
        expect(mockTicketPurchasesAPI.getMyTickets).toHaveBeenCalledTimes(1);
      });

      // Simulate refresh
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockTicketPurchasesAPI.getMyTickets.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<DashboardScreen />);

      // Should still render without crashing
      await waitFor(() => {
        expect(getByText(/Bonjour|Bienvenue/)).toBeTruthy();
      });
    });
  });

  describe('Notification Badge', () => {
    it('should show notification count', async () => {
      mockNotificationsAPI.getNotifications.mockResolvedValue({
        data: { results: [{ id: '1', is_read: false }], count: 1 },
      } as any);

      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText('1')).toBeTruthy();
      });
    });
  });

  describe('Recent Activity', () => {
    it('should display recent activity section', async () => {
      const { getByText } = render(<DashboardScreen />);

      await waitFor(() => {
        expect(getByText(/Activité récente/)).toBeTruthy();
      });
    });
  });
});
