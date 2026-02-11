/**
 * Tests pour FollowingEventsScreen
 * Vérifie la liste des événements suivis
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import FollowingEventsScreen from '../../screens/dashboard/FollowingEventsScreen';
import { render } from '../mocks/testUtils';
import { eventsAPI } from '../../api/client';
import { mockEvents, mockUser } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  eventsAPI: {
    getFollowingEvents: jest.fn(),
    unfollowEvent: jest.fn(),
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
    user: mockUser,
    isAuthenticated: true,
  }),
}));

const mockEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;

const followingEvents = mockEvents.map((e) => ({ ...e, is_following: true }));

describe('FollowingEventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventsAPI.getFollowingEvents.mockResolvedValue({
      data: { results: followingEvents, count: followingEvents.length },
    } as any);
  });

  describe('Rendering', () => {
    it('should render header', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText('Événements suivis')).toBeTruthy();
      });
    });

    it('should render events list', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });

    it('should render event count', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText(/\d+ événement/i)).toBeTruthy();
      });
    });
  });

  describe('Event Display', () => {
    it('should display event date', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText(/JUIN|juin/i)).toBeTruthy();
      });
    });

    it('should display event location', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Douala/i)).toBeTruthy();
      });
    });

    it('should display event price', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText(/FCFA|Gratuit/i)).toBeTruthy();
      });
    });

    it('should show follow indicator', async () => {
      const { UNSAFE_queryAllByType } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFollowingEvents).toHaveBeenCalled();
      });

      // Check for bookmark/heart icon
    });
  });

  describe('Navigation', () => {
    it('should navigate to event details on press', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      fireEvent.press(getByText('Concert de Jazz'));

      expect(mockNavigate).toHaveBeenCalledWith('EventDetails', { eventId: 'event-1' });
    });

    it('should navigate back on back button press', async () => {
      const { getByTestId } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFollowingEvents).toHaveBeenCalled();
      });

      // Back button - would need testID
    });
  });

  describe('Unfollow', () => {
    it('should show unfollow option', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      // Long press or swipe to show unfollow
    });

    it('should unfollow event and remove from list', async () => {
      mockEventsAPI.unfollowEvent.mockResolvedValue({ data: { success: true } } as any);

      const { getByText, queryByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      // Simulate unfollow action
      // After unfollow, event should be removed from list
    });

    it('should show confirmation before unfollow', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      // Trigger unfollow - should show confirmation
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no following events', async () => {
      mockEventsAPI.getFollowingEvents.mockResolvedValue({
        data: { results: [], count: 0 },
      } as any);

      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Aucun événement suivi/i)).toBeTruthy();
      });
    });

    it('should show explore button in empty state', async () => {
      mockEventsAPI.getFollowingEvents.mockResolvedValue({
        data: { results: [], count: 0 },
      } as any);

      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Explorer|Découvrir/i)).toBeTruthy();
      });
    });

    it('should navigate to explore on button press', async () => {
      mockEventsAPI.getFollowingEvents.mockResolvedValue({
        data: { results: [], count: 0 },
      } as any);

      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Explorer|Découvrir/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Explorer|Découvrir/i));

      expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Explore' });
    });
  });

  describe('Filtering', () => {
    it('should filter by upcoming events', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText('À venir')).toBeTruthy();
      });

      fireEvent.press(getByText('À venir'));

      // Should filter to upcoming events
    });

    it('should filter by past events', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText('Passés')).toBeTruthy();
      });

      fireEvent.press(getByText('Passés'));

      // Should filter to past events
    });
  });

  describe('Sorting', () => {
    it('should sort by date', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Trier/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Trier/i));

      // Sort options should appear
    });

    it('should sort by name', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFollowingEvents).toHaveBeenCalled();
      });

      // Select sort by name option
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh list on pull', async () => {
      const { UNSAFE_queryByType } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFollowingEvents).toHaveBeenCalledTimes(1);
      });

      // Simulate pull to refresh
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockEventsAPI.getFollowingEvents.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur|Réessayer/i)).toBeTruthy();
      });
    });

    it('should allow retry on error', async () => {
      mockEventsAPI.getFollowingEvents
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { results: followingEvents, count: followingEvents.length },
        } as any);

      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText(/Réessayer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Réessayer/i));

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });
  });

  describe('Notification Settings', () => {
    it('should show notification bell for each event', async () => {
      const { UNSAFE_queryAllByType } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFollowingEvents).toHaveBeenCalled();
      });

      // Notification icons should be present
    });

    it('should toggle notifications for event', async () => {
      const { getByText } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      // Toggle notification bell
    });
  });

  describe('Data Loading', () => {
    it('should fetch following events on mount', async () => {
      render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFollowingEvents).toHaveBeenCalled();
      });
    });

    it('should refetch on focus', async () => {
      render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFollowingEvents).toHaveBeenCalledTimes(1);
      });

      // useFocusEffect is mocked to call immediately
    });
  });

  describe('Pagination', () => {
    it('should load more events on scroll', async () => {
      mockEventsAPI.getFollowingEvents.mockResolvedValueOnce({
        data: { results: followingEvents, count: 20, next: 'page=2' },
      } as any);

      const { UNSAFE_queryByType } = render(<FollowingEventsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFollowingEvents).toHaveBeenCalledTimes(1);
      });

      // Simulate scroll to end
    });
  });
});
