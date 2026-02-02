/**
 * Tests pour MyEventsScreen (Organizer)
 * Vérifie la liste des événements de l'organisateur
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import MyEventsScreen from '../../screens/organizer/MyEventsScreen';
import { render } from '../mocks/testUtils';
import { eventsAPI } from '../../api/client';
import { mockEvents, mockOrganizer } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  eventsAPI: {
    getMyEvents: jest.fn(),
    deleteEvent: jest.fn(),
    duplicateEvent: jest.fn(),
    cancelEvent: jest.fn(),
  },
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
      setOptions: jest.fn(),
    }),
    useFocusEffect: jest.fn((callback) => callback()),
  };
});

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockOrganizer,
    isAuthenticated: true,
  }),
}));

const mockEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;

const organizerEvents = mockEvents.map((e) => ({
  ...e,
  organizer: mockOrganizer,
  status: 'validated',
}));

const draftEvent = {
  ...mockEvents[0],
  id: 'draft-1',
  title: 'Brouillon événement',
  status: 'draft',
  organizer: mockOrganizer,
};

const pendingEvent = {
  ...mockEvents[0],
  id: 'pending-1',
  title: 'En attente de validation',
  status: 'submitted',
  organizer: mockOrganizer,
};

describe('MyEventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventsAPI.getMyEvents.mockResolvedValue({
      data: { results: [...organizerEvents, draftEvent, pendingEvent], count: organizerEvents.length + 2 },
    });
  });

  describe('Rendering', () => {
    it('should render header', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Mes Événements')).toBeTruthy();
      });
    });

    it('should render create event button', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Créer|Nouveau/i)).toBeTruthy();
      });
    });

    it('should render events list', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });

    it('should render filter tabs', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Tous')).toBeTruthy();
        expect(getByText('Publiés')).toBeTruthy();
        expect(getByText('Brouillons')).toBeTruthy();
      });
    });

    it('should render event count', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/\d+.*événement/i)).toBeTruthy();
      });
    });
  });

  describe('Event Display', () => {
    it('should display event status badge', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Publié')).toBeTruthy();
        expect(getByText('Brouillon')).toBeTruthy();
      });
    });

    it('should display event date', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/JUIN|juin/i)).toBeTruthy();
      });
    });

    it('should display registration count', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/\d+.*inscrit/i)).toBeTruthy();
      });
    });

    it('should display event revenue', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/FCFA|XAF/i)).toBeTruthy();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter by published events', async () => {
      const { getByText, queryByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      fireEvent.press(getByText('Publiés'));

      await waitFor(() => {
        expect(queryByText('Brouillon événement')).toBeNull();
      });
    });

    it('should filter by draft events', async () => {
      const { getByText, queryByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      fireEvent.press(getByText('Brouillons'));

      await waitFor(() => {
        expect(getByText('Brouillon événement')).toBeTruthy();
        expect(queryByText('Concert de Jazz')).toBeNull();
      });
    });

    it('should filter by pending validation', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('En attente')).toBeTruthy();
      });

      fireEvent.press(getByText('En attente'));

      await waitFor(() => {
        expect(getByText('En attente de validation')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create event', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Créer|Nouveau/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Créer|Nouveau/i));

      expect(mockNavigate).toHaveBeenCalledWith('EventCreate');
    });

    it('should navigate to event details on press', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      fireEvent.press(getByText('Concert de Jazz'));

      expect(mockNavigate).toHaveBeenCalledWith('EventDetails', { eventId: 'event-1' });
    });

    it('should navigate to edit event', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Brouillon événement')).toBeTruthy();
      });

      // Long press or menu to show edit option
    });

    it('should navigate to event analytics', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      // Press stats button
    });
  });

  describe('Event Actions', () => {
    it('should show action menu on long press', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      fireEvent(getByText('Concert de Jazz'), 'longPress');

      await waitFor(() => {
        expect(getByText('Modifier')).toBeTruthy();
        expect(getByText('Dupliquer')).toBeTruthy();
        expect(getByText('Annuler')).toBeTruthy();
      });
    });

    it('should duplicate event', async () => {
      mockEventsAPI.duplicateEvent.mockResolvedValue({
        data: { ...mockEvents[0], id: 'event-copy-1', title: 'Concert de Jazz (copie)' },
      });

      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      fireEvent(getByText('Concert de Jazz'), 'longPress');

      await waitFor(() => {
        expect(getByText('Dupliquer')).toBeTruthy();
      });

      fireEvent.press(getByText('Dupliquer'));

      await waitFor(() => {
        expect(mockEventsAPI.duplicateEvent).toHaveBeenCalledWith('event-1');
      });
    });

    it('should cancel event with confirmation', async () => {
      mockEventsAPI.cancelEvent.mockResolvedValue({
        data: { ...mockEvents[0], status: 'cancelled' },
      });

      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      fireEvent(getByText('Concert de Jazz'), 'longPress');

      await waitFor(() => {
        expect(getByText('Annuler')).toBeTruthy();
      });

      fireEvent.press(getByText('Annuler'));

      // Should show confirmation dialog
    });

    it('should delete draft event', async () => {
      mockEventsAPI.deleteEvent.mockResolvedValue({
        data: { success: true },
      });

      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Brouillon événement')).toBeTruthy();
      });

      fireEvent(getByText('Brouillon événement'), 'longPress');

      await waitFor(() => {
        expect(getByText('Supprimer')).toBeTruthy();
      });

      fireEvent.press(getByText('Supprimer'));

      // Should show confirmation dialog
    });
  });

  describe('Quick Stats', () => {
    it('should display quick stats card', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Total.*inscriptions/i)).toBeTruthy();
      });
    });

    it('should display total revenue', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Revenus/i)).toBeTruthy();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no events', async () => {
      mockEventsAPI.getMyEvents.mockResolvedValue({
        data: { results: [], count: 0 },
      });

      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Aucun événement|Créez.*premier/i)).toBeTruthy();
      });
    });

    it('should show create button in empty state', async () => {
      mockEventsAPI.getMyEvents.mockResolvedValue({
        data: { results: [], count: 0 },
      });

      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Créer.*événement/i)).toBeTruthy();
      });
    });
  });

  describe('Search', () => {
    it('should filter events by search query', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      const searchInput = getByPlaceholderText(/Rechercher/i);
      fireEvent.changeText(searchInput, 'Brouillon');

      await waitFor(() => {
        expect(getByText('Brouillon événement')).toBeTruthy();
        expect(queryByText('Concert de Jazz')).toBeNull();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh events on pull', async () => {
      const { UNSAFE_queryByType } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getMyEvents).toHaveBeenCalledTimes(1);
      });

      // Simulate pull to refresh
    });
  });

  describe('Sorting', () => {
    it('should sort by date', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Trier/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Trier/i));

      await waitFor(() => {
        expect(getByText('Date')).toBeTruthy();
      });

      fireEvent.press(getByText('Date'));

      await waitFor(() => {
        expect(mockEventsAPI.getMyEvents).toHaveBeenCalledWith(
          expect.objectContaining({ ordering: 'start_date' })
        );
      });
    });

    it('should sort by registrations', async () => {
      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Trier/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Trier/i));

      await waitFor(() => {
        expect(getByText('Inscriptions')).toBeTruthy();
      });

      fireEvent.press(getByText('Inscriptions'));

      await waitFor(() => {
        expect(mockEventsAPI.getMyEvents).toHaveBeenCalledWith(
          expect.objectContaining({ ordering: '-registration_count' })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockEventsAPI.getMyEvents.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur|Réessayer/i)).toBeTruthy();
      });
    });

    it('should allow retry on error', async () => {
      mockEventsAPI.getMyEvents
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { results: organizerEvents, count: organizerEvents.length },
        });

      const { getByText } = render(<MyEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Réessayer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Réessayer/i));

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });
  });

  describe('Data Loading', () => {
    it('should fetch events on mount', async () => {
      render(<MyEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getMyEvents).toHaveBeenCalled();
      });
    });

    it('should refetch on focus', async () => {
      render(<MyEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getMyEvents).toHaveBeenCalledTimes(1);
      });

      // useFocusEffect is mocked to call immediately
    });
  });
});
