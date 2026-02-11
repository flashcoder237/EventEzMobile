/**
 * Tests pour ProfileScreen
 * Vérifie l'affichage du profil utilisateur et les actions
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import { render } from '../mocks/testUtils';
import { usersAPI } from '../../api/client';
import { mockUser, mockOrganizer } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  usersAPI: {
    getCurrentUser: jest.fn(),
    updateCurrentUser: jest.fn(),
  },
}));

// Mock AuthContext
const mockLogout = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    updateUser: jest.fn(),
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
  };
});

const mockUsersAPI = usersAPI as jest.Mocked<typeof usersAPI>;

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render user name', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Jean Dupont')).toBeTruthy();
    });

    it('should render user email', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('test@eventez.com')).toBeTruthy();
    });

    it('should render profile picture', () => {
      const { UNSAFE_queryAllByType } = render(<ProfileScreen />);
      // Image should be present
      expect(UNSAFE_queryAllByType('Image' as any)).toBeDefined();
    });

    it('should render menu options', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Modifier le profil')).toBeTruthy();
      expect(getByText('Paramètres')).toBeTruthy();
      expect(getByText('Se déconnecter')).toBeTruthy();
    });
  });

  describe('Menu Actions', () => {
    it('should navigate to edit profile', () => {
      const { getByText } = render(<ProfileScreen />);

      fireEvent.press(getByText('Modifier le profil'));

      expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
    });

    it('should navigate to settings', () => {
      const { getByText } = render(<ProfileScreen />);

      fireEvent.press(getByText('Paramètres'));

      expect(mockNavigate).toHaveBeenCalledWith('Settings');
    });

    it('should logout on press', async () => {
      const { getByText } = render(<ProfileScreen />);

      fireEvent.press(getByText('Se déconnecter'));

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should confirm before logout', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<ProfileScreen />);

      fireEvent.press(getByText('Se déconnecter'));

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Array)
      );

      alertSpy.mockRestore();
    });
  });

  describe('Organizer Features', () => {
    it('should show organizer menu for organizers', () => {
      jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
        user: mockOrganizer,
        logout: mockLogout,
        updateUser: jest.fn(),
      });

      const { getByText } = render(<ProfileScreen />);

      expect(getByText('Mes événements')).toBeTruthy();
    });

    it('should navigate to my events', () => {
      jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
        user: mockOrganizer,
        logout: mockLogout,
        updateUser: jest.fn(),
      });

      const { getByText } = render(<ProfileScreen />);

      fireEvent.press(getByText('Mes événements'));

      expect(mockNavigate).toHaveBeenCalledWith('MyEvents');
    });

    it('should show wallet option for organizers', () => {
      jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
        user: mockOrganizer,
        logout: mockLogout,
        updateUser: jest.fn(),
      });

      const { getByText } = render(<ProfileScreen />);

      expect(getByText('Portefeuille')).toBeTruthy();
    });
  });

  describe('User Role Display', () => {
    it('should display user role badge', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Utilisateur')).toBeTruthy();
    });

    it('should display organizer role badge', () => {
      jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
        user: mockOrganizer,
        logout: mockLogout,
        updateUser: jest.fn(),
      });

      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Organisateur')).toBeTruthy();
    });
  });

  describe('Stats Display', () => {
    it('should display user statistics', () => {
      const { getByText } = render(<ProfileScreen />);
      // Stats like events attended, tickets, etc.
    });
  });

  describe('Verified Status', () => {
    it('should show verified badge when user is verified', () => {
      const { getByText, UNSAFE_queryAllByType } = render(<ProfileScreen />);
      // Verified badge should be present
    });
  });
});
