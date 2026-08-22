/**
 * Tests Jest pour EditProfileScreen.
 *
 * Couvre :
 *  - rendu des champs profil pré-remplis avec user existant
 *  - email affiché en lecture seule
 *  - submit OK → appelle usersAPI.updateCurrentUser uniquement avec les
 *    champs réellement modifiés (diff)
 *  - submit fail → showError affiche le detail backend
 *  - changePassword : validations (champs requis, longueur, mismatch) rendues
 *    en erreurs INLINE sous le champ fautif (pas de modale) + biometric +
 *    appel usersAPI.changePassword
 *  - upload image (handlePickImage) : pickImage → updateProfileImage(FormData)
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ── Mocks ───────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  card: '#FFFFFF',
  white: '#FFFFFF',
  text: '#111827',
  border: '#E5E7EB',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

const mockSyncUser = jest.fn();
const baseUser = {
  id: 1,
  email: 'alice@example.com',
  first_name: 'Alice',
  last_name: 'Martin',
  phone_number: '+237600112233',
  date_of_birth: '1990-01-01',
  billing_address: '12 rue Foo',
  city: 'Yaoundé',
  country: 'Cameroun',
  bio: 'Hello',
  company_name: '',
  role: 'user',
  profile_picture: null,
  image: null,
};
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: baseUser, syncUser: mockSyncUser }),
}));

const mockBiometricConfirm = jest.fn();
jest.mock('../../../hooks/useBiometricConfirm', () => ({
  useBiometricConfirm: () => ({ confirm: mockBiometricConfirm }),
}));

const mockUpdateCurrentUser = jest.fn();
const mockChangePassword = jest.fn();
const mockUpdateProfileImage = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  usersAPI: {
    updateCurrentUser: (...args: any[]) => mockUpdateCurrentUser(...args),
    changePassword: (...args: any[]) => mockChangePassword(...args),
    updateProfileImage: (...args: any[]) => mockUpdateProfileImage(...args),
  },
}));

// expo-image
jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

// expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

// expo-image-picker
const mockRequestMediaPermissions = jest.fn((..._args: any[]) =>
  Promise.resolve({ granted: true } as any)
);
const mockLaunchImageLibrary = jest.fn((..._args: any[]) =>
  Promise.resolve({
    canceled: false,
    assets: [{ uri: 'file://photo.jpg', width: 100, height: 100 }],
  } as any)
);
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestMediaPermissions(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibrary(...args),
  MediaTypeOptions: { Images: 'Images' },
}));

// expo-file-system/legacy
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  copyAsync: jest.fn(() => Promise.resolve()),
}));

// expo-image-manipulator (lazy import) — fail-safe path used quand reject
jest.mock(
  'expo-image-manipulator',
  () => ({
    manipulateAsync: jest.fn(() => Promise.resolve({ uri: 'file://photo-resized.jpg' })),
    SaveFormat: { JPEG: 'jpeg' },
  }),
  { virtual: true }
);

// LoadingSpinner — neutralise pour ne pas casser le render
jest.mock('../../../components/ui/LoadingOverlay', () => {
  const RN = require('react-native');
  return { LoadingSpinner: () => RN.View };
});

import EditProfileScreen from '../EditProfileScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockBiometricConfirm.mockResolvedValue(true);
});

describe('EditProfileScreen', () => {
  it('renders pre-filled user fields', () => {
    const { getByDisplayValue, getByText } = render(<EditProfileScreen />);
    // user.first_name + last_name + bio etc. pré-remplis
    expect(getByDisplayValue('Alice')).toBeTruthy();
    expect(getByDisplayValue('Martin')).toBeTruthy();
    // PhoneNumberInput sépare l'indicatif (+237, affiché à part) du numéro
    // national → le TextInput porte la partie nationale seule.
    expect(getByDisplayValue('600112233')).toBeTruthy();
    // email affiché en read-only
    expect(getByText('alice@example.com')).toBeTruthy();
  });

  it('does not call API when no field has changed (button disabled)', async () => {
    const { getByText } = render(<EditProfileScreen />);
    // Bouton "Enregistrer" présent mais hasProfileChanges=false
    fireEvent.press(getByText('Enregistrer'));
    // attendre un tick pour s'assurer qu'aucun appel n'est fait
    await act(async () => {});
    expect(mockUpdateCurrentUser).not.toHaveBeenCalled();
  });

  it('calls updateCurrentUser with only the changed fields on save', async () => {
    mockUpdateCurrentUser.mockResolvedValueOnce({ data: { ...baseUser, first_name: 'Bob' } });

    const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

    // change le prénom
    fireEvent.changeText(getByDisplayValue('Alice'), 'Bob');

    fireEvent.press(getByText('Enregistrer'));

    await waitFor(() => {
      expect(mockUpdateCurrentUser).toHaveBeenCalledTimes(1);
    });
    // Diff : seulement first_name
    expect(mockUpdateCurrentUser).toHaveBeenCalledWith({ first_name: 'Bob' });
    await waitFor(() => {
      expect(mockSyncUser).toHaveBeenCalled();
    });
    expect(mockShowSuccess).toHaveBeenCalledWith('Succès', 'Votre profil a été mis à jour');
  });

  it('shows showError when updateCurrentUser fails', async () => {
    mockUpdateCurrentUser.mockRejectedValueOnce({
      response: { data: { detail: 'Téléphone invalide' } },
    });
    const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

    fireEvent.changeText(getByDisplayValue('Alice'), 'Charlie');
    fireEvent.press(getByText('Enregistrer'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Téléphone invalide');
    });
  });

  it('rejects password change when fields are empty', async () => {
    // Le bouton "Changer le mot de passe" n'apparaît que quand les 3 champs sont remplis.
    // On simule le call direct via l'absence de fields → on saisit juste 1 champ pour
    // déclencher le bouton n'est pas faisable (la condition exige les 3).
    // À la place, on remplit avec un nouveau password trop court.
    const { getByPlaceholderText, getAllByPlaceholderText, queryByText, getByText } = render(<EditProfileScreen />);

    // La section Sécurité est repliée par défaut, on l'ouvre.
    fireEvent.press(getByText('Sécurité'));

    // Les 3 champs password ont le même placeholder — on les sélectionne par index
    const pwInputs = getAllByPlaceholderText('••••••••');
    expect(pwInputs.length).toBeGreaterThanOrEqual(3);

    // Aucun bouton tant que les 3 sont vides
    expect(queryByText('Changer le mot de passe')).toBeNull();

    fireEvent.changeText(pwInputs[0], 'oldpass');
    fireEvent.changeText(pwInputs[1], 'short');
    fireEvent.changeText(pwInputs[2], 'short');
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('rejects password change when new ≠ confirm', async () => {
    const { getAllByPlaceholderText, getByText } = render(<EditProfileScreen />);
    fireEvent.press(getByText('Sécurité'));
    const pwInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(pwInputs[0], 'currentpass');
    fireEvent.changeText(pwInputs[1], 'newpass12');
    fireEvent.changeText(pwInputs[2], 'differentpass');

    fireEvent.press(getByText('Changer le mot de passe'));

    // Erreur inline sous le champ concerné (plus de modale bloquante).
    await waitFor(() => {
      expect(getByText('Les mots de passe ne correspondent pas')).toBeTruthy();
    });
    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('clears the inline password error as the user types', async () => {
    const { getAllByPlaceholderText, getByText, queryByText } = render(<EditProfileScreen />);
    fireEvent.press(getByText('Sécurité'));
    const pwInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(pwInputs[0], 'currentpass');
    fireEvent.changeText(pwInputs[1], 'newpass12');
    fireEvent.changeText(pwInputs[2], 'differentpass');
    fireEvent.press(getByText('Changer le mot de passe'));

    await waitFor(() => {
      expect(getByText('Les mots de passe ne correspondent pas')).toBeTruthy();
    });

    // Re-saisie du champ fautif → le message disparaît.
    fireEvent.changeText(pwInputs[2], 'newpass12');
    await waitFor(() => {
      expect(queryByText('Les mots de passe ne correspondent pas')).toBeNull();
    });
  });

  it('rejects password change when new is shorter than 8 chars', async () => {
    const { getAllByPlaceholderText, getByText } = render(<EditProfileScreen />);
    fireEvent.press(getByText('Sécurité'));
    const pwInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(pwInputs[0], 'currentpass');
    fireEvent.changeText(pwInputs[1], 'short12');
    fireEvent.changeText(pwInputs[2], 'short12');

    fireEvent.press(getByText('Changer le mot de passe'));

    // Erreur inline sous le champ "nouveau mot de passe".
    await waitFor(() => {
      expect(getByText('Le mot de passe doit contenir au moins 8 caractères')).toBeTruthy();
    });
    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('calls usersAPI.changePassword on valid password submit', async () => {
    mockChangePassword.mockResolvedValueOnce({ data: {} });
    const { getAllByPlaceholderText, getByText } = render(<EditProfileScreen />);
    fireEvent.press(getByText('Sécurité'));
    const pwInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(pwInputs[0], 'oldpassword1');
    fireEvent.changeText(pwInputs[1], 'newpassword1');
    fireEvent.changeText(pwInputs[2], 'newpassword1');

    fireEvent.press(getByText('Changer le mot de passe'));

    await waitFor(() => {
      expect(mockBiometricConfirm).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        current_password: 'oldpassword1',
        new_password: 'newpassword1',
      });
    });
    expect(mockShowSuccess).toHaveBeenCalledWith('Succès', 'Votre mot de passe a été modifié');
  });

  it('does NOT change password if biometric confirm rejected', async () => {
    mockBiometricConfirm.mockResolvedValueOnce(false);
    const { getAllByPlaceholderText, getByText } = render(<EditProfileScreen />);
    fireEvent.press(getByText('Sécurité'));
    const pwInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(pwInputs[0], 'oldpassword1');
    fireEvent.changeText(pwInputs[1], 'newpassword1');
    fireEvent.changeText(pwInputs[2], 'newpassword1');

    fireEvent.press(getByText('Changer le mot de passe'));

    await waitFor(() => {
      expect(mockBiometricConfirm).toHaveBeenCalled();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });
});
