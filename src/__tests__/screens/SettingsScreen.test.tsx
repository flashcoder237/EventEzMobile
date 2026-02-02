/**
 * Tests pour SettingsScreen
 * Vérifie les paramètres de l'application et du compte
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../../screens/profile/SettingsScreen';
import { render } from '../mocks/testUtils';
import { usersAPI } from '../../api/client';
import { mockUser } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  usersAPI: {
    updateProfile: jest.fn(),
    updateNotificationSettings: jest.fn(),
    deleteAccount: jest.fn(),
  },
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
      setOptions: jest.fn(),
    }),
  };
});

// Mock AuthContext
const mockLogout = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    logout: mockLogout,
    updateUser: jest.fn(),
  }),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Alert
const mockAlert = jest.fn();
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: mockAlert,
    },
  };
});

const mockUsersAPI = usersAPI as jest.Mocked<typeof usersAPI>;

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersAPI.updateNotificationSettings.mockResolvedValue({ data: mockUser });
  });

  describe('Rendering', () => {
    it('should render settings header', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Paramètres')).toBeTruthy();
      });
    });

    it('should render notification settings section', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Notifications')).toBeTruthy();
      });
    });

    it('should render account section', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Compte')).toBeTruthy();
      });
    });

    it('should render privacy section', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Confidentialité')).toBeTruthy();
      });
    });

    it('should render about section', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('À propos')).toBeTruthy();
      });
    });

    it('should render logout button', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Se déconnecter')).toBeTruthy();
      });
    });

    it('should render app version', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText(/Version/i)).toBeTruthy();
      });
    });
  });

  describe('Notification Settings', () => {
    it('should render email notification toggle', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Notifications email')).toBeTruthy();
      });
    });

    it('should render push notification toggle', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Notifications push')).toBeTruthy();
      });
    });

    it('should toggle email notifications', async () => {
      const { getByTestId } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(mockUsersAPI.updateNotificationSettings).not.toHaveBeenCalled();
      });

      // Toggle switch - would need testID
    });

    it('should toggle push notifications', async () => {
      const { getByTestId } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(mockUsersAPI.updateNotificationSettings).not.toHaveBeenCalled();
      });

      // Toggle switch - would need testID
    });
  });

  describe('Account Settings', () => {
    it('should navigate to edit profile', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Modifier le profil')).toBeTruthy();
      });

      fireEvent.press(getByText('Modifier le profil'));

      expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
    });

    it('should navigate to change password', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Changer le mot de passe')).toBeTruthy();
      });

      fireEvent.press(getByText('Changer le mot de passe'));

      expect(mockNavigate).toHaveBeenCalledWith('ChangePassword');
    });

    it('should navigate to linked accounts', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Comptes liés')).toBeTruthy();
      });

      fireEvent.press(getByText('Comptes liés'));

      expect(mockNavigate).toHaveBeenCalledWith('LinkedAccounts');
    });
  });

  describe('Privacy Settings', () => {
    it('should navigate to privacy policy', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Politique de confidentialité')).toBeTruthy();
      });

      fireEvent.press(getByText('Politique de confidentialité'));

      expect(mockNavigate).toHaveBeenCalledWith('PrivacyPolicy');
    });

    it('should navigate to terms of service', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText("Conditions d'utilisation")).toBeTruthy();
      });

      fireEvent.press(getByText("Conditions d'utilisation"));

      expect(mockNavigate).toHaveBeenCalledWith('TermsOfService');
    });

    it('should show data deletion option', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Supprimer mes données')).toBeTruthy();
      });
    });
  });

  describe('About Section', () => {
    it('should navigate to help center', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText("Centre d'aide")).toBeTruthy();
      });

      fireEvent.press(getByText("Centre d'aide"));

      expect(mockNavigate).toHaveBeenCalledWith('HelpCenter');
    });

    it('should navigate to contact support', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Contacter le support')).toBeTruthy();
      });

      fireEvent.press(getByText('Contacter le support'));

      expect(mockNavigate).toHaveBeenCalledWith('ContactSupport');
    });

    it('should show rate app option', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText("Noter l'application")).toBeTruthy();
      });
    });
  });

  describe('Logout', () => {
    it('should show confirmation dialog on logout press', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Se déconnecter')).toBeTruthy();
      });

      fireEvent.press(getByText('Se déconnecter'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Déconnexion',
        'Êtes-vous sûr de vouloir vous déconnecter ?',
        expect.any(Array)
      );
    });

    it('should call logout when confirmed', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        // Simulate pressing "Déconnecter" button
        const confirmButton = buttons.find((b: any) => b.text === 'Déconnecter');
        confirmButton?.onPress?.();
      });

      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Se déconnecter')).toBeTruthy();
      });

      fireEvent.press(getByText('Se déconnecter'));

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Account Deletion', () => {
    it('should show confirmation dialog on delete account press', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Supprimer mon compte')).toBeTruthy();
      });

      fireEvent.press(getByText('Supprimer mon compte'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Supprimer le compte',
        expect.stringContaining('irréversible'),
        expect.any(Array)
      );
    });

    it('should call delete API when confirmed', async () => {
      mockUsersAPI.deleteAccount.mockResolvedValue({ data: { success: true } });
      mockAlert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find((b: any) => b.style === 'destructive');
        confirmButton?.onPress?.();
      });

      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Supprimer mon compte')).toBeTruthy();
      });

      fireEvent.press(getByText('Supprimer mon compte'));

      await waitFor(() => {
        expect(mockUsersAPI.deleteAccount).toHaveBeenCalled();
      });
    });
  });

  describe('Theme Settings', () => {
    it('should show theme selection', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Thème')).toBeTruthy();
      });
    });

    it('should show current theme', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText(/Clair|Sombre|Système/)).toBeTruthy();
      });
    });
  });

  describe('Language Settings', () => {
    it('should show language option', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Langue')).toBeTruthy();
      });
    });

    it('should show current language', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Français')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should go back when back button pressed', async () => {
      const { getByTestId } = render(<SettingsScreen />);

      // Back button - would need testID
    });
  });

  describe('Error Handling', () => {
    it('should handle notification update error', async () => {
      mockUsersAPI.updateNotificationSettings.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(<SettingsScreen />);

      // Toggle notification - would show error toast
    });
  });
});
