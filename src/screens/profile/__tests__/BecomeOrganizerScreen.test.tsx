/**
 * Tests Jest pour BecomeOrganizerScreen.
 *
 * Couvre :
 *  - Step 1 (Welcome) — bouton "Continuer" passe à l'étape 2
 *  - Step 2 (Type) — switch individual/organization (clic sur card)
 *  - Step 3 (Details) — validation : phone requis ; pour 'organization',
 *    company_name + registration_number requis
 *  - Step 4 (Confirmation) — submit appelle usersAPI.becomeOrganizer +
 *    getCurrentUser + updateUser
 *  - Submit fail → showError affiche le message backend
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
const mockShowSuccess = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryBg: '#EEF2FF',
  primaryLight: '#EEF2FF',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
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

const mockUpdateUser = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'a@b.com', phone: '+237600112233' },
    updateUser: mockUpdateUser,
  }),
}));

const mockBecomeOrganizer = jest.fn();
const mockGetCurrentUser = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  usersAPI: {
    becomeOrganizer: (...args: any[]) => mockBecomeOrganizer(...args),
    getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  },
}));

// expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

import BecomeOrganizerScreen from '../BecomeOrganizerScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

const goNext = (getByText: any) => fireEvent.press(getByText('Continuer'));

describe('BecomeOrganizerScreen', () => {
  it('renders step 1 (Welcome) by default', () => {
    const { getByText } = render(<BecomeOrganizerScreen />);
    expect(getByText('Devenez Organisateur')).toBeTruthy();
    expect(getByText('Continuer')).toBeTruthy();
  });

  it('navigates step 1 → 2 (Type Selection) on Continuer', async () => {
    const { getByText, findByText } = render(<BecomeOrganizerScreen />);
    goNext(getByText);
    expect(await findByText("Quel type d'organisateur etes-vous ?")).toBeTruthy();
    // Defaut : individual selectionné
    expect(getByText('Particulier')).toBeTruthy();
    expect(getByText('Organisation')).toBeTruthy();
  });

  it('switches type to organization when card pressed', async () => {
    const { getByText, findByText, getByPlaceholderText } = render(<BecomeOrganizerScreen />);
    goNext(getByText); // step 2
    await findByText('Particulier');

    fireEvent.press(getByText('Organisation'));

    // step 3
    goNext(getByText);
    // organization-specific fields visibles
    await findByText("Nom de l'entreprise");
    expect(getByPlaceholderText('Nom de votre entreprise')).toBeTruthy();
    expect(getByPlaceholderText("Numero d'enregistrement")).toBeTruthy();
  });

  it('blocks step 3 → 4 when organization fields are missing', async () => {
    const { getByText, findByText, queryByText } = render(<BecomeOrganizerScreen />);

    goNext(getByText); // step 2
    await findByText('Particulier');
    fireEvent.press(getByText('Organisation'));

    goNext(getByText); // step 3 details
    await findByText('Vos informations');

    // ne pas remplir company_name / registration_number → erreurs
    fireEvent.press(getByText('Continuer'));

    expect(await findByText("Le nom de l'entreprise est requis")).toBeTruthy();
    expect(await findByText('Le numero SIRET/RC est requis')).toBeTruthy();
    // pas passé en step 4
    expect(queryByText('Pret a commencer !')).toBeNull();
  });

  it('clears phone validation error when user types', async () => {
    const { getByText, findByText, getByPlaceholderText, queryByText } = render(
      <BecomeOrganizerScreen />,
    );

    goNext(getByText); // step 2
    await findByText('Particulier');
    goNext(getByText); // step 3 (individual)
    await findByText('Vos informations');

    // efface phone (préremplie par user.phone)
    const phoneInput = getByPlaceholderText('Votre numero de telephone');
    fireEvent.changeText(phoneInput, '');

    fireEvent.press(getByText('Continuer'));

    expect(await findByText('Le telephone est requis')).toBeTruthy();

    // re-saisir → l'erreur disparaît du state (pas forcément du DOM tant qu'on
    // ne re-render pas, mais updateField la clear)
    fireEvent.changeText(phoneInput, '+237699112233');
    // après update, on peut re-presser Continuer pour avancer
    fireEvent.press(getByText('Continuer'));
    await waitFor(() => {
      expect(queryByText('Le telephone est requis')).toBeNull();
    });
  });

  it('calls usersAPI.becomeOrganizer with individual payload on final confirm', async () => {
    mockBecomeOrganizer.mockResolvedValueOnce({ data: { ok: true } });
    mockGetCurrentUser.mockResolvedValueOnce({ data: { id: 1, role: 'organizer' } });

    const { getByText, findByText, getByLabelText } = render(<BecomeOrganizerScreen />);

    goNext(getByText); // step 2
    await findByText('Particulier');
    goNext(getByText); // step 3
    await findByText('Vos informations');

    // phone est pré-rempli depuis user.phone, on continue directement
    goNext(getByText); // step 4
    await findByText('Pret a commencer !');

    fireEvent.press(getByLabelText('Confirmer'));

    await waitFor(() => {
      expect(mockBecomeOrganizer).toHaveBeenCalledWith(
        expect.objectContaining({
          organizer_type: 'individual',
          phone: '+237600112233',
        }),
      );
    });
    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ id: 1, role: 'organizer' });
    });
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Felicitations !',
      expect.any(String),
    );
  });

  it('calls becomeOrganizer with organization payload (company_name + registration_number)', async () => {
    mockBecomeOrganizer.mockResolvedValueOnce({ data: { ok: true } });
    mockGetCurrentUser.mockResolvedValueOnce({ data: { id: 1, role: 'organizer' } });

    const { getByText, findByText, getByPlaceholderText, getByLabelText } = render(
      <BecomeOrganizerScreen />,
    );

    goNext(getByText); // step 2
    await findByText('Particulier');
    fireEvent.press(getByText('Organisation'));

    goNext(getByText); // step 3
    await findByText('Vos informations');

    fireEvent.changeText(getByPlaceholderText('Nom de votre entreprise'), '  Acme SARL  ');
    fireEvent.changeText(getByPlaceholderText("Numero d'enregistrement"), 'RC-12345');

    goNext(getByText); // step 4
    await findByText('Pret a commencer !');

    fireEvent.press(getByLabelText('Confirmer'));

    await waitFor(() => {
      expect(mockBecomeOrganizer).toHaveBeenCalledWith(
        expect.objectContaining({
          organizer_type: 'organization',
          company_name: 'Acme SARL', // trim
          registration_number: 'RC-12345',
          phone: '+237600112233',
        }),
      );
    });
  });

  it('shows error toast when becomeOrganizer fails', async () => {
    mockBecomeOrganizer.mockRejectedValueOnce({
      response: { data: { detail: 'Profil déjà organisateur' } },
    });

    const { getByText, findByText, getByLabelText } = render(<BecomeOrganizerScreen />);

    goNext(getByText); // step 2
    await findByText('Particulier');
    goNext(getByText); // step 3
    await findByText('Vos informations');
    goNext(getByText); // step 4
    await findByText('Pret a commencer !');

    fireEvent.press(getByLabelText('Confirmer'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Profil déjà organisateur');
    });
  });
});
