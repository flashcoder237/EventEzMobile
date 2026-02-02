/**
 * Tests pour EventAnalyticsScreen (Organizer)
 * Vérifie les statistiques et analytics des événements
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import EventAnalyticsScreen from '../../screens/organizer/EventAnalyticsScreen';
import { render } from '../mocks/testUtils';
import { analyticsAPI, eventsAPI } from '../../api/client';
import { mockEvent, mockOrganizer } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  analyticsAPI: {
    getEventAnalytics: jest.fn(),
    exportAnalytics: jest.fn(),
  },
  eventsAPI: {
    getEvent: jest.fn(),
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
      params: {
        eventId: 'event-1',
      },
    }),
  };
});

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockOrganizer,
    isAuthenticated: true,
  }),
}));

const mockAnalyticsAPI = analyticsAPI as jest.Mocked<typeof analyticsAPI>;
const mockEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;

const mockAnalyticsData = {
  overview: {
    total_registrations: 150,
    total_revenue: 750000,
    total_views: 2500,
    conversion_rate: 6.0,
    check_in_rate: 85.0,
  },
  registrations_by_day: [
    { date: '2024-01-01', count: 10 },
    { date: '2024-01-02', count: 15 },
    { date: '2024-01-03', count: 25 },
    { date: '2024-01-04', count: 30 },
    { date: '2024-01-05', count: 20 },
  ],
  revenue_by_day: [
    { date: '2024-01-01', amount: 50000 },
    { date: '2024-01-02', amount: 75000 },
    { date: '2024-01-03', amount: 125000 },
    { date: '2024-01-04', amount: 150000 },
    { date: '2024-01-05', amount: 100000 },
  ],
  ticket_types_breakdown: [
    { name: 'Standard', count: 100, percentage: 66.7, revenue: 500000 },
    { name: 'VIP', count: 30, percentage: 20.0, revenue: 200000 },
    { name: 'Gratuit', count: 20, percentage: 13.3, revenue: 0 },
  ],
  traffic_sources: [
    { source: 'Direct', count: 80, percentage: 53.3 },
    { source: 'Social', count: 40, percentage: 26.7 },
    { source: 'Search', count: 20, percentage: 13.3 },
    { source: 'Referral', count: 10, percentage: 6.7 },
  ],
  demographics: {
    gender: [
      { label: 'Homme', value: 55 },
      { label: 'Femme', value: 42 },
      { label: 'Autre', value: 3 },
    ],
    age_groups: [
      { label: '18-24', value: 30 },
      { label: '25-34', value: 45 },
      { label: '35-44', value: 15 },
      { label: '45+', value: 10 },
    ],
  },
};

describe('EventAnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventsAPI.getEvent.mockResolvedValue({
      data: mockEvent,
    });
    mockAnalyticsAPI.getEventAnalytics.mockResolvedValue({
      data: mockAnalyticsData,
    });
  });

  describe('Rendering', () => {
    it('should render header with event title', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });

    it('should render overview cards', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText('Inscriptions')).toBeTruthy();
        expect(getByText('Revenus')).toBeTruthy();
        expect(getByText('Vues')).toBeTruthy();
      });
    });

    it('should render total registrations', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText('150')).toBeTruthy();
      });
    });

    it('should render total revenue', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/750.*000|750,000/)).toBeTruthy();
      });
    });

    it('should render total views', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/2.*500|2,500/)).toBeTruthy();
      });
    });

    it('should render conversion rate', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/6.*%|Conversion/i)).toBeTruthy();
      });
    });

    it('should render check-in rate', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/85.*%|Check-in/i)).toBeTruthy();
      });
    });

    it('should render export button', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Exporter|Export/i)).toBeTruthy();
      });
    });
  });

  describe('Charts', () => {
    it('should render registrations chart', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Inscriptions.*temps|Évolution/i)).toBeTruthy();
      });
    });

    it('should render revenue chart', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Revenus.*temps/i)).toBeTruthy();
      });
    });

    it('should render ticket types breakdown', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Types.*billets|Répartition/i)).toBeTruthy();
        expect(getByText('Standard')).toBeTruthy();
        expect(getByText('VIP')).toBeTruthy();
      });
    });

    it('should render traffic sources chart', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Sources.*trafic/i)).toBeTruthy();
        expect(getByText('Direct')).toBeTruthy();
        expect(getByText('Social')).toBeTruthy();
      });
    });
  });

  describe('Time Period Filter', () => {
    it('should render time period selector', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/7.*jours|Période/i)).toBeTruthy();
      });
    });

    it('should filter by 7 days', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText('7 jours')).toBeTruthy();
      });

      fireEvent.press(getByText('7 jours'));

      await waitFor(() => {
        expect(mockAnalyticsAPI.getEventAnalytics).toHaveBeenCalledWith(
          'event-1',
          expect.objectContaining({ days: 7 })
        );
      });
    });

    it('should filter by 30 days', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText('30 jours')).toBeTruthy();
      });

      fireEvent.press(getByText('30 jours'));

      await waitFor(() => {
        expect(mockAnalyticsAPI.getEventAnalytics).toHaveBeenCalledWith(
          'event-1',
          expect.objectContaining({ days: 30 })
        );
      });
    });

    it('should filter by all time', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText('Tout')).toBeTruthy();
      });

      fireEvent.press(getByText('Tout'));

      await waitFor(() => {
        expect(mockAnalyticsAPI.getEventAnalytics).toHaveBeenCalled();
      });
    });
  });

  describe('Demographics', () => {
    it('should render gender breakdown', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Genre|Démographie/i)).toBeTruthy();
        expect(getByText('Homme')).toBeTruthy();
        expect(getByText('Femme')).toBeTruthy();
      });
    });

    it('should render age groups', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Âge|Tranches/i)).toBeTruthy();
        expect(getByText('18-24')).toBeTruthy();
        expect(getByText('25-34')).toBeTruthy();
      });
    });
  });

  describe('Export', () => {
    it('should export analytics as CSV', async () => {
      mockAnalyticsAPI.exportAnalytics.mockResolvedValue({
        data: { url: 'https://example.com/export.csv' },
      });

      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Exporter/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Exporter/i));

      await waitFor(() => {
        expect(getByText('CSV')).toBeTruthy();
      });

      fireEvent.press(getByText('CSV'));

      await waitFor(() => {
        expect(mockAnalyticsAPI.exportAnalytics).toHaveBeenCalledWith(
          'event-1',
          expect.objectContaining({ format: 'csv' })
        );
      });
    });

    it('should export analytics as PDF', async () => {
      mockAnalyticsAPI.exportAnalytics.mockResolvedValue({
        data: { url: 'https://example.com/export.pdf' },
      });

      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Exporter/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Exporter/i));

      await waitFor(() => {
        expect(getByText('PDF')).toBeTruthy();
      });

      fireEvent.press(getByText('PDF'));

      await waitFor(() => {
        expect(mockAnalyticsAPI.exportAnalytics).toHaveBeenCalledWith(
          'event-1',
          expect.objectContaining({ format: 'pdf' })
        );
      });
    });
  });

  describe('Comparisons', () => {
    it('should show comparison with previous period', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        // Percentage change indicators
        expect(getByText(/\+.*%|-.*%/)).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh analytics on pull', async () => {
      const { UNSAFE_queryByType } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(mockAnalyticsAPI.getEventAnalytics).toHaveBeenCalledTimes(1);
      });

      // Simulate pull to refresh
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAnalyticsAPI.getEventAnalytics.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur|Réessayer/i)).toBeTruthy();
      });
    });

    it('should allow retry on error', async () => {
      mockAnalyticsAPI.getEventAnalytics
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockAnalyticsData });

      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Réessayer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Réessayer/i));

      await waitFor(() => {
        expect(getByText('150')).toBeTruthy();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no data', async () => {
      mockAnalyticsAPI.getEventAnalytics.mockResolvedValue({
        data: {
          overview: {
            total_registrations: 0,
            total_revenue: 0,
            total_views: 0,
            conversion_rate: 0,
            check_in_rate: 0,
          },
          registrations_by_day: [],
          revenue_by_day: [],
          ticket_types_breakdown: [],
          traffic_sources: [],
          demographics: { gender: [], age_groups: [] },
        },
      });

      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Aucune donnée|pas.*données/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to attendees list', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Voir.*inscrits|Liste/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Voir.*inscrits|Liste/i));

      expect(mockNavigate).toHaveBeenCalledWith('EventAttendees', { eventId: 'event-1' });
    });

    it('should go back on header back press', async () => {
      const { getByTestId } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(mockAnalyticsAPI.getEventAnalytics).toHaveBeenCalled();
      });

      // Press back button
    });
  });

  describe('Real-time Updates', () => {
    it('should show last updated time', async () => {
      const { getByText } = render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(getByText(/Mis à jour|Dernière.*mise/i)).toBeTruthy();
      });
    });
  });

  describe('Data Loading', () => {
    it('should fetch analytics on mount', async () => {
      render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(mockAnalyticsAPI.getEventAnalytics).toHaveBeenCalledWith(
          'event-1',
          expect.any(Object)
        );
      });
    });

    it('should fetch event details on mount', async () => {
      render(<EventAnalyticsScreen />);

      await waitFor(() => {
        expect(mockEventsAPI.getEvent).toHaveBeenCalledWith('event-1');
      });
    });
  });
});
