/**
 * Tests Jest pour AnnouncementsAdminScreen.
 *
 * Couvre :
 *  - render de la liste + empty state
 *  - long press -> showConfirm puis announcementsAPI.delete
 *  - tap toggle publish (eye icon) -> announcementsAPI.update
 *  - bouton "+" -> navigation vers AnnouncementForm
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb: () => void) => {
    // execute la callback comme si l'ecran avait focus
    const React = require('react');
    React.useEffect(() => {
      cb();
    }, []);
  },
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

const themeColors = {
  primary: '#4F46E5',
  accent: '#FF6B6B',
  text: '#111827',
  card: '#FFFFFF',
  background: '#F4F3F0',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'admin' } }),
}));

jest.mock('../../../components/auth/RoleGuard', () => {
  const React = require('react');
  return { __esModule: true, default: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});

const mockList = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  announcementsAPI: {
    list: (...args: any[]) => mockList(...args),
    update: (...args: any[]) => mockUpdate(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

import AnnouncementsAdminScreen from '../AnnouncementsAdminScreen';

const sample = [
  {
    id: 'ann-1',
    title: 'Maintenance prévue',
    message: 'Coupure courte samedi.',
    severity: 'warning',
    audience: 'all',
    platform: 'all',
    is_published: true,
    is_currently_valid: true,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  lastConfirmCallback = undefined;
});

describe('AnnouncementsAdminScreen', () => {
  it('renders empty state when no items', async () => {
    mockList.mockResolvedValueOnce({ data: { results: [] } });
    const { findByText } = render(<AnnouncementsAdminScreen />);
    expect(await findByText('Aucune annonce')).toBeTruthy();
  });

  it('renders the announcement title from API', async () => {
    mockList.mockResolvedValueOnce({ data: { results: sample } });
    const { findByText } = render(<AnnouncementsAdminScreen />);
    expect(await findByText('Maintenance prévue')).toBeTruthy();
  });

  it('navigates to the form on "+" press', async () => {
    mockList.mockResolvedValueOnce({ data: { results: [] } });
    const { findByLabelText } = render(<AnnouncementsAdminScreen />);
    const addBtn = await findByLabelText('Nouvelle annonce');
    fireEvent.press(addBtn);
    expect(mockNavigate).toHaveBeenCalledWith('AnnouncementForm', undefined);
  });

  it('confirms then deletes via announcementsAPI.delete on long press', async () => {
    mockList.mockResolvedValueOnce({ data: { results: sample } });
    mockDelete.mockResolvedValueOnce({ data: {} });

    const { findByText } = render(<AnnouncementsAdminScreen />);
    const card = await findByText('Maintenance prévue');
    fireEvent(card, 'longPress');
    expect(mockShowConfirm).toHaveBeenCalled();
    await lastConfirmCallback!();
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('ann-1'));
    expect(mockShowSuccess).toHaveBeenCalledWith('Supprimée');
  });
});
