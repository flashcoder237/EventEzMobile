/**
 * Tests Jest pour NewslettersScreen.
 *
 * Couvre :
 *  - rendu de la liste de newsletters
 *  - ouverture du modal "Nouvelle newsletter"
 *  - validation : sujet requis, contenu requis
 *  - submit OK → newslettersAPI.create + showSuccess + fermeture du modal
 *  - submit fail → showError affiche le detail backend
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
const mockShowConfirm = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
    showConfirm: mockShowConfirm,
  }),
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

const mockGetAll = jest.fn();
const mockCreate = jest.fn();
const mockSendNow = jest.fn();
const mockDelete = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  newslettersAPI: {
    getAll: (...args: any[]) => mockGetAll(...args),
    create: (...args: any[]) => mockCreate(...args),
    sendNow: (...args: any[]) => mockSendNow(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

import NewslettersScreen from '../NewslettersScreen';

const newsletter = {
  id: 'n-1',
  subject: 'Nouvelle saison',
  content: '<p>Bonjour à toutes et tous</p>',
  status: 'draft' as const,
  created_at: '2026-04-01T10:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NewslettersScreen', () => {
  it('renders the list of newsletters', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: [newsletter] } });

    const { findByText } = render(<NewslettersScreen />);

    expect(await findByText('Nouvelle saison')).toBeTruthy();
    expect(await findByText('BROUILLON')).toBeTruthy();
  });

  it('opens the create modal when the + button is pressed', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: [] } });

    const { findByLabelText, findByText } = render(<NewslettersScreen />);

    // attend le render complet (hors loader)
    await findByText('Aucune newsletter');

    fireEvent.press(await findByLabelText('Nouvelle newsletter'));

    expect(await findByText('NOUVELLE NEWSLETTER')).toBeTruthy();
    expect(await findByText('Créer le brouillon')).toBeTruthy();
  });

  it('rejects submit when subject is empty', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: [] } });

    const { findByLabelText, findByText } = render(<NewslettersScreen />);
    await findByText('Aucune newsletter');

    fireEvent.press(await findByLabelText('Nouvelle newsletter'));
    fireEvent.press(await findByText('Créer le brouillon'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Sujet requis', expect.any(String));
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects submit when content is empty (subject filled)', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: [] } });

    const { findByLabelText, findByText, findByPlaceholderText } = render(<NewslettersScreen />);
    await findByText('Aucune newsletter');

    fireEvent.press(await findByLabelText('Nouvelle newsletter'));

    const subjectInput = await findByPlaceholderText('Annonce nouveau festival, programme été…');
    fireEvent.changeText(subjectInput, 'Nouveau festival');

    fireEvent.press(await findByText('Créer le brouillon'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Contenu requis', expect.any(String));
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('calls newslettersAPI.create with subject + content on valid submit', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: [] } });
    mockCreate.mockResolvedValueOnce({ data: { ...newsletter, id: 'n-2', subject: 'Hi', content: 'Body' } });

    const { findByLabelText, findByText, findByPlaceholderText } = render(<NewslettersScreen />);
    await findByText('Aucune newsletter');

    fireEvent.press(await findByLabelText('Nouvelle newsletter'));

    fireEvent.changeText(
      await findByPlaceholderText('Annonce nouveau festival, programme été…'),
      'Hi',
    );
    fireEvent.changeText(
      await findByPlaceholderText('Écris ton message ici. Du HTML simple est accepté (<b>, <a>, <p>…).'),
      'Body',
    );

    fireEvent.press(await findByText('Créer le brouillon'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ subject: 'Hi', content: 'Body' });
    });
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalled();
    });
  });

  it('shows showError when create fails', async () => {
    mockGetAll.mockResolvedValueOnce({ data: { results: [] } });
    mockCreate.mockRejectedValueOnce({ response: { data: { detail: 'Quota dépassé' } } });

    const { findByLabelText, findByText, findByPlaceholderText } = render(<NewslettersScreen />);
    await findByText('Aucune newsletter');

    fireEvent.press(await findByLabelText('Nouvelle newsletter'));

    fireEvent.changeText(
      await findByPlaceholderText('Annonce nouveau festival, programme été…'),
      'Hi',
    );
    fireEvent.changeText(
      await findByPlaceholderText('Écris ton message ici. Du HTML simple est accepté (<b>, <a>, <p>…).'),
      'Body',
    );
    fireEvent.press(await findByText('Créer le brouillon'));

    await waitFor(() => {
      // Idem : le message affiche est traduit, pas le `detail` backend brut.
      expect(mockShowError).toHaveBeenCalledWith('Erreur', expect.any(String));
      expect(mockShowError).not.toHaveBeenCalledWith('Erreur', 'Quota dépassé');
    });
  });
});
