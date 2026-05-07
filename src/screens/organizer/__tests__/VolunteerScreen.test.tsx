/**
 * Tests Jest pour VolunteerScreen — focus sur le modal "Créer un rôle"
 * (organizer view).
 *
 * Couvre :
 *  - render initial avec eventId + user organizer (bouton + visible)
 *  - open du modal create role
 *  - validation : titre requis, capacité ≥ 1
 *  - submit OK → volunteersAPI.createRole avec event + title + quantity_needed
 *  - submit fail → Alert.alert avec le detail backend
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { eventId: 'event-42' } }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryBg: '#EEF2FF',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  card: '#FFFFFF',
  white: '#FFFFFF',
  text: '#111827',
  textLight: '#9CA3AF',
  textSecondary: '#6B7280',
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

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'org@example.com', role: 'organizer' },
  }),
}));

const mockGetRoles = jest.fn();
const mockGetMyApplications = jest.fn();
const mockGetMyTasks = jest.fn();
const mockCreateRole = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  volunteersAPI: {
    getRoles: (...args: any[]) => mockGetRoles(...args),
    getMyApplications: (...args: any[]) => mockGetMyApplications(...args),
    getMyTasks: (...args: any[]) => mockGetMyTasks(...args),
    createRole: (...args: any[]) => mockCreateRole(...args),
    apply: jest.fn(),
    completeTask: jest.fn(),
    withdrawApplication: jest.fn(),
  },
}));

// LoadingSpinner stub
jest.mock('../../../components/ui/LoadingOverlay', () => {
  const RN = require('react-native');
  return { LoadingSpinner: () => RN.View };
});

import VolunteerScreen from '../VolunteerScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRoles.mockResolvedValue({ data: { results: [] } });
  mockGetMyApplications.mockResolvedValue({ data: { results: [] } });
  mockGetMyTasks.mockResolvedValue({ data: [] });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  (Alert.alert as jest.Mock).mockRestore?.();
});

describe('VolunteerScreen — create role (organizer)', () => {
  it('shows the "Créer un rôle bénévole" button for organizer', async () => {
    const { findByLabelText } = render(<VolunteerScreen />);
    expect(await findByLabelText('Créer un rôle bénévole')).toBeTruthy();
  });

  it('opens the create role modal when the + button is pressed', async () => {
    const { findByLabelText, findByText } = render(<VolunteerScreen />);

    fireEvent.press(await findByLabelText('Créer un rôle bénévole'));

    expect(await findByText('NOUVEAU RÔLE')).toBeTruthy();
    expect(await findByText('Recrute des bénévoles')).toBeTruthy();
  });

  it('rejects submit when title is empty', async () => {
    const { findByLabelText, findByText } = render(<VolunteerScreen />);

    fireEvent.press(await findByLabelText('Créer un rôle bénévole'));
    fireEvent.press(await findByText('Créer'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Titre requis', expect.any(String));
    });
    expect(mockCreateRole).not.toHaveBeenCalled();
  });

  it('rejects submit when capacity is invalid (< 1)', async () => {
    const { findByLabelText, findByText, findByPlaceholderText } = render(<VolunteerScreen />);

    fireEvent.press(await findByLabelText('Créer un rôle bénévole'));

    fireEvent.changeText(
      await findByPlaceholderText('Ex : Accueil entrée principale'),
      'Accueil',
    );
    fireEvent.changeText(await findByPlaceholderText('5'), '0');

    fireEvent.press(await findByText('Créer'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Capacité invalide', expect.any(String));
    });
    expect(mockCreateRole).not.toHaveBeenCalled();
  });

  it('calls volunteersAPI.createRole with the form payload on valid submit', async () => {
    mockCreateRole.mockResolvedValueOnce({ data: { id: 'role-1', title: 'Accueil' } });

    const { findByLabelText, findByText, findByPlaceholderText } = render(<VolunteerScreen />);

    fireEvent.press(await findByLabelText('Créer un rôle bénévole'));

    fireEvent.changeText(
      await findByPlaceholderText('Ex : Accueil entrée principale'),
      'Accueil',
    );
    fireEvent.changeText(await findByPlaceholderText('5'), '8');
    fireEvent.changeText(
      await findByPlaceholderText('Tâches, horaires, point de rdv…'),
      'Préparation salle',
    );
    fireEvent.changeText(
      await findByPlaceholderText('Ex : majeur, anglais courant…'),
      'Majeur',
    );

    fireEvent.press(await findByText('Créer'));

    await waitFor(() => {
      expect(mockCreateRole).toHaveBeenCalledWith({
        event: 'event-42',
        title: 'Accueil',
        description: 'Préparation salle',
        requirements: 'Majeur',
        quantity_needed: 8,
      });
    });
  });

  it('shows an Alert when createRole fails', async () => {
    mockCreateRole.mockRejectedValueOnce({ response: { data: { detail: 'Permission refusée' } } });

    const { findByLabelText, findByText, findByPlaceholderText } = render(<VolunteerScreen />);

    fireEvent.press(await findByLabelText('Créer un rôle bénévole'));

    fireEvent.changeText(
      await findByPlaceholderText('Ex : Accueil entrée principale'),
      'Accueil',
    );
    fireEvent.press(await findByText('Créer'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Permission refusée');
    });
  });
});
