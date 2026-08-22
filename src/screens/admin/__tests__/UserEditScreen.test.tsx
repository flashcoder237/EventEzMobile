/**
 * Tests Jest pour UserEditScreen.
 *
 * Couvre :
 *  - render avec donnees user (nom + email + roles)
 *  - changement de role + bouton "Enregistrer le rôle" -> usersAPI.updateUser({role})
 *  - "Vérifier le profil" -> usersAPI.verifyProfile
 *  - "Désactiver le compte" -> usersAPI.setUserActive(id, false)
 *  - "Supprimer l'utilisateur" -> showConfirm puis usersAPI.deleteUser + goBack
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: { userId: '42' } }),
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
let lastConfirmCallback: (() => void) | undefined;
const mockShowConfirm = jest.fn((_t: string, _m: string, onConfirm: () => void) => {
  lastConfirmCallback = onConfirm;
});
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
    showConfirm: mockShowConfirm,
  }),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('../../../contexts/FeedbackContext', () => ({
  useFeedback: () => ({
    toastSuccess: mockToastSuccess,
    toastError: mockToastError,
    toastWarning: jest.fn(),
    toastInfo: jest.fn(),
  }),
}));

const themeColors = {
  primary: '#4F46E5',
  accent: '#FF6B6B',
  text: '#111827',
  card: '#FFFFFF',
  background: '#F4F3F0',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

const mockGetUser = jest.fn();
const mockUpdateUser = jest.fn();
const mockSetUserActive = jest.fn();
const mockVerifyProfile = jest.fn();
const mockDeleteUser = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  usersAPI: {
    getUser: (...args: any[]) => mockGetUser(...args),
    updateUser: (...args: any[]) => mockUpdateUser(...args),
    setUserActive: (...args: any[]) => mockSetUserActive(...args),
    verifyProfile: (...args: any[]) => mockVerifyProfile(...args),
    deleteUser: (...args: any[]) => mockDeleteUser(...args),
  },
}));

import UserEditScreen from '../UserEditScreen';

const baseUser = {
  id: 42,
  email: 'alice@example.com',
  first_name: 'Alice',
  last_name: 'Martin',
  role: 'user',
  is_active: true,
  is_verified: false,
  phone: '+237600112233',
  company_name: '',
  date_joined: '2024-01-15T08:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  lastConfirmCallback = undefined;
});

describe('UserEditScreen', () => {
  it('loads user and renders name + email + role list', async () => {
    mockGetUser.mockResolvedValueOnce({ data: baseUser });
    const { findByText, getByText } = render(<UserEditScreen />);
    expect(await findByText('Alice Martin')).toBeTruthy();
    expect(getByText('alice@example.com')).toBeTruthy();
    expect(getByText('Utilisateur')).toBeTruthy();
    expect(getByText('Organisateur')).toBeTruthy();
    expect(getByText('Modérateur')).toBeTruthy();
    expect(getByText('Administrateur')).toBeTruthy();
  });

  it('saves role change via usersAPI.updateUser({role})', async () => {
    mockGetUser.mockResolvedValueOnce({ data: baseUser });
    mockUpdateUser.mockResolvedValueOnce({ data: { ...baseUser, role: 'organizer' } });

    const { findByText, getByText } = render(<UserEditScreen />);
    await findByText('Utilisateur');

    // Selectionne organizer -> bouton apparait
    fireEvent.press(getByText('Organisateur'));
    fireEvent.press(getByText('Enregistrer le rôle'));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1));
    expect(mockUpdateUser).toHaveBeenCalledWith('42', { role: 'organizer' });
    expect(mockToastSuccess).toHaveBeenCalledWith('Rôle mis à jour');
  });

  it('verifies the user via usersAPI.verifyProfile', async () => {
    mockGetUser.mockResolvedValueOnce({ data: baseUser });
    mockVerifyProfile.mockResolvedValueOnce({ data: {} });

    const { findByText } = render(<UserEditScreen />);
    const verifyBtn = await findByText('Vérifier le profil');
    fireEvent.press(verifyBtn);

    await waitFor(() => expect(mockVerifyProfile).toHaveBeenCalledWith('42'));
  });

  // `updateUser({is_active})` etait ignore par le backend (champ absent de
  // UserSerializer) : la reponse 200 faisait croire au succes alors que le
  // compte restait actif. La suspension passe par l'action dediee set_active.
  it('desactivates the account via usersAPI.setUserActive', async () => {
    mockGetUser.mockResolvedValueOnce({ data: baseUser });
    mockSetUserActive.mockResolvedValueOnce({ data: { is_active: false } });

    const { findByText } = render(<UserEditScreen />);
    const btn = await findByText('Désactiver le compte');
    fireEvent.press(btn);

    await waitFor(() => expect(mockSetUserActive).toHaveBeenCalledWith('42', false));
    // Le PATCH generique ne doit PAS etre utilise pour l'etat du compte.
    expect(mockUpdateUser).not.toHaveBeenCalledWith('42', { is_active: false });
  });

  it('confirms then deletes the user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: baseUser });
    mockDeleteUser.mockResolvedValueOnce({ data: {} });

    const { findByText } = render(<UserEditScreen />);
    const delBtn = await findByText("Supprimer l'utilisateur");
    fireEvent.press(delBtn);
    expect(mockShowConfirm).toHaveBeenCalled();
    await lastConfirmCallback!();

    await waitFor(() => expect(mockDeleteUser).toHaveBeenCalledWith('42'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
