/**
 * Tests Jest pour RegisterOrganizerScreen.
 *
 * Couvre : multi-step form, switch individual/organization (champs visibles
 * différents en step 1), navigation step 1 -> step 2, validation des champs
 * de chaque étape, submit final qui appelle authAPI.registerOrganizer +
 * login + getCurrentUser, error handling.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    replace: mockReplace,
  }),
  useRoute: () => ({ params: {} }),
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
// showAlert : on déclenche immédiatement l'onPress du premier bouton pour
// que la navigation post-inscription (VerifyEmail) soit testable.
const mockShowAlert = jest.fn((_title: string, _msg: string, buttons?: any[]) => {
  buttons?.[0]?.onPress?.();
});
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
    showAlert: mockShowAlert,
  }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryBg: '#EEF2FF',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  card: '#FFFFFF',
  white: '#FFFFFF',
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

const mockSetUser = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ setUser: mockSetUser, isAuthenticated: false, user: null }),
}));

const mockRegisterOrganizer = jest.fn();
const mockLogin = jest.fn();
const mockSetTokens = jest.fn();
const mockGetCurrentUser = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  authAPI: {
    registerOrganizer: (...args: any[]) => mockRegisterOrganizer(...args),
    login: (...args: any[]) => mockLogin(...args),
  },
  setTokens: (...args: any[]) => mockSetTokens(...args),
  usersAPI: {
    getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  },
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

import RegisterOrganizerScreen from '../RegisterOrganizerScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

const fillStep1Individual = (getByPlaceholderText: any) => {
  fireEvent.changeText(getByPlaceholderText('Prénom'), 'Alice');
  fireEvent.changeText(getByPlaceholderText('Nom'), 'Martin');
  fireEvent.changeText(getByPlaceholderText('Téléphone'), '+237600112233');
};

const fillStep2 = (getByPlaceholderText: any) => {
  fireEvent.changeText(getByPlaceholderText("Nom d'utilisateur (optionnel)"), 'alice123');
  fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'alice@example.com');
  fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
  fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'password123');
};

describe('RegisterOrganizerScreen', () => {
  it('renders step 1 individual fields by default', () => {
    const { getByPlaceholderText, getByText } = render(<RegisterOrganizerScreen />);
    // par défaut: organizer_type = individual
    expect(getByPlaceholderText('Prénom')).toBeTruthy();
    expect(getByPlaceholderText('Nom')).toBeTruthy();
    expect(getByPlaceholderText('Téléphone')).toBeTruthy();
    expect(getByText('Étape 1 sur 2')).toBeTruthy();
  });

  it('switches to organization fields when "Organisation" is selected', () => {
    const { queryByPlaceholderText, getByText, getByPlaceholderText } = render(<RegisterOrganizerScreen />);

    fireEvent.press(getByText('Organisation'));

    expect(getByPlaceholderText("Nom de l'entreprise")).toBeTruthy();
    expect(getByPlaceholderText('Numéro SIRET / RC')).toBeTruthy();
    // les champs individuel sont cachés
    expect(queryByPlaceholderText('Prénom')).toBeNull();
  });

  it('blocks step 1 -> step 2 when individual fields are missing', async () => {
    const { getByText, findByText } = render(<RegisterOrganizerScreen />);

    fireEvent.press(getByText('Continuer'));

    expect(await findByText(/prénom est requis/i)).toBeTruthy();
    // toujours sur step 1
    expect(getByText('Étape 1 sur 2')).toBeTruthy();
  });

  it('navigates to step 2 when step 1 individual fields are valid', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<RegisterOrganizerScreen />);

    fillStep1Individual(getByPlaceholderText);
    fireEvent.press(getByText('Continuer'));

    expect(await findByText('Étape 2 sur 2')).toBeTruthy();
    // step 2 affiche username/email/password
    expect(getByPlaceholderText("Nom d'utilisateur (optionnel)")).toBeTruthy();
    expect(getByPlaceholderText('votre@email.com')).toBeTruthy();
  });

  it('blocks final submit if password mismatch on step 2', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<RegisterOrganizerScreen />);

    fillStep1Individual(getByPlaceholderText);
    fireEvent.press(getByText('Continuer'));
    await findByText('Étape 2 sur 2');

    fireEvent.changeText(getByPlaceholderText("Nom d'utilisateur (optionnel)"), 'alice123');
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'different');

    fireEvent.press(getByText('Créer mon compte'));

    expect(await findByText(/ne correspondent pas/i)).toBeTruthy();
    expect(mockRegisterOrganizer).not.toHaveBeenCalled();
  });

  it('uses the register response tokens + navigates to VerifyEmail on full valid submit', async () => {
    // Le backend renvoie directement {access, refresh, user, email} — le
    // screen n'appelle plus login() ni getCurrentUser() séparément.
    mockRegisterOrganizer.mockResolvedValueOnce({
      data: {
        access: 'access',
        refresh: 'refresh',
        user: { id: 1, email: 'alice@example.com' },
        email: 'alice@example.com',
        requires_verification: true,
      },
    });

    const { getByPlaceholderText, getByText, findByText } = render(<RegisterOrganizerScreen />);

    fillStep1Individual(getByPlaceholderText);
    fireEvent.press(getByText('Continuer'));
    await findByText('Étape 2 sur 2');

    fillStep2(getByPlaceholderText);
    fireEvent.press(getByText('Créer mon compte'));

    await waitFor(() => {
      expect(mockRegisterOrganizer).toHaveBeenCalledWith(
        expect.objectContaining({
          organizer_type: 'individual',
          first_name: 'Alice',
          last_name: 'Martin',
          email: 'alice@example.com',
          username: 'alice123',
          password: 'password123',
        }),
      );
    });

    // Tokens + user pris depuis la réponse du register — pas de login() séparé
    await waitFor(() => {
      expect(mockSetTokens).toHaveBeenCalledWith('access', 'refresh');
    });
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({ id: 1, email: 'alice@example.com' });
    });

    // L'alerte de succès → OK navigue vers l'écran de vérification email.
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        'VerifyEmail',
        expect.objectContaining({ email: 'alice@example.com', skippable: true }),
      );
    });
  });

  it('shows error when registerOrganizer fails (email already used)', async () => {
    mockRegisterOrganizer.mockRejectedValueOnce({
      response: { data: { email: ['Cet email est déjà utilisé'] } },
    });

    const { getByPlaceholderText, getByText, findByText } = render(<RegisterOrganizerScreen />);

    fillStep1Individual(getByPlaceholderText);
    fireEvent.press(getByText('Continuer'));
    await findByText('Étape 2 sur 2');

    fillStep2(getByPlaceholderText);
    fireEvent.press(getByText('Créer mon compte'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        "Erreur d'inscription",
        'Cet email est déjà utilisé',
      );
    });
  });
});
