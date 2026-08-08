/**
 * Tests Jest pour RegisterScreen.
 *
 * Couvre : rendu (tous les champs), password mismatch, email format, all
 * required, submit OK qui appelle authAPI.register avec données nettoyées,
 * submit fail qui affiche le message d'erreur via useAlert.showError.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    replace: mockReplace,
    reset: mockReset,
  }),
  useRoute: () => ({ params: {} }),
}));

const mockShowError = jest.fn();
// showAlert : déclenche l'onPress du dernier bouton (le bouton de confirmation
// "Se connecter") pour rendre la navigation testable.
const mockShowAlert = jest.fn((_title: string, _msg: string, buttons?: any[]) => {
  buttons?.[buttons.length - 1]?.onPress?.();
});
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: mockShowError,
    showSuccess: jest.fn(),
    showAlert: mockShowAlert,
  }),
}));

const themeColors = {
  primary: '#4F46E5',
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
  useAuth: () => ({ setUser: mockSetUser }),
}));

// Hooks d'auth sociale — stubs inertes (les tests ne couvrent pas le flow
// Google/Apple, juste le formulaire email).
jest.mock('../../../hooks/useSocialAuth', () => ({
  useGoogleAuth: () => ({ signIn: jest.fn(), isLoading: false, isReady: true }),
  useAppleAuth: () => ({ signIn: jest.fn(), isLoading: false, isAvailable: false }),
}));

const mockRegister = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  authAPI: {
    register: (...args: any[]) => mockRegister(...args),
  },
  setTokens: jest.fn(),
  usersAPI: { getCurrentUser: jest.fn() },
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

import RegisterScreen from '../RegisterScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

const fillValidForm = (getByPlaceholderText: any) => {
  fireEvent.changeText(getByPlaceholderText('Prénom'), 'Alice');
  fireEvent.changeText(getByPlaceholderText('Nom'), 'Martin');
  fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'alice@example.com');
  fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
};

describe('RegisterScreen', () => {
  it('renders all the required form fields', () => {
    const { getByPlaceholderText } = render(<RegisterScreen />);
    expect(getByPlaceholderText('Prénom')).toBeTruthy();
    expect(getByPlaceholderText('Nom')).toBeTruthy();
    expect(getByPlaceholderText('votre@email.com')).toBeTruthy();
    expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
  });

  it('rejects invalid email format', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText('Prénom'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('Nom'), 'Martin');
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'pas-un-email');
    fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');

    fireEvent.press(getByText('Créer mon compte'));

    expect(await findByText(/email invalide/i)).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects password shorter than 8 characters', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText('Prénom'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('Nom'), 'Martin');
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'short');

    fireEvent.press(getByText('Créer mon compte'));

    expect(await findByText(/8 caractères minimum/i)).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('blocks submission when fields are empty (all required)', async () => {
    const { getByText, findByText } = render(<RegisterScreen />);
    fireEvent.press(getByText('Créer mon compte'));

    // first_name est validé en premier
    expect(await findByText(/pr[eé]nom est requis/i)).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('calls authAPI.register with sanitized data on valid submit', async () => {
    mockRegister.mockResolvedValueOnce({ data: { email: 'alice@example.com' } });
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    fillValidForm(getByPlaceholderText);
    fireEvent.press(getByText('Créer mon compte'));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Alice',
          last_name: 'Martin',
          email: 'alice@example.com',
          password: 'password123',
          // confirm_password = password (le backend l'exige, le toggle
          // afficher/masquer rend la double saisie inutile).
          confirm_password: 'password123',
        }),
      );
    });
    // username n'est plus envoyé — le backend le dérive de l'email.
    expect(mockRegister.mock.calls[0][0]).not.toHaveProperty('username');
  });

  it('auto-login + route vers VerifyEmail (compte non vérifié) sur succès', async () => {
    // Le backend renvoie {access, refresh, user} dès l'inscription. Le screen
    // établit la session puis dispatchAfterAuth route un compte non vérifié
    // vers VerifyEmail via navigation.reset([Main, VerifyEmail]).
    mockRegister.mockResolvedValueOnce({
      data: {
        email: 'alice@example.com',
        access: 'access',
        refresh: 'refresh',
        user: { id: 1, email: 'alice@example.com', email_verified: false },
      },
    });
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    fillValidForm(getByPlaceholderText);
    fireEvent.press(getByText('Créer mon compte'));

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, email: 'alice@example.com' }),
      );
    });
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          routes: expect.arrayContaining([
            expect.objectContaining({
              name: 'VerifyEmail',
              params: expect.objectContaining({ email: 'alice@example.com', skippable: true }),
            }),
          ]),
        }),
      );
    });
  });

  it('fallback navigation.replace VerifyEmail si la réponse ne contient pas de user', async () => {
    mockRegister.mockResolvedValueOnce({ data: { email: 'alice@example.com' } });
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    fillValidForm(getByPlaceholderText);
    fireEvent.press(getByText('Créer mon compte'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        'VerifyEmail',
        expect.objectContaining({ email: 'alice@example.com', skippable: true }),
      );
    });
  });

  it('email déjà utilisé → propose de se connecter (email pré-rempli)', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { email: ['Cet email est déjà utilisé'] } },
    });
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    fillValidForm(getByPlaceholderText);
    fireEvent.press(getByText('Créer mon compte'));

    // showAlert (pas showError) avec un bouton "Se connecter".
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalled();
    });
    // Le bouton de confirmation navigue vers Login avec l'email pré-rempli.
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        'Login',
        expect.objectContaining({ prefillEmail: 'alice@example.com' }),
      );
    });
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('affiche une erreur générique pour les autres échecs', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { detail: 'Service indisponible' } },
    });
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    fillValidForm(getByPlaceholderText);
    fireEvent.press(getByText('Créer mon compte'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });
});
