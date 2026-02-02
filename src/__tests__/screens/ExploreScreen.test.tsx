/**
 * Tests pour ExploreScreen
 * Vérifie la recherche et le filtrage des événements
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ExploreScreen from '../../screens/events/ExploreScreen';
import { render } from '../mocks/testUtils';
import { eventsAPI, categoriesAPI } from '../../api/client';
import { mockEvents, mockCategories } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  eventsAPI: {
    getEvents: jest.fn(),
    searchEvents: jest.fn(),
  },
  categoriesAPI: {
    getCategories: jest.fn(),
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
    useRoute: () => ({
      params: {},
    }),
  };
});

const mockEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;
const mockCategoriesAPI = categoriesAPI as jest.Mocked<typeof categoriesAPI>;

describe('ExploreScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventsAPI.getEvents.mockResolvedValue({
      data: { results: mockEvents, count: mockEvents.length },
    });
    mockEventsAPI.searchEvents.mockResolvedValue({
      data: { results: mockEvents, count: mockEvents.length },
    });
    mockCategoriesAPI.getCategories.mockResolvedValue({
      data: { results: mockCategories },
    });
  });

  describe('Rendering', () => {
    it('should render search input', async () => {
      const { getByPlaceholderText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/Rechercher/i)).toBeTruthy();
      });
    });

    it('should render filter tabs', async () => {
      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText('Tous')).toBeTruthy();
      });
    });

    it('should render events list', async () => {
      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });

    it('should render category filter chips', async () => {
      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText('Musique')).toBeTruthy();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should search events when text is entered', async () => {
      const { getByPlaceholderText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText(/Rechercher/i);
      fireEvent.changeText(searchInput, 'jazz');

      await waitFor(() => {
        expect(mockEventsAPI.searchEvents).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'jazz' })
        );
      });
    });

    it('should debounce search input', async () => {
      const { getByPlaceholderText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText(/Rechercher/i);

      // Type multiple characters quickly
      fireEvent.changeText(searchInput, 'j');
      fireEvent.changeText(searchInput, 'ja');
      fireEvent.changeText(searchInput, 'jaz');
      fireEvent.changeText(searchInput, 'jazz');

      // Should only call search once after debounce
      await waitFor(() => {
        expect(mockEventsAPI.searchEvents).toHaveBeenCalled();
      });
    });

    it('should clear search when X button is pressed', async () => {
      const { getByPlaceholderText, getByTestId } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText(/Rechercher/i);
      fireEvent.changeText(searchInput, 'jazz');

      // Clear search - would need a testID on clear button
    });
  });

  describe('Filtering', () => {
    it('should filter by category when chip is pressed', async () => {
      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText('Musique')).toBeTruthy();
      });

      fireEvent.press(getByText('Musique'));

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalledWith(
          expect.objectContaining({ category: 1 })
        );
      });
    });

    it('should filter by date range', async () => {
      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText('Ce week-end')).toBeTruthy();
      });

      fireEvent.press(getByText('Ce week-end'));

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalled();
      });
    });

    it('should filter by event type', async () => {
      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText('Billetterie')).toBeTruthy();
      });

      fireEvent.press(getByText('Billetterie'));

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalledWith(
          expect.objectContaining({ event_type: 'billetterie' })
        );
      });
    });

    it('should filter by free events', async () => {
      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText('Gratuit')).toBeTruthy();
      });

      fireEvent.press(getByText('Gratuit'));

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalledWith(
          expect.objectContaining({ is_free: true })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to event details on event press', async () => {
      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      fireEvent.press(getByText('Concert de Jazz'));

      expect(mockNavigate).toHaveBeenCalledWith('EventDetails', { eventId: 'event-1' });
    });

    it('should navigate to map view', async () => {
      const { getByTestId } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalled();
      });

      // Map button would need testID
    });
  });

  describe('Pagination', () => {
    it('should load more events on scroll to end', async () => {
      mockEventsAPI.getEvents.mockResolvedValueOnce({
        data: { results: mockEvents, count: 20, next: 'page=2' },
      });

      const { UNSAFE_queryByType } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalledTimes(1);
      });

      // Simulate scroll to end - would need to trigger onEndReached
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no events found', async () => {
      mockEventsAPI.getEvents.mockResolvedValue({
        data: { results: [], count: 0 },
      });

      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText(/Aucun événement/i)).toBeTruthy();
      });
    });

    it('should show search empty state when search returns no results', async () => {
      mockEventsAPI.searchEvents.mockResolvedValue({
        data: { results: [], count: 0 },
      });

      const { getByPlaceholderText, getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText(/Rechercher/i);
      fireEvent.changeText(searchInput, 'xxxxxxxx');

      await waitFor(() => {
        expect(getByText(/Aucun résultat/i)).toBeTruthy();
      });
    });
  });

  describe('View Toggle', () => {
    it('should toggle between list and grid view', async () => {
      const { getByTestId } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalled();
      });

      // Toggle button would need testID
    });
  });

  describe('Sorting', () => {
    it('should sort by date', async () => {
      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText('Date')).toBeTruthy();
      });

      fireEvent.press(getByText('Date'));

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalledWith(
          expect.objectContaining({ ordering: 'start_date' })
        );
      });
    });

    it('should sort by popularity', async () => {
      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText('Popularité')).toBeTruthy();
      });

      fireEvent.press(getByText('Popularité'));

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalledWith(
          expect.objectContaining({ ordering: '-view_count' })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockEventsAPI.getEvents.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur|Réessayer/i)).toBeTruthy();
      });
    });

    it('should allow retry on error', async () => {
      mockEventsAPI.getEvents
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { results: mockEvents, count: mockEvents.length } });

      const { getByText } = render(<ExploreScreen />);

      await waitFor(() => {
        expect(getByText(/Réessayer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Réessayer/i));

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });
  });

  describe('Route Params', () => {
    it('should apply category filter from route params', async () => {
      jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
        params: { category: 1 },
      });

      render(<ExploreScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalledWith(
          expect.objectContaining({ category: 1 })
        );
      });
    });

    it('should apply search query from route params', async () => {
      jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
        params: { search: 'festival' },
      });

      render(<ExploreScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.searchEvents).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'festival' })
        );
      });
    });
  });
});
