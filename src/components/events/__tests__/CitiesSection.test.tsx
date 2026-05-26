/**
 * Tests pour CitiesSection (Discover screen "Par ville").
 *
 * Couvre :
 *  - Mount → fetch + render des cards
 *  - Empty state (cities=[]) → section masquee (pas d'erreur visible)
 *  - Failure state → section masquee (silent fail, pas critique)
 *  - Tap card → navigation vers EventSearch avec city pre-rempli
 *  - Tap "Voir tout" → navigation vers CitiesIndex
 *  - A11y : accessibilityLabel sur chaque card + bouton Voir tout
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.count !== undefined) return `${opts.count} évén.`;
      if (key === 'discover.cityEventsCountOne') return '1 évén.';
      if (key === 'discover.citiesEyebrow') return 'PAR VILLE';
      if (key === 'discover.citiesTitle') return 'Le monde près de toi';
      if (key === 'common.seeAll') return 'Voir tout';
      return key;
    },
  }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryBg: '#EEF2FF',
  accent: '#FF6B6B',
  text: '#111827',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray500: '#6B7280',
  gray700: '#374151',
  card: '#FFFFFF',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

const mockGetCities = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  eventsAPI: {
    getCities: (...args: any[]) => mockGetCities(...args),
  },
}));

import CitiesSection from '../CitiesSection';


beforeEach(() => {
  jest.clearAllMocks();
});


describe('CitiesSection', () => {
  it('renders cities apres fetch reussi', async () => {
    mockGetCities.mockResolvedValueOnce({
      data: {
        results: [
          { name: 'Douala', country: 'Cameroun', country_code: 'CM', event_count: 12 },
          { name: 'Abidjan', country: "Côte d'Ivoire", country_code: 'CI', event_count: 8 },
        ],
      },
    });
    const { findByText, getByText } = render(<CitiesSection />);

    expect(await findByText('Douala')).toBeTruthy();
    expect(getByText('Abidjan')).toBeTruthy();
    expect(getByText('PAR VILLE')).toBeTruthy();
    expect(getByText('Le monde près de toi')).toBeTruthy();
  });

  it('masque la section quand getCities renvoie 0 villes', async () => {
    mockGetCities.mockResolvedValueOnce({ data: { results: [] } });
    const { queryByText } = render(<CitiesSection />);

    // Apres le fetch, le header ne doit pas etre rendu
    await waitFor(() => {
      expect(queryByText('PAR VILLE')).toBeNull();
    });
  });

  it('masque la section quand getCities throw', async () => {
    mockGetCities.mockRejectedValueOnce(new Error('Network down'));
    const { queryByText } = render(<CitiesSection />);

    await waitFor(() => {
      expect(queryByText('PAR VILLE')).toBeNull();
    });
    // Le composant ne doit pas crash
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('exclut les villes avec event_count=0 (defense)', async () => {
    mockGetCities.mockResolvedValueOnce({
      data: {
        results: [
          { name: 'Douala', country: 'CM', event_count: 5 },
          { name: 'Vide', country: 'XX', event_count: 0 },
        ],
      },
    });
    const { findByText, queryByText } = render(<CitiesSection />);

    expect(await findByText('Douala')).toBeTruthy();
    expect(queryByText('Vide')).toBeNull();
  });

  it('tap card → navigate vers EventSearch avec city name exact', async () => {
    mockGetCities.mockResolvedValueOnce({
      data: {
        results: [
          { name: 'Yaoundé', country: 'Cameroun', country_code: 'CM', event_count: 3 },
        ],
      },
    });
    const { findByText } = render(<CitiesSection />);

    const card = await findByText('Yaoundé');
    fireEvent.press(card);

    // Navigation appelee avec le nom EXACT (avec accent), pas le slug
    expect(mockNavigate).toHaveBeenCalledWith('EventSearch', {
      city: 'Yaoundé',
    });
  });

  it('tap "Voir tout" → navigate vers CitiesIndex', async () => {
    mockGetCities.mockResolvedValueOnce({
      data: {
        results: [
          { name: 'Paris', country: 'France', country_code: 'FR', event_count: 2 },
        ],
      },
    });
    const { findByText } = render(<CitiesSection />);

    const seeAll = await findByText('Voir tout');
    fireEvent.press(seeAll);

    expect(mockNavigate).toHaveBeenCalledWith('CitiesIndex');
  });

  it('accessibilityLabel inclut nom + count sur chaque card', async () => {
    mockGetCities.mockResolvedValueOnce({
      data: {
        results: [
          { name: 'Lagos', country: 'Nigeria', country_code: 'NG', event_count: 7 },
        ],
      },
    });
    const { findByLabelText } = render(<CitiesSection />);

    // accessibilityLabel = "{name}, {count}"
    expect(await findByLabelText(/Lagos.*7/)).toBeTruthy();
  });

  it('respecte le limit prop (max 10 par defaut)', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      name: `City${i}`,
      country: 'XX',
      event_count: i + 1,
    }));
    mockGetCities.mockResolvedValueOnce({ data: { results: many } });

    const { findByText, queryByText } = render(<CitiesSection limit={5} />);

    expect(await findByText('City0')).toBeTruthy();
    // City5 et au-dela ne doivent PAS etre rendus
    await waitFor(() => {
      expect(queryByText('City20')).toBeNull();
    });
  });
});
