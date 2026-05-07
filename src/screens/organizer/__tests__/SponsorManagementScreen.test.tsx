/**
 * Tests Jest pour SponsorManagementScreen.
 *
 * Couvre :
 *  - rendu de la liste des sponsors (pending + confirmed)
 *  - bouton "Confirmer le sponsor" → appelle sponsorsAPI.confirm(id)
 *  - showSuccess après confirmation OK
 *  - rollback + showError si confirm() throw
 *  - empty state quand aucun sponsor
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { eventId: 'event-1' } }),
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
  success: '#10B981',
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

const mockGetByEvent = jest.fn();
const mockConfirm = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  sponsorsAPI: {
    getByEvent: (...args: any[]) => mockGetByEvent(...args),
    confirm: (...args: any[]) => mockConfirm(...args),
  },
  getMediaUrl: (s: string | null) => s || null,
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

import SponsorManagementScreen from '../SponsorManagementScreen';

const sponsorPending = {
  id: 'sp-1',
  event: 'event-1',
  package: 1,
  package_name: 'Gold',
  sponsor_name: 'ACME Corp',
  sponsor_logo: null,
  is_confirmed: false,
  visibility_count: 12,
  click_count: 3,
};

const sponsorConfirmed = {
  ...sponsorPending,
  id: 'sp-2',
  sponsor_name: 'Globex',
  is_confirmed: true,
  visibility_count: 99,
  click_count: 24,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SponsorManagementScreen', () => {
  it('renders the sponsor list (pending + confirmed)', async () => {
    mockGetByEvent.mockResolvedValueOnce({ data: { results: [sponsorPending, sponsorConfirmed] } });

    const { findByText } = render(<SponsorManagementScreen />);

    expect(await findByText('ACME Corp')).toBeTruthy();
    expect(await findByText('Globex')).toBeTruthy();
    // status pills
    expect(await findByText('EN ATTENTE')).toBeTruthy();
    expect(await findByText('CONFIRMÉ')).toBeTruthy();
  });

  it('shows the empty state when no sponsors are returned', async () => {
    mockGetByEvent.mockResolvedValueOnce({ data: { results: [] } });

    const { findByText } = render(<SponsorManagementScreen />);
    expect(await findByText('Aucun sponsor')).toBeTruthy();
  });

  it('calls sponsorsAPI.confirm and shows success on confirm action', async () => {
    mockGetByEvent.mockResolvedValueOnce({ data: { results: [sponsorPending] } });
    mockConfirm.mockResolvedValueOnce({ data: {} });

    const { findByText } = render(<SponsorManagementScreen />);

    const confirmBtn = await findByText('Confirmer le sponsor');
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('sp-1');
    });
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalled();
    });
  });

  it('rolls back optimistic flip and shows error when confirm throws', async () => {
    mockGetByEvent.mockResolvedValueOnce({ data: { results: [sponsorPending] } });
    mockConfirm.mockRejectedValueOnce({ response: { data: { detail: 'Permission refusée' } } });

    const { findByText } = render(<SponsorManagementScreen />);

    const confirmBtn = await findByText('Confirmer le sponsor');
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Permission refusée');
    });
  });

  it('shows an error toast when the initial fetch fails', async () => {
    mockGetByEvent.mockRejectedValueOnce({ response: { data: { detail: 'Network down' } } });

    render(<SponsorManagementScreen />);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Network down');
    });
  });
});
