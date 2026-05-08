/**
 * Tests Jest pour ResetPasswordScreen.
 *
 * Couvre : validation initiale du token (loader -> form OK / lien invalide),
 * password trop court, password sans uppercase/digit, confirm mismatch,
 * submit OK qui appelle authAPI.resetPassword(token, password), erreur API.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetParams = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setParams: mockSetParams,
  }),
  useRoute: () => ({ params: { token: 'valid-token' } }),
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const themeColors = {
  primary: '#4F46E5',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
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

const mockValidateResetToken = jest.fn();
const mockResetPassword = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  authAPI: {
    validateResetToken: (...args: any[]) => mockValidateResetToken(...args),
    resetPassword: (...args: any[]) => mockResetPassword(...args),
  },
}));

import ResetPasswordScreen from '../ResetPasswordScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

const renderValidatedForm = async () => {
  mockValidateResetToken.mockResolvedValueOnce({ data: {} });
  const utils = render(<ResetPasswordScreen />);
  // Wait for token validation to complete and the form to appear
  await waitFor(
    () => {
      expect(utils.getByPlaceholderText('Minimum 8 caractères')).toBeTruthy();
    },
    { timeout: 8000 },
  );
  return utils;
};

describe('ResetPasswordScreen', () => {
  it('validates the token and renders the form when token is valid', async () => {
    const { getByPlaceholderText } = await renderValidatedForm();
    expect(getByPlaceholderText('Minimum 8 caractères')).toBeTruthy();
    expect(getByPlaceholderText('Retapez le mot de passe')).toBeTruthy();
    expect(mockValidateResetToken).toHaveBeenCalledWith('valid-token');
  });

  it('renders the "lien invalide" state when token validation throws', async () => {
    mockValidateResetToken.mockRejectedValueOnce(new Error('invalid'));
    const { findByText } = render(<ResetPasswordScreen />);
    expect(await findByText('Lien invalide')).toBeTruthy();
  });

  it('rejects password shorter than 8 characters', async () => {
    const { getByPlaceholderText, getByText, findByText } = await renderValidatedForm();
    fireEvent.changeText(getByPlaceholderText('Minimum 8 caractères'), 'short');
    fireEvent.changeText(getByPlaceholderText('Retapez le mot de passe'), 'short');
    fireEvent.press(getByText('Réinitialiser'));

    expect(await findByText(/le mot de passe doit contenir au moins 8 caract[èe]res/i)).toBeTruthy();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('rejects password without uppercase + lowercase + digit mix', async () => {
    const { getByPlaceholderText, getByText, findByText } = await renderValidatedForm();
    fireEvent.changeText(getByPlaceholderText('Minimum 8 caractères'), 'alllowercase');
    fireEvent.changeText(getByPlaceholderText('Retapez le mot de passe'), 'alllowercase');
    fireEvent.press(getByText('Réinitialiser'));

    expect(await findByText(/majuscule, une minuscule et un chiffre/i)).toBeTruthy();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('rejects password mismatch on confirm', async () => {
    const { getByPlaceholderText, getByText, findByText } = await renderValidatedForm();
    fireEvent.changeText(getByPlaceholderText('Minimum 8 caractères'), 'StrongPass1');
    fireEvent.changeText(getByPlaceholderText('Retapez le mot de passe'), 'Different1');
    fireEvent.press(getByText('Réinitialiser'));

    expect(await findByText(/ne correspondent pas/i)).toBeTruthy();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('calls authAPI.resetPassword(token, password) on valid submit', async () => {
    mockResetPassword.mockResolvedValueOnce({ data: {} });
    const { getByPlaceholderText, getByText } = await renderValidatedForm();

    fireEvent.changeText(getByPlaceholderText('Minimum 8 caractères'), 'StrongPass1');
    fireEvent.changeText(getByPlaceholderText('Retapez le mot de passe'), 'StrongPass1');
    fireEvent.press(getByText('Réinitialiser'));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('valid-token', 'StrongPass1');
    });
  });

  it('shows the success screen after successful reset', async () => {
    mockResetPassword.mockResolvedValueOnce({ data: {} });
    const { getByPlaceholderText, getByText, findByText } = await renderValidatedForm();

    fireEvent.changeText(getByPlaceholderText('Minimum 8 caractères'), 'StrongPass1');
    fireEvent.changeText(getByPlaceholderText('Retapez le mot de passe'), 'StrongPass1');
    fireEvent.press(getByText('Réinitialiser'));

    expect(await findByText('Mot de passe mis à jour')).toBeTruthy();
  });

  it('shows error message when API rejects the password', async () => {
    mockResetPassword.mockRejectedValueOnce({
      response: { data: { password: ['Trop commun'] } },
    });
    const { getByPlaceholderText, getByText, findByText } = await renderValidatedForm();

    fireEvent.changeText(getByPlaceholderText('Minimum 8 caractères'), 'StrongPass1');
    fireEvent.changeText(getByPlaceholderText('Retapez le mot de passe'), 'StrongPass1');
    fireEvent.press(getByText('Réinitialiser'));

    expect(await findByText('Trop commun')).toBeTruthy();
  });
});
