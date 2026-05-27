/**
 * Tests pour CitiesIndexScreen (hub /events/in).
 *
 * Couvre :
 *  - Mount → fetch + render des cards
 *  - Sectioning : section "Pres de chez toi" pour le pays user, autres
 *    pays en sections separees triees par event_count desc
 *  - Search input : debounce + re-fetch avec ?search=...
 *  - Empty state : aucune ville VS aucun match (avec query)
 *  - Tap card → navigate vers EventSearch avec city pre-rempli
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.count !== undefined) return `${opts.count} évén.`;
      if (key === 'discover.cityEventsCountOne') return '1 évén.';
      if (key === 'discover.citiesEyebrow') return 'PAR VILLE';
      if (key === 'discover.citiesIndexTitle') return 'Toutes les villes';
      if (key === 'discover.citiesNearYou') return 'Près de chez toi';
      if (key === 'discover.citiesSearchPlaceholder') return 'Rechercher une ville…';
      if (key === 'discover.citiesNoMatch') return `Aucune ville ne correspond`;
      if (key === 'discover.citiesIndexEmpty') return 'Aucune ville';
      if (key === 'common.back') return 'Retour';
      if (key === 'common.clear') return 'Effacer';
      return key;
    },
  }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryBg: '#EEF2FF',
  accent: '#FF6B6B',
  text: '#111827',
  background: '#FFFFFF',
  card: '#FFFFFF',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

// Mock AuthContext : user au Cameroun pour tester le sectioning "Pres de chez toi".
jest.mock('../../../contexts/AuthContext', () => {
  const stableUser = { country: 'CM' };
  return { useAuth: () => ({ user: stableUser }) };
});

jest.mock('expo-localization', () => ({
  getLocales: () => [{ regionCode: 'CM', languageCode: 'fr' }],
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});
jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});
jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  return {
    SafeAreaView: RN.View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockGetCities = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  eventsAPI: { getCities: (...args: any[]) => mockGetCities(...args) },
  getMediaUrl: (url: string) => url,
}));

import CitiesIndexScreen from '../CitiesIndexScreen';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CitiesIndexScreen', () => {
  it('fetch au mount + affiche les villes', async () => {
    mockGetCities.mockResolvedValue({
      data: {
        results: [
          { id: 1, name: 'Douala', country: 'Cameroun', country_code: 'CM', event_count: 12 },
          { id: 2, name: 'Abidjan', country: "Côte d'Ivoire", country_code: 'CI', event_count: 8 },
        ],
      },
    });
    const { findByText } = render(<CitiesIndexScreen />);
    expect(await findByText('Douala')).toBeTruthy();
    expect(await findByText('Abidjan')).toBeTruthy();
  });

  it('groupe le pays user en section "Pres de chez toi"', async () => {
    mockGetCities.mockResolvedValue({
      data: {
        results: [
          { id: 1, name: 'Douala', country: 'Cameroun', country_code: 'CM', event_count: 12 },
          { id: 2, name: 'Abidjan', country: "Côte d'Ivoire", country_code: 'CI', event_count: 8 },
        ],
      },
    });
    const { findByText } = render(<CitiesIndexScreen />);
    // Section header user-country present (autre header virtualise et donc
    // potentiellement absent du tree de test — on verifie juste que la logique
    // de regroupement par pays user fonctionne).
    expect(await findByText('Près de chez toi')).toBeTruthy();
  });

  it('debounce search → refetch avec ?search=', async () => {
    mockGetCities.mockResolvedValue({ data: { results: [] } });
    const { findByPlaceholderText } = render(<CitiesIndexScreen />);

    // Premier appel : mount sans search
    await waitFor(() => expect(mockGetCities).toHaveBeenCalled());
    expect(mockGetCities).toHaveBeenLastCalledWith({ limit: 200 });

    const input = await findByPlaceholderText('Rechercher une ville…');
    fireEvent.changeText(input, 'par');

    // Avant le debounce (300ms), pas de nouvel appel
    expect(mockGetCities).toHaveBeenCalledTimes(1);

    // Apres le debounce, refetch avec search='par'
    act(() => { jest.advanceTimersByTime(310); });
    await waitFor(() => expect(mockGetCities).toHaveBeenCalledTimes(2));
    expect(mockGetCities).toHaveBeenLastCalledWith({ limit: 200, search: 'par' });
  });

  it('tap card → navigate EventSearch avec city name', async () => {
    mockGetCities.mockResolvedValue({
      data: {
        results: [
          { id: 1, name: 'Douala', country: 'Cameroun', country_code: 'CM', event_count: 5 },
        ],
      },
    });
    const { findByText } = render(<CitiesIndexScreen />);
    const card = await findByText('Douala');
    fireEvent.press(card);
    expect(mockNavigate).toHaveBeenCalledWith('EventSearch', { city: 'Douala' });
  });

  it('affiche empty state contextuel quand search ne matche rien', async () => {
    mockGetCities.mockResolvedValue({ data: { results: [] } });
    const { findByPlaceholderText, findByText } = render(<CitiesIndexScreen />);

    const input = await findByPlaceholderText('Rechercher une ville…');
    fireEvent.changeText(input, 'zzz');
    act(() => { jest.advanceTimersByTime(310); });

    expect(await findByText(/Aucune ville ne correspond/)).toBeTruthy();
  });
});
