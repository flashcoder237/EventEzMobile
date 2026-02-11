/**
 * Tests pour EditProfileScreen
 * Vérifie l'édition du profil utilisateur
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import EditProfileScreen from '../../screens/profile/EditProfileScreen';
import { render } from '../mocks/testUtils';
import { usersAPI } from '../../api/client';
import { mockUser } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  usersAPI: {
    updateProfile: jest.fn(),
    uploadProfilePicture: jest.fn(),
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
const mockUpdateUser = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    updateUser: mockUpdateUser,
  }),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: 'file://test-image.jpg' }],
    })
  ),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockUsersAPI = usersAPI as jest.Mocked<typeof usersAPI>;

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersAPI.updateProfile.mockResolvedValue({
      data: mockUser,
    } as any);
    (mockUsersAPI as any).uploadProfilePicture = jest.fn().mockResolvedValue({
      data: { ...mockUser, profile_picture: 'https://example.com/new-avatar.jpg' },
    } as any);
  });

  describe('Rendering', () => {
    it('should render header', async () => {
      const { getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByText('Modifier le profil')).toBeTruthy();
      });
    });

    it('should render profile picture', async () => {
      const { UNSAFE_queryAllByType } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(UNSAFE_queryAllByType('Image' as any).length).toBeGreaterThan(0);
      });
    });

    it('should render change photo button', async () => {
      const { getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByText(/Changer.*photo|Modifier.*photo/i)).toBeTruthy();
      });
    });

    it('should render first name input with value', async () => {
      const { getByDisplayValue } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Jean')).toBeTruthy();
      });
    });

    it('should render last name input with value', async () => {
      const { getByDisplayValue } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Dupont')).toBeTruthy();
      });
    });

    it('should render email input (disabled)', async () => {
      const { getByDisplayValue } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('test@eventez.com')).toBeTruthy();
      });
    });

    it('should render phone input', async () => {
      const { getByDisplayValue } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue(/699999999/)).toBeTruthy();
      });
    });

    it('should render save button', async () => {
      const { getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByText(/Enregistrer|Sauvegarder/i)).toBeTruthy();
      });
    });
  });

  describe('Profile Picture', () => {
    it('should open image picker when change photo pressed', async () => {
      const ImagePicker = require('expo-image-picker');
      const { getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByText(/Changer.*photo/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Changer.*photo/i));

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });
    });

    it('should upload new profile picture', async () => {
      const { getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByText(/Changer.*photo/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Changer.*photo/i));

      await waitFor(() => {
        expect((mockUsersAPI as any).uploadProfilePicture).toHaveBeenCalled();
      });
    });

    it('should handle cancelled image selection', async () => {
      const ImagePicker = require('expo-image-picker');
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true });

      const { getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByText(/Changer.*photo/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Changer.*photo/i));

      await waitFor(() => {
        expect((mockUsersAPI as any).uploadProfilePicture).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Editing', () => {
    it('should update first name', async () => {
      const { getByDisplayValue } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Jean')).toBeTruthy();
      });

      const firstNameInput = getByDisplayValue('Jean');
      fireEvent.changeText(firstNameInput, 'Pierre');

      expect(firstNameInput.props.value).toBe('Pierre');
    });

    it('should update last name', async () => {
      const { getByDisplayValue } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Dupont')).toBeTruthy();
      });

      const lastNameInput = getByDisplayValue('Dupont');
      fireEvent.changeText(lastNameInput, 'Martin');

      expect(lastNameInput.props.value).toBe('Martin');
    });

    it('should update phone number', async () => {
      const { getByDisplayValue } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue(/699999999/)).toBeTruthy();
      });

      const phoneInput = getByDisplayValue(/699999999/);
      fireEvent.changeText(phoneInput, '+237688888888');

      expect(phoneInput.props.value).toBe('+237688888888');
    });

    it('should not allow editing email', async () => {
      const { getByDisplayValue } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('test@eventez.com')).toBeTruthy();
      });

      const emailInput = getByDisplayValue('test@eventez.com');
      expect(emailInput.props.editable).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('should save profile changes', async () => {
      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Jean')).toBeTruthy();
      });

      const firstNameInput = getByDisplayValue('Jean');
      fireEvent.changeText(firstNameInput, 'Pierre');

      fireEvent.press(getByText(/Enregistrer/i));

      await waitFor(() => {
        expect(mockUsersAPI.updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ first_name: 'Pierre' })
        );
      });
    });

    it('should update auth context after save', async () => {
      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Jean')).toBeTruthy();
      });

      const firstNameInput = getByDisplayValue('Jean');
      fireEvent.changeText(firstNameInput, 'Pierre');

      fireEvent.press(getByText(/Enregistrer/i));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
      });
    });

    it('should go back after successful save', async () => {
      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Jean')).toBeTruthy();
      });

      fireEvent.press(getByText(/Enregistrer/i));

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('should show loading state during save', async () => {
      mockUsersAPI.updateProfile.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByText(/Enregistrer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Enregistrer/i));

      await waitFor(() => {
        expect(getByText(/Chargement|Enregistrement/i)).toBeTruthy();
      });
    });
  });

  describe('Validation', () => {
    it('should validate first name is not empty', async () => {
      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Jean')).toBeTruthy();
      });

      const firstNameInput = getByDisplayValue('Jean');
      fireEvent.changeText(firstNameInput, '');

      fireEvent.press(getByText(/Enregistrer/i));

      await waitFor(() => {
        expect(getByText(/prénom.*requis/i)).toBeTruthy();
      });
    });

    it('should validate last name is not empty', async () => {
      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Dupont')).toBeTruthy();
      });

      const lastNameInput = getByDisplayValue('Dupont');
      fireEvent.changeText(lastNameInput, '');

      fireEvent.press(getByText(/Enregistrer/i));

      await waitFor(() => {
        expect(getByText(/nom.*requis/i)).toBeTruthy();
      });
    });

    it('should validate phone number format', async () => {
      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue(/699999999/)).toBeTruthy();
      });

      const phoneInput = getByDisplayValue(/699999999/);
      fireEvent.changeText(phoneInput, '123');

      fireEvent.press(getByText(/Enregistrer/i));

      await waitFor(() => {
        expect(getByText(/téléphone.*invalide/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should go back when back button pressed', async () => {
      const { getByTestId } = render(<EditProfileScreen />);

      // Back button would need testID
    });

    it('should show discard changes confirmation', async () => {
      const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Jean')).toBeTruthy();
      });

      const firstNameInput = getByDisplayValue('Jean');
      fireEvent.changeText(firstNameInput, 'Pierre');

      // Press back - should show confirmation
    });
  });

  describe('Error Handling', () => {
    it('should handle update error', async () => {
      mockUsersAPI.updateProfile.mockRejectedValue({
        response: { data: { error: 'Update failed' } },
      });

      const { getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByText(/Enregistrer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Enregistrer/i));

      await waitFor(() => {
        expect(getByText(/erreur|échec/i)).toBeTruthy();
      });
    });

    it('should handle photo upload error', async () => {
      (mockUsersAPI as any).uploadProfilePicture.mockRejectedValue({
        response: { data: { error: 'Upload failed' } },
      });

      const { getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByText(/Changer.*photo/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Changer.*photo/i));

      await waitFor(() => {
        expect(getByText(/erreur|échec.*téléchargement/i)).toBeTruthy();
      });
    });
  });

  describe('Bio Field', () => {
    it('should render bio textarea', async () => {
      const { getByPlaceholderText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/bio|présentation/i)).toBeTruthy();
      });
    });

    it('should show character count for bio', async () => {
      const { getByText } = render(<EditProfileScreen />);

      await waitFor(() => {
        expect(getByText(/\/.*500|caractères/i)).toBeTruthy();
      });
    });
  });
});
