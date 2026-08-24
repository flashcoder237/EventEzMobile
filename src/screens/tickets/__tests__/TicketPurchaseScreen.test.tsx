/**
 * Tests Jest pour TicketPurchaseScreen.
 *
 * Couvre :
 *  - rendu : titre événement + types de billets + bouton "Continuer" disabled
 *    quand aucun billet n'est sélectionné
 *  - increment quantity → bouton activé + récapitulatif visible
 *  - apply discount code → discountsAPI.validateDiscount + showSuccess
 *  - apply discount code invalide → message d'erreur affiché
 *  - submit billetterie : registrationsAPI.createRegistration
 *  - submit avec total > 0 → navigation vers Payment
 *  - error handling : showError quand createRegistration throw
 *
 * Note : on mocke DynamicFormFields pour ne pas dépendre du form rendering complet.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { eventId: 'evt-1' } }),
  useFocusEffect: jest.fn(),
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowAlert = jest.fn();
const mockShowConfirm = jest.fn(
  (_t: string, _m: string, onConfirm: () => void) => onConfirm(),
);
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
    showAlert: mockShowAlert,
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
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  warning: '#F59E0B',
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

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'a@b.com', first_name: 'Alice', last_name: 'M' },
  }),
}));

const mockGetEvent = jest.fn();
const mockGetTicketTypes = jest.fn();
const mockGetMyRegistrations = jest.fn();
const mockCreateRegistration = jest.fn();
const mockValidateDiscount = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  eventsAPI: {
    getEvent: (...args: any[]) => mockGetEvent(...args),
  },
  ticketTypesAPI: {
    getTicketTypes: (...args: any[]) => mockGetTicketTypes(...args),
  },
  registrationsAPI: {
    getMyRegistrations: (...args: any[]) => mockGetMyRegistrations(...args),
    createRegistration: (...args: any[]) => mockCreateRegistration(...args),
  },
  discountsAPI: {
    validateDiscount: (...args: any[]) => mockValidateDiscount(...args),
  },
}));

// useCommissionConfig : retourne config + currency
jest.mock('../../../hooks/useCommissionConfig', () => ({
  useCommissionConfig: () => ({
    config: { commission_rate: 0.05, fixed_fee: 100, currency: 'XAF' },
    currency: 'XAF',
  }),
}));

// constants/payment : on stub les helpers pour éviter une dépendance large
jest.mock('../../../constants/payment', () => ({
  calculateServiceFee: (total: number) => Math.round(total * 0.05) + 100,
  getServiceFeeLabel: () => '5% + 100',
  extractErrorMessage: (data: any, fallback: string) => data?.detail || data?.message || fallback,
}));

// DynamicFormFields → stub View
jest.mock('../../../components/forms/DynamicFormFields', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement(RN.View, { testID: 'dynamic-form' }),
  };
});

jest.mock('../../../components/ui/GradientButton', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, onPress }: any) =>
      React.createElement(RN.TouchableOpacity, { onPress }, children),
  };
});

jest.mock('../../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) =>
      React.createElement(RN.View, null, children),
    WatermarkNumeral: ({ children }: any) =>
      React.createElement(RN.View, null, children),
    EditorialButton: ({ children, onPress }: any) =>
      React.createElement(RN.TouchableOpacity, { onPress }, children),
  };
});

jest.mock('../../../components/ui/LoadingOverlay', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    LoadingSpinner: () => React.createElement(RN.View, { testID: 'loading' }),
  };
});

// ConvertedPrice utilise useCurrencyConversion → currencyAPI, qu'on n'a pas
// mocké. On stub le composant pour éviter de tirer toute la chaîne.
jest.mock('../../../components/common/ConvertedPrice', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement(RN.Text, null, '≈ 0'),
  };
});

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

import TicketPurchaseScreen from '../TicketPurchaseScreen';

// Dates calculées à l'exécution : l'événement doit rester DANS LE FUTUR pour
// passer la garde "événement terminé" du submit (end_date < now → bloqué), sinon
// createRegistration n'est jamais appelé. Dates figées = tests qui pourrissent
// avec le temps (cf. l'ancien '2026-08-13' devenu passé).
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const baseEvent = {
  id: 'evt-1',
  title: 'Festival Indie',
  event_type: 'billetterie',
  start_date: inDays(30),
  end_date: inDays(31),
  location_city: 'Yaoundé',
  location_country_code: 'CM',
  category: { name: 'Musique' },
  form_fields: [],
  organizer: { id: 99, first_name: 'Org', last_name: 'X', email: 'o@x.com' },
  is_free: false,
  base_price: 5000,
  fee_bearer: 'participant',
};

const baseTicketTypes = [
  {
    id: 1,
    name: 'Pass Standard',
    price: 5000,
    quantity_total: 100,
    quantity_sold: 10,
    quantity_available: 90,
    description: 'Accès standard',
  },
  {
    id: 2,
    name: 'Pass VIP',
    price: 15000,
    quantity_total: 20,
    quantity_sold: 5,
    quantity_available: 15,
    description: 'Carré VIP',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGetEvent.mockResolvedValue({ data: baseEvent });
  mockGetTicketTypes.mockResolvedValue({
    data: { results: baseTicketTypes },
  });
  mockGetMyRegistrations.mockResolvedValue({ data: { results: [] } });
});

describe('TicketPurchaseScreen', () => {
  it('renders event title + ticket types after fetch', async () => {
    const { findByText } = render(<TicketPurchaseScreen />);
    expect(await findByText('Festival Indie')).toBeTruthy();
    expect(await findByText('Pass Standard')).toBeTruthy();
    expect(await findByText('Pass VIP')).toBeTruthy();
  });

  it('disables Continuer when no tickets are selected (billetterie)', async () => {
    const { findByText } = render(<TicketPurchaseScreen />);
    await findByText('Pass Standard');
    fireEvent.press(await findByText('Continuer'));

    // Bouton disabled : aucun appel à l'API
    expect(mockCreateRegistration).not.toHaveBeenCalled();
  });

  it('increments ticket quantity via the + button (and shows the recap)', async () => {
    const { findByText, getAllByLabelText } = render(<TicketPurchaseScreen />);
    await findByText('Pass Standard');

    // Trois boutons "Ajouter un billet" (un par ticket type) — on prend le premier
    const addButtons = getAllByLabelText('Ajouter un billet');
    expect(addButtons.length).toBeGreaterThan(0);

    fireEvent.press(addButtons[0]);

    // Récapitulatif visible
    expect(await findByText('Récapitulatif')).toBeTruthy();
  });

  it('applies a valid discount code via discountsAPI.validateDiscount', async () => {
    mockValidateDiscount.mockResolvedValueOnce({
      data: {
        valid: true,
        discount: {
          id: 1,
          code: 'WELCOME10',
          discount_type: 'percentage',
          value: 10,
        },
        applied_amount: 500,
      },
    });

    const { findByText, getByPlaceholderText, getAllByLabelText } = render(
      <TicketPurchaseScreen />,
    );
    await findByText('Pass Standard');

    // Sélectionner 1 billet pour faire apparaître le champ code promo
    const addButtons = getAllByLabelText('Ajouter un billet');
    fireEvent.press(addButtons[0]);

    // Champ code promo apparaît une fois qu'on a une quantité > 0
    const input = await waitFor(() => getByPlaceholderText('EX: WELCOME10'));
    fireEvent.changeText(input, 'welcome10');
    fireEvent.press(await findByText('OK'));

    await waitFor(() => {
      expect(mockValidateDiscount).toHaveBeenCalledWith(
        'WELCOME10', // upper-cased par le composant
        'evt-1',
        undefined,
        5000, // subtotal du Pass Standard
      );
    });
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('WELCOME10'),
      );
    });
  });

  it('shows inline error when discount code is invalid', async () => {
    mockValidateDiscount.mockResolvedValueOnce({
      data: { valid: false, message: 'Ce code est expiré' },
    });

    const { findByText, getByPlaceholderText, getAllByLabelText } = render(
      <TicketPurchaseScreen />,
    );
    await findByText('Pass Standard');
    fireEvent.press(getAllByLabelText('Ajouter un billet')[0]);

    const input = await waitFor(() => getByPlaceholderText('EX: WELCOME10'));
    fireEvent.changeText(input, 'OLD');
    fireEvent.press(await findByText('OK'));

    expect(await findByText('Ce code est expiré')).toBeTruthy();
  });

  it('creates a registration and navigates to Payment when total > 0', async () => {
    mockCreateRegistration.mockResolvedValueOnce({
      data: { id: 'reg-1', payment_required: true },
    });

    const { findByText, getAllByLabelText } = render(<TicketPurchaseScreen />);
    await findByText('Pass Standard');

    // Ajouter 1 billet
    fireEvent.press(getAllByLabelText('Ajouter un billet')[0]);

    fireEvent.press(await findByText('Continuer'));

    await waitFor(() => {
      expect(mockCreateRegistration).toHaveBeenCalled();
    });
    const call = mockCreateRegistration.mock.calls[0][0];
    expect(call.event).toBe('evt-1');
    expect(call.registration_type).toBe('billetterie');
    expect(Array.isArray(call.tickets)).toBe(true);
    expect(call.tickets[0]).toMatchObject({ ticket_type: 1, quantity: 1 });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Payment', {
        registrationId: 'reg-1',
      });
    });
  });

  it('affiche le message backend spécifique (detail/non_field_errors) sur échec création', async () => {
    // Retour testeur : sur échec de création (ex. champ requis manquant, stock
    // épuisé, mauvais type), l'utilisateur restait bloqué avec un message
    // générique. Les ValidationError NON-field du backend registrations sont des
    // messages métier TRADUITS destinés à l'utilisateur → on les affiche pour
    // qu'il sache quoi corriger.
    mockCreateRegistration.mockRejectedValueOnce({
      response: { data: { detail: 'Stock épuisé' } },
    });

    const { findByText, getAllByLabelText } = render(<TicketPurchaseScreen />);
    await findByText('Pass Standard');
    fireEvent.press(getAllByLabelText('Ajouter un billet')[0]);
    fireEvent.press(await findByText('Continuer'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Stock épuisé');
    });
  });

  it('retombe sur le message générique si le backend ne donne pas de detail', async () => {
    // Erreur sans detail/non_field_errors exploitable → fallback traduit
    // (jamais error.message brut d'axios).
    mockCreateRegistration.mockRejectedValueOnce({
      response: { status: 500, data: {} },
    });

    const { findByText, getAllByLabelText } = render(<TicketPurchaseScreen />);
    await findByText('Pass Standard');
    fireEvent.press(getAllByLabelText('Ajouter un billet')[0]);
    fireEvent.press(await findByText('Continuer'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
    // Pas de fuite technique
    const shown = mockShowError.mock.calls[0][1];
    expect(shown).not.toContain('500');
    expect(shown).not.toMatch(/network error/i);
  });
});
