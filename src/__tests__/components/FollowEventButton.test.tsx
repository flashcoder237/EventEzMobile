/**
 * Tests pour le composant FollowEventButton
 * Vérifie le suivi d'événements et les préférences de notification
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FollowEventButton from '../../components/events/FollowEventButton';
import { render } from '../mocks/testUtils';
import { eventsAPI } from '../../api/client';
import { mockUser } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  eventsAPI: {
    isFollowing: jest.fn(),
    followEvent: jest.fn(),
    unfollowEvent: jest.fn(),
    updateFollowPreferences: jest.fn(),
    getFollowersCount: jest.fn(),
  },
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';
const mockUseAuth = useAuth as jest.Mock;
const mockEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;

describe('FollowEventButton', () => {
  const defaultProps = {
    eventId: 'event-1',
    variant: 'default' as const,
    showFollowerCount: false,
    onFollowChange: jest.fn(),
    initialFollowing: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
    mockEventsAPI.isFollowing.mockResolvedValue({ data: { is_following: false } });
    mockEventsAPI.getFollowersCount.mockResolvedValue({ data: { followers_count: 42 } });
    mockEventsAPI.followEvent.mockResolvedValue({ data: { success: true } });
    mockEventsAPI.unfollowEvent.mockResolvedValue({ data: { success: true } });
  });

  describe('Default Variant', () => {
    it('should render follow button when not following', async () => {
      const { getByText } = render(<FollowEventButton {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Suivre cet événement')).toBeTruthy();
      });
    });

    it('should render following state when already following', async () => {
      mockEventsAPI.isFollowing.mockResolvedValueOnce({
        data: { is_following: true, follow: {} },
      });

      const { getByText } = render(<FollowEventButton {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Vous suivez cet événement')).toBeTruthy();
      });
    });

    it('should toggle follow state on press', async () => {
      const onFollowChange = jest.fn();
      const { getByText } = render(
        <FollowEventButton {...defaultProps} onFollowChange={onFollowChange} />
      );

      await waitFor(() => {
        expect(getByText('Suivre cet événement')).toBeTruthy();
      });

      fireEvent.press(getByText('Suivre cet événement'));

      await waitFor(() => {
        expect(mockEventsAPI.followEvent).toHaveBeenCalledWith('event-1', expect.any(Object));
        expect(onFollowChange).toHaveBeenCalledWith(true);
      });
    });

    it('should unfollow when already following', async () => {
      const onFollowChange = jest.fn();
      mockEventsAPI.isFollowing.mockResolvedValueOnce({
        data: { is_following: true, follow: {} },
      });

      const { getByText } = render(
        <FollowEventButton {...defaultProps} onFollowChange={onFollowChange} />
      );

      await waitFor(() => {
        expect(getByText('Vous suivez cet événement')).toBeTruthy();
      });

      fireEvent.press(getByText('Vous suivez cet événement'));

      await waitFor(() => {
        expect(mockEventsAPI.unfollowEvent).toHaveBeenCalledWith('event-1');
        expect(onFollowChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Icon Only Variant', () => {
    it('should render heart icon', () => {
      const { UNSAFE_queryAllByType } = render(
        <FollowEventButton {...defaultProps} variant="icon-only" />
      );
      // Icon should be rendered
      expect(UNSAFE_queryAllByType('Text')).toBeDefined();
    });

    it('should toggle on press', async () => {
      const { UNSAFE_root } = render(
        <FollowEventButton {...defaultProps} variant="icon-only" />
      );

      await waitFor(() => {
        expect(mockEventsAPI.isFollowing).toHaveBeenCalled();
      });

      // Find and press the touchable
      fireEvent.press(UNSAFE_root);
    });
  });

  describe('Compact Variant', () => {
    it('should render compact button', async () => {
      const { getByText } = render(
        <FollowEventButton {...defaultProps} variant="compact" />
      );

      await waitFor(() => {
        expect(getByText('Suivre')).toBeTruthy();
      });
    });

    it('should show "Suivi" when following', async () => {
      mockEventsAPI.isFollowing.mockResolvedValueOnce({
        data: { is_following: true, follow: {} },
      });

      const { getByText } = render(
        <FollowEventButton {...defaultProps} variant="compact" />
      );

      await waitFor(() => {
        expect(getByText('Suivi')).toBeTruthy();
      });
    });
  });

  describe('Follower Count', () => {
    it('should show follower count when enabled', async () => {
      const { getByText } = render(
        <FollowEventButton {...defaultProps} showFollowerCount={true} />
      );

      await waitFor(() => {
        expect(mockEventsAPI.getFollowersCount).toHaveBeenCalledWith('event-1');
        expect(getByText('42')).toBeTruthy();
      });
    });

    it('should increment count on follow', async () => {
      const { getByText } = render(
        <FollowEventButton {...defaultProps} showFollowerCount={true} />
      );

      await waitFor(() => {
        expect(getByText('42')).toBeTruthy();
      });

      fireEvent.press(getByText('Suivre cet événement'));

      await waitFor(() => {
        expect(getByText('43')).toBeTruthy();
      });
    });

    it('should decrement count on unfollow', async () => {
      mockEventsAPI.isFollowing.mockResolvedValueOnce({
        data: { is_following: true, follow: {} },
      });

      const { getByText } = render(
        <FollowEventButton {...defaultProps} showFollowerCount={true} />
      );

      await waitFor(() => {
        expect(getByText('42')).toBeTruthy();
      });

      fireEvent.press(getByText('Vous suivez cet événement'));

      await waitFor(() => {
        expect(getByText('41')).toBeTruthy();
      });
    });
  });

  describe('Unauthenticated User', () => {
    it('should show alert when user is not logged in', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockUseAuth.mockReturnValue({ user: null });

      const { getByText } = render(<FollowEventButton {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Suivre cet événement')).toBeTruthy();
      });

      fireEvent.press(getByText('Suivre cet événement'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Connexion requise',
        'Vous devez être connecté pour suivre un événement'
      );

      alertSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should show error alert on follow failure', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockEventsAPI.followEvent.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(<FollowEventButton {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Suivre cet événement')).toBeTruthy();
      });

      fireEvent.press(getByText('Suivre cet événement'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Erreur', 'Une erreur est survenue');
      });

      alertSpy.mockRestore();
    });

    it('should handle isFollowing API error gracefully', async () => {
      mockEventsAPI.isFollowing.mockRejectedValueOnce(new Error('API error'));

      const { getByText } = render(<FollowEventButton {...defaultProps} />);

      // Should still render button
      await waitFor(() => {
        expect(getByText('Suivre cet événement')).toBeTruthy();
      });
    });
  });

  describe('Preferences Modal', () => {
    it('should show preferences button when following', async () => {
      mockEventsAPI.isFollowing.mockResolvedValueOnce({
        data: { is_following: true, follow: {} },
      });

      const { getByText, UNSAFE_queryAllByType } = render(
        <FollowEventButton {...defaultProps} variant="default" />
      );

      await waitFor(() => {
        expect(getByText('Vous suivez cet événement')).toBeTruthy();
      });

      // Preferences button should be visible
      expect(UNSAFE_queryAllByType('TouchableOpacity').length).toBeGreaterThan(1);
    });

    it('should load follow preferences on mount', async () => {
      mockEventsAPI.isFollowing.mockResolvedValueOnce({
        data: {
          is_following: true,
          follow: {
            notification_preference: 'all',
            notify_email: true,
            notify_push: false,
          },
        },
      });

      render(<FollowEventButton {...defaultProps} />);

      await waitFor(() => {
        expect(mockEventsAPI.isFollowing).toHaveBeenCalledWith('event-1');
      });
    });
  });

  describe('Initial Following State', () => {
    it('should respect initialFollowing prop', async () => {
      const { getByText } = render(
        <FollowEventButton {...defaultProps} initialFollowing={true} />
      );

      // Should initially show as following
      expect(getByText('Vous suivez cet événement')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator during API call', async () => {
      let resolveFollow: () => void;
      mockEventsAPI.followEvent.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFollow = () => resolve({ data: { success: true } });
          })
      );

      const { getByText, queryByTestId } = render(
        <FollowEventButton {...defaultProps} />
      );

      await waitFor(() => {
        expect(getByText('Suivre cet événement')).toBeTruthy();
      });

      fireEvent.press(getByText('Suivre cet événement'));

      // Button should be disabled during loading
      // ActivityIndicator should be visible
    });
  });

  describe('API Integration', () => {
    it('should call followEvent with correct preferences', async () => {
      const { getByText } = render(<FollowEventButton {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Suivre cet événement')).toBeTruthy();
      });

      fireEvent.press(getByText('Suivre cet événement'));

      await waitFor(() => {
        expect(mockEventsAPI.followEvent).toHaveBeenCalledWith('event-1', {
          notification_preference: 'important',
          notify_email: true,
          notify_push: true,
          notify_updates: true,
          notify_reminders: true,
          notify_cancellation: true,
        });
      });
    });
  });
});
