/**
 * Tests Jest pour ForgotPasswordScreen.
 *
 * Couvre : rendu (champ email), email requis, email invalide, submit OK qui
 * appelle authAPI.requestPasswordReset, success state qui remplace le form
 * par le message de confirmation.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
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

const mockRequestPasswordReset = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  authAPI: {
    requestPasswordReset: (...args: any[]) => mockRequestPasswordReset(...args),
  },
}));

import ForgotPasswordScreen from '../ForgotPasswordScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ForgotPasswordScreen', () => {
  it('renders the email input and submit CTA', () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    expect(getByPlaceholderText('votre@email.com')).toBeTruthy();
    expect(getByText('Envoyer le lien')).toBeTruthy();
  });

  it('shows "email requis" when submitting empty form', async () => {
    const { getByText, findByText } = render(<ForgotPasswordScreen />);
    fireEvent.press(getByText('Envoyer le lien'));

    expect(await findByText(/email est requis/i)).toBeTruthy();
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('rejects invalid email format', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'pas-un-email');
    fireEvent.press(getByText('Envoyer le lien'));

    expect(await findByText(/email invalide/i)).toBeTruthy();
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('calls authAPI.requestPasswordReset with lowercase email on valid submit', async () => {
    mockRequestPasswordReset.mockResolvedValueOnce({ data: {} });
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), '  Foo@Bar.COM ');
    fireEvent.press(getByText('Envoyer le lien'));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('foo@bar.com');
    });
  });

  it('renders the success state after successful submission', async () => {
    mockRequestPasswordReset.mockResolvedValueOnce({ data: {} });
    const { getByPlaceholderText, getByText, findByText } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'alice@example.com');
    fireEvent.press(getByText('Envoyer le lien'));

    expect(await findByText('Check ta boîte mail')).toBeTruthy();
  });

  it('shows the success state even when API returns generic error (security)', async () => {
    mockRequestPasswordReset.mockRejectedValueOnce({ response: { data: {} } });
    const { getByPlaceholderText, getByText, findByText } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'unknown@example.com');
    fireEvent.press(getByText('Envoyer le lien'));

    // Le composant affiche succès même si l'email n'existe pas (anti-énumération)
    expect(await findByText('Check ta boîte mail')).toBeTruthy();
  });

  it('shows error toast when API returns a field-specific error', async () => {
    mockRequestPasswordReset.mockRejectedValueOnce({
      response: { data: { email: 'Email mal formé' } },
    });
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'alice@example.com');
    fireEvent.press(getByText('Envoyer le lien'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Email mal formé');
    });
  });
});
