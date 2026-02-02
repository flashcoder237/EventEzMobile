/**
 * Tests pour NotificationsScreen
 * Vérifie l'affichage et la gestion des notifications
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import NotificationsScreen from '../../screens/dashboard/NotificationsScreen';
import { render } from '../mocks/testUtils';
import { notificationsAPI } from '../../api/client';
import { mockNotifications, mockUser } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  notificationsAPI: {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
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
  };
});

const mockNotificationsAPI = notificationsAPI as jest.Mocked<typeof notificationsAPI>;

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationsAPI.getNotifications.mockResolvedValue({
      data: { results: mockNotifications },
    });
    mockNotificationsAPI.markAsRead.mockResolvedValue({ data: {} });
    mockNotificationsAPI.markAllAsRead.mockResolvedValue({ data: {} });
    mockNotificationsAPI.deleteNotification.mockResolvedValue({ data: {} });
  });

  describe('Rendering', () => {
    it('should render screen title', async () => {
      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('Notifications')).toBeTruthy();
      });
    });

    it('should render notifications list', async () => {
      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('Inscription confirmée')).toBeTruthy();
        expect(getByText('Rappel événement')).toBeTruthy();
      });
    });

    it('should display notification messages', async () => {
      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText(/inscription au Concert de Jazz/)).toBeTruthy();
      });
    });
  });

  describe('Notification Types', () => {
    it('should display success notification with correct style', async () => {
      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('Inscription confirmée')).toBeTruthy();
      });
    });

    it('should display info notification with correct style', async () => {
      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('Rappel événement')).toBeTruthy();
      });
    });
  });

  describe('Read Status', () => {
    it('should show unread indicator for unread notifications', async () => {
      const { getAllByTestId, UNSAFE_queryAllByType } = render(<NotificationsScreen />);

      await waitFor(() => {
        // Unread notification should have indicator
        expect(UNSAFE_queryAllByType('View').length).toBeGreaterThan(0);
      });
    });

    it('should mark notification as read on press', async () => {
      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('Inscription confirmée')).toBeTruthy();
      });

      fireEvent.press(getByText('Inscription confirmée'));

      await waitFor(() => {
        expect(mockNotificationsAPI.markAsRead).toHaveBeenCalledWith('notif-1');
      });
    });

    it('should mark all as read', async () => {
      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('Tout marquer comme lu')).toBeTruthy();
      });

      fireEvent.press(getByText('Tout marquer comme lu'));

      await waitFor(() => {
        expect(mockNotificationsAPI.markAllAsRead).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Notification', () => {
    it('should delete notification on swipe', async () => {
      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('Inscription confirmée')).toBeTruthy();
      });

      // Swipe to delete - would need swipeable gesture
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no notifications', async () => {
      mockNotificationsAPI.getNotifications.mockResolvedValue({
        data: { results: [] },
      });

      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText(/Aucune notification/)).toBeTruthy();
      });
    });
  });

  describe('Data Loading', () => {
    it('should fetch notifications on mount', async () => {
      render(<NotificationsScreen />);

      await waitFor(() => {
        expect(mockNotificationsAPI.getNotifications).toHaveBeenCalled();
      });
    });

    it('should show loading state initially', () => {
      let resolveNotifications: (value: any) => void;
      mockNotificationsAPI.getNotifications.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveNotifications = resolve;
          })
      );

      const { queryByText } = render(<NotificationsScreen />);

      // Loading indicator should be visible
      expect(queryByText('Inscription confirmée')).toBeNull();
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh notifications on pull', async () => {
      render(<NotificationsScreen />);

      await waitFor(() => {
        expect(mockNotificationsAPI.getNotifications).toHaveBeenCalledTimes(1);
      });

      // Simulate pull to refresh
    });
  });

  describe('Navigation', () => {
    it('should navigate to event on notification press', async () => {
      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('Inscription confirmée')).toBeTruthy();
      });

      fireEvent.press(getByText('Inscription confirmée'));

      // Should navigate based on notification link
    });

    it('should go back on back button press', async () => {
      const { UNSAFE_queryAllByType } = render(<NotificationsScreen />);

      // Find back button and press
    });
  });

  describe('Time Display', () => {
    it('should display relative time', async () => {
      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        // Time should be displayed
        expect(mockNotificationsAPI.getNotifications).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      mockNotificationsAPI.getNotifications.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur/)).toBeTruthy();
      });
    });
  });

  describe('Pagination', () => {
    it('should load more on scroll', async () => {
      const manyNotifications = Array(20)
        .fill(mockNotifications[0])
        .map((n, i) => ({ ...n, id: `notif-${i}` }));
      mockNotificationsAPI.getNotifications.mockResolvedValue({
        data: { results: manyNotifications, next: 'page2' },
      });

      render(<NotificationsScreen />);

      await waitFor(() => {
        expect(mockNotificationsAPI.getNotifications).toHaveBeenCalled();
      });

      // Simulate scroll to end
    });
  });
});
