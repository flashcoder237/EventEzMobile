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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    replace: mockReplace,
  }),
  useRoute: () => ({ params: {} }),
}));

const mockShowError = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: jest.fn() }),
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
  fireEvent.changeText(getByPlaceholderText("Nom d'utilisateur"), 'alice123');
  fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'alice@example.com');
  fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
  fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'password123');
};

describe('RegisterScreen', () => {
  it('renders all the required form fields', () => {
    const { getByPlaceholderText } = render(<RegisterScreen />);
    expect(getByPlaceholderText('Prénom')).toBeTruthy();
    expect(getByPlaceholderText('Nom')).toBeTruthy();
    expect(getByPlaceholderText("Nom d'utilisateur")).toBeTruthy();
    expect(getByPlaceholderText('votre@email.com')).toBeTruthy();
    expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
    expect(getByPlaceholderText('Confirmer le mot de passe')).toBeTruthy();
  });

  it('shows error when passwords do not match', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText('Prénom'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('Nom'), 'Martin');
    fireEvent.changeText(getByPlaceholderText("Nom d'utilisateur"), 'alice123');
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'different');

    fireEvent.press(getByText('Créer mon compte'));

    expect(await findByText(/ne correspondent pas/i)).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects invalid email format', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText('Prénom'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('Nom'), 'Martin');
    fireEvent.changeText(getByPlaceholderText("Nom d'utilisateur"), 'alice123');
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'pas-un-email');
    fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'password123');

    fireEvent.press(getByText('Créer mon compte'));

    expect(await findByText(/email invalide/i)).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects password shorter than 8 characters', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText('Prénom'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('Nom'), 'Martin');
    fireEvent.changeText(getByPlaceholderText("Nom d'utilisateur"), 'alice123');
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'short');
    fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'short');

    fireEvent.press(getByText('Créer mon compte'));

    expect(await findByText(/au moins 8/i)).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('blocks submission when fields are empty (all required)', async () => {
    const { getByText, findByText } = render(<RegisterScreen />);
    fireEvent.press(getByText('Créer mon compte'));

    // first_name est validé en premier
    expect(await findByText(/prenom est requis/i)).toBeTruthy();
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
          username: 'alice123',
          email: 'alice@example.com',
          password: 'password123',
          confirm_password: 'password123',
        }),
      );
    });
  });

  it('navigates to VerifyEmail with skippable=true on register success', async () => {
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

  it('shows an error toast when authAPI.register fails', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { email: ['Cet email est déjà utilisé'] } },
    });
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    fillValidForm(getByPlaceholderText);
    fireEvent.press(getByText('Créer mon compte'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        "Erreur d'inscription",
        'Cet email est déjà utilisé',
      );
    });
  });
});
