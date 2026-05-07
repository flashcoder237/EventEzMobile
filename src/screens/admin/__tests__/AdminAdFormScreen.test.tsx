/**
 * Tests Jest pour AdminAdFormScreen.
 *
 * Mode "creation" :
 *  - render des champs (title, sous-titre, ctaLabel, country, image, etc.)
 *  - validation : title requis -> showError, pas d'appel API
 *  - validation : image requise (creation seulement) -> showError
 *  - submit OK avec image -> advertisementsAPI.create avec FormData (multipart)
 *
 * Mode "edition" :
 *  - charge la pub -> pre-remplit + permet submit sans image (existing).
 *  - submit -> advertisementsAPI.update
 *
 * Mocks notables :
 *  - useBiometricConfirm : confirm() resolve true par defaut
 *  - expo-image-picker : permission granted + asset retourne
 *  - RoleGuard : neutralise (children direct)
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockGoBack = jest.fn();
let routeParams: any = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: routeParams }),
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const themeColors = {
  primary: '#4F46E5',
  accent: '#FF6B6B',
  text: '#111827',
  card: '#FFFFFF',
  surface: '#FFFFFF',
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

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'admin' } }),
}));

const mockBiometricConfirm = jest.fn(() => Promise.resolve(true));
jest.mock('../../../hooks/useBiometricConfirm', () => ({
  useBiometricConfirm: () => ({ confirm: mockBiometricConfirm }),
}));

// RoleGuard neutralise
jest.mock('../../../components/auth/RoleGuard', () => {
  const React = require('react');
  return { __esModule: true, default: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});

const mockAdGet = jest.fn();
const mockAdCreate = jest.fn();
const mockAdUpdate = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  advertisementsAPI: {
    get: (...args: any[]) => mockAdGet(...args),
    create: (...args: any[]) => mockAdCreate(...args),
    update: (...args: any[]) => mockAdUpdate(...args),
  },
}));

// expo-image
jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

// expo-image-picker — par defaut permission granted + image selectionnee
const mockPickerPerm: jest.Mock = jest.fn(() => Promise.resolve({ granted: true } as any));
const mockLaunchLib: jest.Mock = jest.fn(() =>
  Promise.resolve({
    canceled: false,
    assets: [{ uri: 'file://ad.jpg', width: 1920, height: 1080 }],
  } as any)
);
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: (...args: any[]) => mockPickerPerm(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchLib(...args),
  MediaTypeOptions: { Images: 'Images' },
}));

import AdminAdFormScreen from '../AdminAdFormScreen';

beforeEach(() => {
  jest.clearAllMocks();
  routeParams = {};
  mockBiometricConfirm.mockResolvedValue(true);
});

describe('AdminAdFormScreen — creation', () => {
  it('renders main fields and submit button', () => {
    const { getByText, getByPlaceholderText } = render(<AdminAdFormScreen />);
    expect(getByText('Créer une pub')).toBeTruthy();
    expect(getByPlaceholderText('Ex : Festival de jazz à Yaoundé')).toBeTruthy();
    expect(getByPlaceholderText('Ex : Du 12 au 14 juin · 10+ artistes')).toBeTruthy();
    expect(getByText('Créer la pub')).toBeTruthy();
  });

  it('blocks submit when title is empty', async () => {
    const { getByText } = render(<AdminAdFormScreen />);
    fireEvent.press(getByText('Créer la pub'));
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Titre requis', expect.any(String));
    });
    expect(mockAdCreate).not.toHaveBeenCalled();
  });

  it('blocks submit when image is missing on create', async () => {
    const { getByText, getByPlaceholderText } = render(<AdminAdFormScreen />);
    fireEvent.changeText(getByPlaceholderText('Ex : Festival de jazz à Yaoundé'), 'Pub Test');
    // pas d'image picked -> erreur
    fireEvent.press(getByText('Créer la pub'));
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Image requise', expect.any(String));
    });
    expect(mockAdCreate).not.toHaveBeenCalled();
  });

  it('submits with FormData (multipart) when image is picked', async () => {
    mockAdCreate.mockResolvedValueOnce({ data: { id: 'ad-1' } });

    const { getByText, getByPlaceholderText } = render(<AdminAdFormScreen />);

    // pick image (le picker mock rend uri='file://ad.jpg')
    fireEvent.press(getByText('Touche pour choisir (16:9 conseillé)'));
    await waitFor(() => expect(mockLaunchLib).toHaveBeenCalled());

    fireEvent.changeText(
      getByPlaceholderText('Ex : Festival de jazz à Yaoundé'),
      'Festival Cool'
    );

    fireEvent.press(getByText('Créer la pub'));

    await waitFor(() => expect(mockAdCreate).toHaveBeenCalledTimes(1));
    const payload = mockAdCreate.mock.calls[0][0];
    // Avec une image picked, payload doit etre FormData
    expect(payload).toBeInstanceOf(FormData);
    expect(mockBiometricConfirm).toHaveBeenCalled();
    expect(mockShowSuccess).toHaveBeenCalledWith('Succès', 'Publicité créée');
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('AdminAdFormScreen — edition', () => {
  it('loads ad + pre-fills + update without re-pick image', async () => {
    routeParams = { adId: 'ad-42' };
    mockAdGet.mockResolvedValueOnce({
      data: {
        id: 'ad-42',
        title: 'Existing Ad',
        subtitle: 'Sub',
        cta_label: 'En savoir plus',
        link_url: '',
        target_event: '',
        country: 'CM',
        city: 'Yaoundé',
        latitude: null,
        longitude: null,
        radius_km: null,
        placement: 'feed_inline',
        priority: 0,
        is_active: true,
        image_url: 'http://example.com/ad.jpg',
      },
    });
    mockAdUpdate.mockResolvedValueOnce({ data: { id: 'ad-42' } });

    const { findByDisplayValue, getByText } = render(<AdminAdFormScreen />);
    expect(await findByDisplayValue('Existing Ad')).toBeTruthy();

    fireEvent.press(getByText('Enregistrer'));

    await waitFor(() => expect(mockAdUpdate).toHaveBeenCalledTimes(1));
    expect(mockAdUpdate.mock.calls[0][0]).toBe('ad-42');
    // payload sans nouvelle image -> objet plain (pas FormData)
    const payload = mockAdUpdate.mock.calls[0][1];
    expect(payload).not.toBeInstanceOf(FormData);
    expect(payload.title).toBe('Existing Ad');
    expect(mockShowSuccess).toHaveBeenCalledWith('Succès', 'Publicité mise à jour');
  });
});
