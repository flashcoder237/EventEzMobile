/**
 * Tests Jest pour WebhooksScreen.
 *
 * Couvre :
 *  - render de la liste de webhooks (titre + URL) et du bouton "+"
 *  - empty state quand aucun webhook
 *  - openCreate -> modal avec champs URL / Secret + au moins 1 type pre-coche
 *  - submitCreate avec URL invalide -> showError, pas d'API call
 *  - submitCreate OK -> webhooksAPI.create + ajout dans la liste
 *  - bouton "Tester" -> webhooksAPI.test + showSuccess
 *  - bouton "Supprimer" -> showConfirm puis webhooksAPI.delete
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
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

const mockGetAll = jest.fn();
const mockCreate = jest.fn();
const mockToggleActive = jest.fn();
const mockTest = jest.fn();
const mockDelete = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  webhooksAPI: {
    getAll: (...args: any[]) => mockGetAll(...args),
    create: (...args: any[]) => mockCreate(...args),
    toggleActive: (...args: any[]) => mockToggleActive(...args),
    test: (...args: any[]) => mockTest(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

import WebhooksScreen from '../WebhooksScreen';

const sampleHooks = [
  {
    id: 'wh-1',
    url: 'https://hooks.example.com/zap1',
    event_types: ['registration.created', 'payment.completed'],
    is_active: true,
    deliveries_count: 12,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  lastConfirmCallback = undefined;
});

describe('WebhooksScreen', () => {
  it('renders empty state when no webhooks', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: [] } });
    const { findByText } = render(<WebhooksScreen />);
    expect(await findByText('Aucun webhook')).toBeTruthy();
  });

  it('renders webhook items from API', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: sampleHooks } });
    const { findByText } = render(<WebhooksScreen />);
    expect(await findByText('https://hooks.example.com/zap1')).toBeTruthy();
  });

  it('rejects create with invalid URL', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: [] } });
    const { findByLabelText, getByPlaceholderText, getByText } = render(<WebhooksScreen />);

    // Open create modal
    const addBtn = await findByLabelText('Nouveau webhook');
    fireEvent.press(addBtn);

    // URL invalide
    fireEvent.changeText(
      getByPlaceholderText('https://hooks.zapier.com/...'),
      'not-a-url'
    );

    fireEvent.press(getByText('Créer'));
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('URL invalide', expect.any(String));
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates a webhook with valid URL + selected event types', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: [] } });
    mockCreate.mockResolvedValueOnce({
      data: {
        id: 'wh-new',
        url: 'https://my.app/hook',
        event_types: ['registration.created', 'payment.completed'],
        is_active: true,
      },
    });

    const { findByLabelText, getByPlaceholderText, getByText } = render(<WebhooksScreen />);
    const addBtn = await findByLabelText('Nouveau webhook');
    fireEvent.press(addBtn);

    fireEvent.changeText(
      getByPlaceholderText('https://hooks.zapier.com/...'),
      'https://my.app/hook'
    );

    fireEvent.press(getByText('Créer'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.url).toBe('https://my.app/hook');
    expect(payload.is_active).toBe(true);
    // openCreate pre-coche registration.created + payment.completed
    expect(payload.event_types).toEqual(
      expect.arrayContaining(['registration.created', 'payment.completed'])
    );
    expect(typeof payload.secret).toBe('string');
    expect(payload.secret.length).toBe(32);
    expect(mockShowSuccess).toHaveBeenCalled();
  });

  it('calls webhooksAPI.test when "Tester" is pressed', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: sampleHooks } });
    mockTest.mockResolvedValueOnce({ data: {} });

    const { findByText } = render(<WebhooksScreen />);
    const testBtn = await findByText('Tester');
    fireEvent.press(testBtn);

    await waitFor(() => expect(mockTest).toHaveBeenCalledWith('wh-1'));
    expect(mockShowSuccess).toHaveBeenCalledWith('Test envoyé', expect.any(String));
  });

  it('confirms then deletes webhook on "Supprimer"', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: sampleHooks } });
    mockDelete.mockResolvedValueOnce({ data: {} });

    const { findByText } = render(<WebhooksScreen />);
    const delBtn = await findByText('Supprimer');
    fireEvent.press(delBtn);
    expect(mockShowConfirm).toHaveBeenCalled();
    expect(typeof lastConfirmCallback).toBe('function');

    // execute confirm callback
    await lastConfirmCallback!();
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('wh-1'));
    expect(mockShowSuccess).toHaveBeenCalledWith('Webhook supprimé', '');
  });
});
