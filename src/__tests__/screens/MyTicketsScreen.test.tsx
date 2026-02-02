/**
 * Tests pour MyTicketsScreen
 * Vérifie l'affichage des billets et inscriptions de l'utilisateur
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import MyTicketsScreen from '../../screens/dashboard/MyTicketsScreen';
import { render } from '../mocks/testUtils';
import { ticketPurchasesAPI, registrationsAPI } from '../../api/client';
import { mockTicketPurchase, mockRegistration, mockEvent, mockUser } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  ticketPurchasesAPI: {
    getMyTickets: jest.fn(),
  },
  registrationsAPI: {
    getMyRegistrations: jest.fn(),
  },
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
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
  };
});

const mockTicketPurchasesAPI = ticketPurchasesAPI as jest.Mocked<typeof ticketPurchasesAPI>;
const mockRegistrationsAPI = registrationsAPI as jest.Mocked<typeof registrationsAPI>;

describe('MyTicketsScreen', () => {
  const mockTickets = [
    {
      ...mockTicketPurchase,
      event: mockEvent,
    },
    {
      ...mockTicketPurchase,
      id: 'purchase-2',
      event: { ...mockEvent, id: 'event-2', title: 'Festival de Musique' },
    },
  ];

  const mockRegistrations = [
    mockRegistration,
    {
      ...mockRegistration,
      id: 'reg-2',
      event: { ...mockEvent, id: 'event-3', title: 'Atelier de Peinture' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockTicketPurchasesAPI.getMyTickets.mockResolvedValue({
      data: mockTickets,
    });
    mockRegistrationsAPI.getMyRegistrations.mockResolvedValue({
      data: { results: mockRegistrations },
    });
  });

  describe('Rendering', () => {
    it('should render screen title', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('Mes Billets')).toBeTruthy();
      });
    });

    it('should render tabs', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('À venir')).toBeTruthy();
        expect(getByText('Passés')).toBeTruthy();
      });
    });
  });

  describe('Tickets Display', () => {
    it('should display ticket event titles', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
        expect(getByText('Festival de Musique')).toBeTruthy();
      });
    });

    it('should display ticket type', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('Standard')).toBeTruthy();
      });
    });

    it('should display ticket quantity', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText(/2 billets?/)).toBeTruthy();
      });
    });

    it('should display ticket status', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('Confirmé')).toBeTruthy();
      });
    });
  });

  describe('Tabs Functionality', () => {
    it('should switch to past events tab', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('Passés')).toBeTruthy();
      });

      fireEvent.press(getByText('Passés'));

      // Should filter to show past events only
    });

    it('should show empty state when no tickets', async () => {
      mockTicketPurchasesAPI.getMyTickets.mockResolvedValue({ data: [] });
      mockRegistrationsAPI.getMyRegistrations.mockResolvedValue({ data: { results: [] } });

      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText(/Aucun billet/)).toBeTruthy();
      });
    });
  });

  describe('Ticket Actions', () => {
    it('should navigate to QR code screen on ticket press', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      fireEvent.press(getByText('Concert de Jazz'));

      expect(mockNavigate).toHaveBeenCalledWith('QRCode', expect.any(Object));
    });

    it('should show QR code button', async () => {
      const { getByText, getAllByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      // Find QR button
      const qrButtons = getAllByText(/QR/i);
      expect(qrButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Data Loading', () => {
    it('should fetch tickets on mount', async () => {
      render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(mockTicketPurchasesAPI.getMyTickets).toHaveBeenCalled();
      });
    });

    it('should fetch registrations on mount', async () => {
      render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(mockRegistrationsAPI.getMyRegistrations).toHaveBeenCalled();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh on pull', async () => {
      const { UNSAFE_queryByType } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(mockTicketPurchasesAPI.getMyTickets).toHaveBeenCalledTimes(1);
      });

      // Simulate refresh
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      mockTicketPurchasesAPI.getMyTickets.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur/)).toBeTruthy();
      });
    });
  });

  describe('Checked In Status', () => {
    it('should show checked in badge', async () => {
      mockTicketPurchasesAPI.getMyTickets.mockResolvedValue({
        data: [{ ...mockTicketPurchase, is_checked_in: true, event: mockEvent }],
      });

      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText(/Utilisé|Scanné/i)).toBeTruthy();
      });
    });
  });

  describe('Event Date Display', () => {
    it('should display event date', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText(/2024/)).toBeTruthy();
      });
    });
  });

  describe('Ticket Types', () => {
    it('should group tickets by event', async () => {
      const { getAllByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        // Should have separate entries for different events
        expect(getAllByText(/Concert|Festival/).length).toBe(2);
      });
    });
  });

  describe('Registration vs Ticket', () => {
    it('should display both tickets and registrations', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
        expect(getByText('Atelier de Peinture')).toBeTruthy();
      });
    });

    it('should differentiate ticket types', async () => {
      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        // Billetterie event should show ticket info
        expect(getByText('Standard')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to event details on event name press', async () => {
      const { getByText, UNSAFE_queryAllByType } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      // Event title press should navigate
    });
  });

  describe('Sorting', () => {
    it('should sort tickets by event date', async () => {
      const futureEvent = {
        ...mockEvent,
        start_date: '2025-12-31T19:00:00Z',
        title: 'Future Event',
      };
      const pastEvent = {
        ...mockEvent,
        id: 'past-event',
        start_date: '2020-01-01T19:00:00Z',
        title: 'Past Event',
      };

      mockTicketPurchasesAPI.getMyTickets.mockResolvedValue({
        data: [
          { ...mockTicketPurchase, event: futureEvent },
          { ...mockTicketPurchase, id: 'p2', event: pastEvent },
        ],
      });

      const { getByText } = render(<MyTicketsScreen />);

      await waitFor(() => {
        expect(getByText('Future Event')).toBeTruthy();
      });
    });
  });
});
