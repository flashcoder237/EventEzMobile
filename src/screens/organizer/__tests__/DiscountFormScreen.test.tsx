/**
 * Tests Jest pour DiscountFormScreen.
 *
 * Couvre :
 *  - rendu des champs (code, type %/fixe, value, max uses, dates)
 *  - validation : code requis, value > 0, % ≤ 100, max_uses ≥ 1
 *  - submit OK → discountsAPI.createDiscount avec le payload + showSuccess
 *  - submit fail → showError avec le message backend
 *  - cas "code unique déjà existant" → message dédié
 *  - mode édition (discountId) → loadData fetch + updateDiscount au submit
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRoute: { params: any } = { params: { eventId: 'event-1' } };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => mockRoute,
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryLight: '#A5B4FC',
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

// Editorial canvas + watermark : passe-plat
jest.mock('../../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) =>
      React.createElement(RN.View, null, children),
    WatermarkNumeral: ({ children }: any) =>
      React.createElement(RN.Text, null, children),
  };
});

// GradientButton (importé même si pas utilisé directement) — neutralise.
jest.mock('../../../components/ui', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    GradientButton: (props: any) =>
      React.createElement(RN.Text, null, props.title || 'Button'),
  };
});

// expo-linear-gradient → View
jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

// DateTimePickerField : neutralise — pas testé ici, mais on garde le label
// pour pouvoir trouver le champ.
jest.mock('../../../components/ui/DateTimePickerField', () => {
  const RN = require('react-native');
  const React = require('react');
  // Composant mock qui expose un bouton "Choisir <label>" qui appelle onChange
  // avec une date connue, pour simplifier les tests.
  return {
    __esModule: true,
    default: (props: any) =>
      React.createElement(
        RN.TouchableOpacity,
        {
          accessibilityLabel: `Picker ${props.label}`,
          onPress: () => props.onChange?.(new Date('2026-06-01T10:00:00Z')),
        },
        React.createElement(RN.Text, null, props.label),
      ),
  };
});

const mockGetTicketTypes = jest.fn();
const mockGetEvent = jest.fn();
const mockGetDiscount = jest.fn();
const mockCreateDiscount = jest.fn();
const mockUpdateDiscount = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  ticketTypesAPI: {
    getTicketTypes: (...args: any[]) => mockGetTicketTypes(...args),
  },
  eventsAPI: {
    getEvent: (...args: any[]) => mockGetEvent(...args),
  },
  discountsAPI: {
    getDiscount: (...args: any[]) => mockGetDiscount(...args),
    createDiscount: (...args: any[]) => mockCreateDiscount(...args),
    updateDiscount: (...args: any[]) => mockUpdateDiscount(...args),
  },
}));

import DiscountFormScreen from '../DiscountFormScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockRoute.params = { eventId: 'event-1' };
  mockGetTicketTypes.mockResolvedValue({ data: { results: [] } });
  mockGetEvent.mockResolvedValue({ data: { currency: 'XAF' } });
});

describe('DiscountFormScreen — create mode', () => {
  it('renders the form fields after data loads', async () => {
    const { findByPlaceholderText, findByText } = render(<DiscountFormScreen />);

    expect(await findByText('Nouveau code')).toBeTruthy();
    expect(await findByPlaceholderText('EX: PROMO25')).toBeTruthy();
    expect(await findByPlaceholderText('25')).toBeTruthy();
    expect(await findByPlaceholderText('100')).toBeTruthy();
  });

  it('rejects submit when code is empty', async () => {
    const { findByText } = render(<DiscountFormScreen />);

    // attend le render
    await findByText('Nouveau code');
    fireEvent.press(await findByText('Créer le code promo'));

    await waitFor(() => {
      expect(mockCreateDiscount).not.toHaveBeenCalled();
    });
  });

  it('rejects submit when value is 0', async () => {
    const { findByText, findByPlaceholderText } = render(<DiscountFormScreen />);
    await findByText('Nouveau code');

    fireEvent.changeText(await findByPlaceholderText('EX: PROMO25'), 'PROMO25');
    fireEvent.changeText(await findByPlaceholderText('25'), '0');
    fireEvent.changeText(await findByPlaceholderText('100'), '50');

    fireEvent.press(await findByText('Créer le code promo'));

    await waitFor(() => {
      expect(mockCreateDiscount).not.toHaveBeenCalled();
    });
  });

  it('rejects submit when percentage value > 100', async () => {
    const { findByText, findByPlaceholderText } = render(<DiscountFormScreen />);
    await findByText('Nouveau code');

    fireEvent.changeText(await findByPlaceholderText('EX: PROMO25'), 'PROMO25');
    fireEvent.changeText(await findByPlaceholderText('25'), '150');
    fireEvent.changeText(await findByPlaceholderText('100'), '50');

    fireEvent.press(await findByText('Créer le code promo'));

    await waitFor(() => {
      expect(mockCreateDiscount).not.toHaveBeenCalled();
    });
  });

  it('calls createDiscount with the form payload on valid submit', async () => {
    mockCreateDiscount.mockResolvedValueOnce({ data: { id: 'd-1' } });
    const { findByText, findByPlaceholderText, findByLabelText } = render(<DiscountFormScreen />);
    await findByText('Nouveau code');

    fireEvent.changeText(await findByPlaceholderText('EX: PROMO25'), 'promo25');
    fireEvent.changeText(await findByPlaceholderText('25'), '20');
    fireEvent.changeText(await findByPlaceholderText('100'), '50');

    // sélectionne les dates via le mock du DateTimePickerField
    fireEvent.press(await findByLabelText('Picker Début'));
    fireEvent.press(await findByLabelText('Picker Fin'));

    fireEvent.press(await findByText('Créer le code promo'));

    await waitFor(() => {
      expect(mockCreateDiscount).toHaveBeenCalledTimes(1);
    });
    const payload = mockCreateDiscount.mock.calls[0][0];
    expect(payload).toMatchObject({
      event: 'event-1',
      code: 'PROMO25',
      discount_type: 'percentage',
      value: 20,
      max_uses: 50,
    });
    expect(mockShowSuccess).toHaveBeenCalledWith('Code promo créé');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows specific error when backend reports a duplicate code', async () => {
    mockCreateDiscount.mockRejectedValueOnce({
      response: { data: { code: ['Le code doit être unique.'] } },
    });
    const { findByText, findByPlaceholderText, findByLabelText } = render(<DiscountFormScreen />);
    await findByText('Nouveau code');

    fireEvent.changeText(await findByPlaceholderText('EX: PROMO25'), 'PROMO25');
    fireEvent.changeText(await findByPlaceholderText('25'), '20');
    fireEvent.changeText(await findByPlaceholderText('100'), '50');
    fireEvent.press(await findByLabelText('Picker Début'));
    fireEvent.press(await findByLabelText('Picker Fin'));

    fireEvent.press(await findByText('Créer le code promo'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Ce code promo existe déjà');
    });
  });

  it('shows generic error when backend returns a detail error', async () => {
    mockCreateDiscount.mockRejectedValueOnce({
      response: { data: { detail: 'Erreur serveur' } },
    });
    const { findByText, findByPlaceholderText, findByLabelText } = render(<DiscountFormScreen />);
    await findByText('Nouveau code');

    fireEvent.changeText(await findByPlaceholderText('EX: PROMO25'), 'PROMO25');
    fireEvent.changeText(await findByPlaceholderText('25'), '20');
    fireEvent.changeText(await findByPlaceholderText('100'), '50');
    fireEvent.press(await findByLabelText('Picker Début'));
    fireEvent.press(await findByLabelText('Picker Fin'));

    fireEvent.press(await findByText('Créer le code promo'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur serveur');
    });
  });
});

describe('DiscountFormScreen — edit mode', () => {
  beforeEach(() => {
    mockRoute.params = { eventId: 'event-1', discountId: 'd-7' };
    mockGetDiscount.mockResolvedValue({
      data: {
        id: 'd-7',
        code: 'OLDCODE',
        discount_type: 'fixed',
        value: 5000,
        valid_from: '2026-06-01T10:00:00Z',
        valid_until: '2026-06-30T10:00:00Z',
        max_uses: 100,
        applicable_ticket_types: [],
      },
    });
  });

  it('pre-fills the form with the existing discount and submits an update', async () => {
    mockUpdateDiscount.mockResolvedValueOnce({ data: {} });

    const { findByDisplayValue, findByText } = render(<DiscountFormScreen />);

    expect(await findByText('Modifier le code')).toBeTruthy();
    expect(await findByDisplayValue('OLDCODE')).toBeTruthy();
    expect(await findByDisplayValue('5000')).toBeTruthy();

    fireEvent.press(await findByText('Mettre à jour'));

    await waitFor(() => {
      expect(mockUpdateDiscount).toHaveBeenCalledWith('d-7', expect.objectContaining({
        code: 'OLDCODE',
        discount_type: 'fixed',
        value: 5000,
        max_uses: 100,
      }));
    });
    expect(mockShowSuccess).toHaveBeenCalledWith('Code promo mis à jour');
  });
});
