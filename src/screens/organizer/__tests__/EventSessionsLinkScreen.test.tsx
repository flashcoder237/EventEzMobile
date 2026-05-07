/**
 * Tests Jest pour EventSessionsLinkScreen.
 *
 * Couvre :
 *  - render des billets et sessions chargees depuis l'API
 *  - toggle d'une session sur un billet -> bouton "Enregistrer" apparait
 *  - submit -> ticketTypesAPI.patchTicketType pour les billets modifies
 *  - showSuccess + refetch
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: { eventId: 'evt-1' } }),
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

const mockGetTicketTypes = jest.fn();
const mockPatchTicketType = jest.fn();
const mockGetSessions = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  ticketTypesAPI: {
    getTicketTypes: (...args: any[]) => mockGetTicketTypes(...args),
    patchTicketType: (...args: any[]) => mockPatchTicketType(...args),
  },
  sessionsAPI: {
    getSessions: (...args: any[]) => mockGetSessions(...args),
  },
}));

// expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

// Editorial canvas / watermark — neutralise
jest.mock('../../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) => React.createElement(RN.View, null, children),
    WatermarkNumeral: () => null,
  };
});

// StaggeredItem
jest.mock('../../../components/ui/Animations', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    StaggeredItem: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

import EventSessionsLinkScreen from '../EventSessionsLinkScreen';

const tickets = [
  { id: 'tk-1', name: 'Pass Standard', price: 5000, included_sessions: [] },
];
const sessions = [
  { id: 'ses-1', title: 'Keynote douverture', start_time: '2025-01-01T09:00:00Z', session_type: 'keynote' },
  { id: 'ses-2', title: 'Atelier React', start_time: '2025-01-01T10:00:00Z', session_type: 'workshop' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EventSessionsLinkScreen', () => {
  it('renders tickets and sessions from API', async () => {
    mockGetTicketTypes.mockResolvedValueOnce({ data: { results: tickets } });
    mockGetSessions.mockResolvedValueOnce({ data: { results: sessions } });

    const { findByText } = render(<EventSessionsLinkScreen />);
    expect(await findByText('Pass Standard')).toBeTruthy();
    expect(await findByText('Keynote douverture')).toBeTruthy();
    expect(await findByText('Atelier React')).toBeTruthy();
  });

  it('toggles a session and calls patchTicketType on save', async () => {
    mockGetTicketTypes.mockResolvedValueOnce({ data: { results: tickets } });
    mockGetSessions.mockResolvedValueOnce({ data: { results: sessions } });
    mockPatchTicketType.mockResolvedValueOnce({ data: {} });
    // refetch apres save
    mockGetTicketTypes.mockResolvedValueOnce({
      data: { results: [{ ...tickets[0], included_sessions: ['ses-1'] }] },
    });
    mockGetSessions.mockResolvedValueOnce({ data: { results: sessions } });

    const { findByText, findByLabelText } = render(<EventSessionsLinkScreen />);
    const sessionRow = await findByText('Keynote douverture');

    // Toggle ON
    fireEvent.press(sessionRow);

    // Le bouton save est sticky (toujours visible quand tickets+sessions > 0).
    // accessibilityLabel="Enregistrer les liaisons"
    const saveBtn = await findByLabelText('Enregistrer les liaisons');
    fireEvent.press(saveBtn);

    await waitFor(() => expect(mockPatchTicketType).toHaveBeenCalledTimes(1));
    expect(mockPatchTicketType).toHaveBeenCalledWith('tk-1', {
      included_sessions: ['ses-1'],
    });
    expect(mockShowSuccess).toHaveBeenCalledWith('Liaisons enregistrées');
  });
});
