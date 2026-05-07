/**
 * Tests Jest pour AnnouncementFormScreen.
 *
 * Mode "creation" (sans `announcementId` en route params) :
 *  - render des sections / champs principaux
 *  - validation : title + message requis -> showError, pas d'appel API
 *  - submit OK -> announcementsAPI.create avec payload trim() + valid_from/valid_until null si vides
 *  - submit fail -> showError
 *
 * Mode "edition" (avec `announcementId`) :
 *  - charge l'annonce -> pre-remplit les champs
 *  - submit -> announcementsAPI.update
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Navigation
const mockGoBack = jest.fn();
let mockRouteParams: any = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

// Alerts
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

// Theme
const themeColors = {
  primary: '#4F46E5',
  accent: '#FF6B6B',
  text: '#111827',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

// Auth — admin pour bypass RoleGuard
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, email: 'admin@x.com', role: 'admin' } }),
}));

// RoleGuard : on le neutralise pour rendre directement les enfants
jest.mock('../../../components/auth/RoleGuard', () => {
  const React = require('react');
  return { __esModule: true, default: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});

// API
const mockGet = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  announcementsAPI: {
    get: (...args: any[]) => mockGet(...args),
    create: (...args: any[]) => mockCreate(...args),
    update: (...args: any[]) => mockUpdate(...args),
  },
}));

import AnnouncementFormScreen from '../AnnouncementFormScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
});

describe('AnnouncementFormScreen — creation', () => {
  it('renders title + message inputs and create button', () => {
    const { getByText, getByPlaceholderText } = render(<AnnouncementFormScreen />);
    expect(getByText('Nouvelle annonce')).toBeTruthy();
    expect(getByPlaceholderText('Ex: Maintenance programmée samedi')).toBeTruthy();
    expect(getByPlaceholderText('Texte affiché aux utilisateurs')).toBeTruthy();
    expect(getByText("Créer l'annonce")).toBeTruthy();
  });

  it('blocks submit when title or message is empty', async () => {
    const { getByText } = render(<AnnouncementFormScreen />);
    fireEvent.press(getByText("Créer l'annonce"));
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Champs requis',
        'Titre et message sont obligatoires.'
      );
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('calls announcementsAPI.create with trimmed payload + null dates when fields blank', async () => {
    mockCreate.mockResolvedValueOnce({ data: { id: 'ann-1' } });

    const { getByText, getByPlaceholderText } = render(<AnnouncementFormScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Ex: Maintenance programmée samedi'),
      '  Maintenance  '
    );
    fireEvent.changeText(
      getByPlaceholderText('Texte affiché aux utilisateurs'),
      '  Site indispo samedi  '
    );

    fireEvent.press(getByText("Créer l'annonce"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.title).toBe('Maintenance');
    expect(payload.message).toBe('Site indispo samedi');
    expect(payload.severity).toBe('info');
    expect(payload.audience).toBe('all');
    expect(payload.platform).toBe('all');
    expect(payload.valid_from).toBeNull();
    expect(payload.valid_until).toBeNull();
    expect(payload.is_published).toBe(false);
    expect(mockShowSuccess).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows backend error when create fails (DRF field error)', async () => {
    mockCreate.mockRejectedValueOnce({
      response: { data: { title: ['Ce champ est trop court.'] } },
    });

    const { getByText, getByPlaceholderText } = render(<AnnouncementFormScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Ex: Maintenance programmée samedi'),
      'A'
    );
    fireEvent.changeText(
      getByPlaceholderText('Texte affiché aux utilisateurs'),
      'msg'
    );

    fireEvent.press(getByText("Créer l'annonce"));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Ce champ est trop court.');
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

describe('AnnouncementFormScreen — edition', () => {
  it('fetches the announcement and pre-fills the form, then update calls announcementsAPI.update', async () => {
    mockRouteParams = { announcementId: 'ann-42' };
    mockGet.mockResolvedValueOnce({
      data: {
        title: 'Old title',
        message: 'Old message',
        severity: 'warning',
        is_dismissible: true,
        cta_label: '',
        cta_url: '',
        audience: 'all',
        platform: 'all',
        target_min_app_version: '',
        target_max_app_version: '',
        valid_from: '',
        valid_until: '',
        is_published: true,
      },
    });
    mockUpdate.mockResolvedValueOnce({ data: { id: 'ann-42' } });

    const { findByDisplayValue, getByText } = render(<AnnouncementFormScreen />);
    // pre-fill OK
    expect(await findByDisplayValue('Old title')).toBeTruthy();
    expect(await findByDisplayValue('Old message')).toBeTruthy();

    // submit -> update
    fireEvent.press(getByText('Enregistrer'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdate.mock.calls[0][0]).toBe('ann-42');
    expect(mockUpdate.mock.calls[0][1].title).toBe('Old title');
    expect(mockShowSuccess).toHaveBeenCalled();
  });
});

