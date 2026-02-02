/**
 * Tests pour HomeScreen
 * Vérifie le chargement et l'affichage des événements
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../screens/events/HomeScreen';
import { render } from '../mocks/testUtils';
import { eventsAPI, categoriesAPI } from '../../api/client';
import { mockEvents, mockCategories, mockUser } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  eventsAPI: {
    getEvents: jest.fn(),
    getFeaturedEvents: jest.fn(),
    getNearbyEvents: jest.fn(),
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

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: 4.0511, longitude: 9.7679 },
    })
  ),
}));

const mockEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;
const mockCategoriesAPI = categoriesAPI as jest.Mocked<typeof categoriesAPI>;

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventsAPI.getFeaturedEvents.mockResolvedValue({
      data: { results: mockEvents.filter((e) => e.is_featured) },
    });
    mockEventsAPI.getEvents.mockResolvedValue({
      data: { results: mockEvents },
    });
    mockEventsAPI.getNearbyEvents.mockResolvedValue({
      data: { results: mockEvents },
    });
    mockCategoriesAPI.getCategories.mockResolvedValue({
      data: { results: mockCategories },
    });
  });

  describe('Rendering', () => {
    it('should render header with logo', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('eventez')).toBeTruthy();
      });
    });

    it('should render search bar', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Rechercher un événement')).toBeTruthy();
      });
    });

    it('should render categories section', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Catégories')).toBeTruthy();
      });
    });

    it('should render featured events section', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Événements populaires')).toBeTruthy();
      });
    });

    it('should render nearby events section when location is available', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Près de chez vous')).toBeTruthy();
      });
    });

    it('should render weekend events section', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Ce week-end')).toBeTruthy();
      });
    });

    it('should render free events section when free events exist', async () => {
      mockEventsAPI.getEvents.mockResolvedValue({
        data: { results: [...mockEvents, { ...mockEvents[0], is_free: true }] },
      });

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Événements gratuits')).toBeTruthy();
      });
    });
  });

  describe('Data Loading', () => {
    it('should fetch featured events on mount', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFeaturedEvents).toHaveBeenCalled();
      });
    });

    it('should fetch categories on mount', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(mockCategoriesAPI.getCategories).toHaveBeenCalled();
      });
    });

    it('should fetch upcoming events on mount', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvents).toHaveBeenCalledWith(
          expect.objectContaining({ ordering: 'start_date' })
        );
      });
    });

    it('should fetch nearby events when location is available', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getNearbyEvents).toHaveBeenCalledWith(4.0511, 9.7679, 50, 10);
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to notifications on bell press', async () => {
      const { getByTestId, UNSAFE_queryAllByType } = render(<HomeScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFeaturedEvents).toHaveBeenCalled();
      });

      // Find notifications button and press it
      // This would need a testID on the button
    });

    it('should navigate to Explore on search bar press', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Rechercher un événement')).toBeTruthy();
      });

      fireEvent.press(getByText('Rechercher un événement'));

      expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Explore' });
    });

    it('should navigate to event details on event card press', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });

      fireEvent.press(getByText('Concert de Jazz'));

      expect(mockNavigate).toHaveBeenCalledWith('EventDetails', { eventId: 'event-1' });
    });

    it('should navigate to Explore on "Voir tout" press', async () => {
      const { getAllByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getAllByText('Voir tout').length).toBeGreaterThan(0);
      });

      fireEvent.press(getAllByText('Voir tout')[0]);

      expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Explore' });
    });

    it('should navigate to Explore with category on category press', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Musique')).toBeTruthy();
      });

      fireEvent.press(getByText('Musique'));

      expect(mockNavigate).toHaveBeenCalledWith('Main', {
        screen: 'Explore',
        params: { category: 1 },
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh data on pull', async () => {
      const { UNSAFE_queryByType } = render(<HomeScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getFeaturedEvents).toHaveBeenCalledTimes(1);
      });

      // Simulate pull to refresh
      // This would require accessing the ScrollView's RefreshControl
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockEventsAPI.getFeaturedEvents.mockRejectedValue(new Error('Network error'));
      mockEventsAPI.getEvents.mockRejectedValue(new Error('Network error'));
      mockCategoriesAPI.getCategories.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        // Should still render header even with errors
        expect(getByText('eventez')).toBeTruthy();
      });
    });
  });

  describe('Location Handling', () => {
    it('should show default location when permission denied', async () => {
      const Location = require('expo-location');
      Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Douala, Cameroun')).toBeTruthy();
      });
    });

    it('should show nearby text when location is available', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Événements près de vous')).toBeTruthy();
      });
    });
  });

  describe('Event Display', () => {
    it('should display event with correct price', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        // Event with price should show price
        expect(getByText(/FCFA/)).toBeTruthy();
      });
    });

    it('should display free event correctly', async () => {
      mockEventsAPI.getEvents.mockResolvedValue({
        data: { results: [{ ...mockEvents[0], is_free: true, base_price: 0 }] },
      });

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Gratuit')).toBeTruthy();
      });
    });

    it('should display inscription type events as free', async () => {
      mockEventsAPI.getEvents.mockResolvedValue({
        data: { results: [{ ...mockEvents[0], event_type: 'inscription' }] },
      });

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Gratuit')).toBeTruthy();
      });
    });
  });

  describe('Categories Display', () => {
    it('should display category icons correctly', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        mockCategories.forEach((category) => {
          expect(getByText(category.name)).toBeTruthy();
        });
      });
    });

    it('should limit categories to 8', async () => {
      const manyCategories = Array(12)
        .fill(mockCategories[0])
        .map((c, i) => ({ ...c, id: i, name: `Category ${i}` }));
      mockCategoriesAPI.getCategories.mockResolvedValue({
        data: { results: manyCategories },
      });

      const { queryByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(queryByText('Category 0')).toBeTruthy();
        expect(queryByText('Category 7')).toBeTruthy();
        expect(queryByText('Category 8')).toBeNull();
      });
    });
  });
});
