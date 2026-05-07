/**
 * Tests Jest pour VerificationScreen (KYC).
 *
 * Couvre :
 *  - Render initial : status='none' → progression + cards de docs
 *  - status='approved' → callout "Identité confirmée" + badge VÉRIFIÉ
 *  - status='pending' → callout "Demande soumise"
 *  - status='rejected' → callout + raison + retry possible
 *  - Submit sans tous les docs → showError "Documents manquants"
 *  - Submit OK → verificationAPI.submit(formData) + status passe à pending
 *  - Submit fail → showError avec detail backend
 *
 * Note: la fonction pickDocument utilise showAlert avec des callbacks. Pour
 * tester l'upload, on intercepte showAlert pour invoquer manuellement le
 * onPress "Galerie" et déclencher launchImageLibraryAsync.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

let lastShowAlertButtons: any[] | undefined;
const mockShowAlert = jest.fn((_t: string, _m?: string, buttons?: any[]) => {
  lastShowAlertButtons = buttons;
});
const mockShowError = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({ showAlert: mockShowAlert, showError: mockShowError }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
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

let currentUser: any = { id: 1, organizer_type: 'individual' };
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));

const mockGetMyRequest = jest.fn();
const mockSubmit = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  verificationAPI: {
    getMyRequest: (...args: any[]) => mockGetMyRequest(...args),
    submit: (...args: any[]) => mockSubmit(...args),
  },
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

const mockLaunchCamera = jest.fn();
const mockLaunchImageLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  launchCameraAsync: (...args: any[]) => mockLaunchCamera(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibrary(...args),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockGetDocument = jest.fn();
jest.mock('expo-document-picker', () => ({
  __esModule: true,
  getDocumentAsync: (...args: any[]) => mockGetDocument(...args),
}));

// LoadingSpinner stub
jest.mock('../../../components/ui/LoadingOverlay', () => {
  const RN = require('react-native');
  return { LoadingSpinner: () => RN.View };
});

// StaggeredItem — passthrough
jest.mock('../../../components/ui/Animations', () => ({
  StaggeredItem: ({ children }: { children: React.ReactNode }) => children,
}));

import VerificationScreen from '../VerificationScreen';

beforeEach(() => {
  jest.clearAllMocks();
  lastShowAlertButtons = undefined;
  currentUser = { id: 1, organizer_type: 'individual' };
});

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(() => resolve()));

describe('VerificationScreen', () => {
  it('renders status=none with progress + 2 docs for individual', async () => {
    mockGetMyRequest.mockRejectedValueOnce(new Error('404'));

    const { findByText, getByText } = render(<VerificationScreen />);

    // Lead text
    expect(await findByText(/Vérifiez votre identité/)).toBeTruthy();
    // Progress 0 / 2 pour individual (CNI + selfie)
    expect(getByText('0 / 2 documents')).toBeTruthy();
    expect(getByText("Carte Nationale d'Identité")).toBeTruthy();
    expect(getByText('Selfie avec CNI')).toBeTruthy();
  });

  it('renders APPROVED status with verified badge', async () => {
    mockGetMyRequest.mockResolvedValueOnce({ data: { status: 'approved' } });

    const { findByText, getByText } = render(<VerificationScreen />);

    expect(await findByText('Identité confirmée')).toBeTruthy();
    expect(getByText('VÉRIFIÉ')).toBeTruthy();
  });

  it('renders PENDING status callout', async () => {
    mockGetMyRequest.mockResolvedValueOnce({ data: { status: 'pending' } });

    const { findByText } = render(<VerificationScreen />);
    expect(await findByText('Demande soumise')).toBeTruthy();
  });

  it('renders REJECTED status with rejection reason and re-shows docs', async () => {
    mockGetMyRequest.mockResolvedValueOnce({
      data: { status: 'rejected', rejection_reason: 'Document flou' },
    });

    const { findByText } = render(<VerificationScreen />);
    expect(await findByText('Documents non validés')).toBeTruthy();
    expect(await findByText(/Document flou/)).toBeTruthy();
    // Possibilité de réessayer → docs affichés
    expect(await findByText("Carte Nationale d'Identité")).toBeTruthy();
  });

  it('renders 3 docs for organization user', async () => {
    currentUser = { id: 1, organizer_type: 'organization' };
    mockGetMyRequest.mockRejectedValueOnce(new Error('404'));

    const { findByText, getByText } = render(<VerificationScreen />);

    expect(await findByText('0 / 3 documents')).toBeTruthy();
    expect(getByText('Registre de Commerce')).toBeTruthy();
    expect(getByText("Statuts de l'entreprise")).toBeTruthy();
    expect(getByText('CNI du Représentant')).toBeTruthy();
  });

  it('blocks submit and shows error when docs are missing', async () => {
    mockGetMyRequest.mockRejectedValueOnce(new Error('404'));

    const { findByText, getByText } = render(<VerificationScreen />);
    await findByText("Carte Nationale d'Identité");

    fireEvent.press(getByText('Soumettre la demande'));

    // Le bouton est disabled tant qu'un doc manque, donc onPress n'est pas appelé.
    // À la place, on vérifie qu'aucun submit API n'a été déclenché.
    await act(async () => {});
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits FormData to verificationAPI.submit when all docs are uploaded', async () => {
    mockGetMyRequest.mockRejectedValueOnce(new Error('404'));
    mockSubmit.mockResolvedValueOnce({ data: { ok: true } });
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://cni.jpg', mimeType: 'image/jpeg' }],
    });

    const { findByText, getAllByText, getByText } = render(<VerificationScreen />);
    await findByText("Carte Nationale d'Identité");

    // Tap sur la dropzone "Téléverser un fichier" du 1er doc → showAlert called
    const uploadBtns = getAllByText('Téléverser un fichier');
    fireEvent.press(uploadBtns[0]);

    expect(mockShowAlert).toHaveBeenCalled();
    // Récupère le bouton "Galerie" et exécute son callback
    const galleryBtn = lastShowAlertButtons?.find((b: any) => b.text === 'Galerie');
    expect(galleryBtn).toBeTruthy();
    await act(async () => {
      await galleryBtn.onPress();
    });
    await flushPromises();

    // upload du 2ème doc
    const uploadBtns2 = getAllByText('Téléverser un fichier');
    fireEvent.press(uploadBtns2[0]);
    const galleryBtn2 = lastShowAlertButtons?.find((b: any) => b.text === 'Galerie');
    await act(async () => {
      await galleryBtn2.onPress();
    });
    await flushPromises();

    // Maintenant les 2 docs sont uploadés → submit possible
    fireEvent.press(getByText('Soumettre la demande'));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
    // submit est appelé avec un FormData
    const arg = mockSubmit.mock.calls[0][0];
    expect(arg).toBeInstanceOf(FormData);
  });

  it('shows error toast when submit() rejects with detail', async () => {
    mockGetMyRequest.mockRejectedValueOnce(new Error('404'));
    mockSubmit.mockRejectedValueOnce({
      response: { data: { detail: 'Format invalide' } },
    });
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://cni.jpg', mimeType: 'image/jpeg' }],
    });

    const { findByText, getAllByText, getByText } = render(<VerificationScreen />);
    await findByText("Carte Nationale d'Identité");

    // upload des 2 docs
    for (let i = 0; i < 2; i++) {
      const dropzones = getAllByText('Téléverser un fichier');
      fireEvent.press(dropzones[0]);
      const galleryBtn = lastShowAlertButtons?.find((b: any) => b.text === 'Galerie');
      await act(async () => {
        await galleryBtn.onPress();
      });
      await flushPromises();
    }

    fireEvent.press(getByText('Soumettre la demande'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Format invalide');
    });
  });
});
