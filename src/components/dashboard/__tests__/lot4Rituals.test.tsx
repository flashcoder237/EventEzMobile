/**
 * R3 lot 4 — composants « mots et rituels » : ligne d'accueil (attention du
 * jour, météo, nouveautés), « Bon retour », ligne d'attente, oubli des goûts.
 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#888888' }),
    isDark: false,
  }),
}));

const mockAnnouncement: { next: any } = { next: null };
jest.mock('../../../contexts/AnnouncementsContext', () => ({
  useOptionalAnnouncements: () => mockAnnouncement,
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockGetMeSince = jest.fn();
const mockForget = jest.fn();
const mockGetMyRegistrations = jest.fn(() => Promise.resolve({ data: [] }));
jest.mock('../../../api', () => ({
  eventsAPI: { getMeSince: (...a: any[]) => mockGetMeSince(...a) },
  registrationsAPI: { getMyRegistrations: () => mockGetMyRegistrations() },
  recommendationsAPI: {
    forgetPreferences: () => mockForget(),
    getPreferences: () => Promise.resolve({ data: null }),
    recordInteraction: () => Promise.resolve({}),
  },
}));

import ContextGreeting from '../ContextGreeting';
import WelcomeBackCard from '../../discover/WelcomeBackCard';
import LoadingLine from '../../ui/LoadingLine';
import { __resetDailyOnce } from '../../../lib/dailyOnce';
import { __resetLastOpen, LAST_OPEN_KEY } from '../../../lib/lastOpen';
import { __resetMeSince } from '../../../lib/meSince';
import { __resetSensoryPrefs, setSensoryPref } from '../../../lib/sensoryPrefs';
import { forgetTastePreferences } from '../../../lib/recommendations';

const DAY = 24 * 60 * 60 * 1000;

function todayYmd(offsetYears: number) {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear() + offsetYears}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

beforeEach(async () => {
  jest.useRealTimers();
  await AsyncStorage.clear();
  __resetDailyOnce();
  __resetLastOpen();
  __resetMeSince();
  __resetSensoryPrefs();
  mockAnnouncement.next = null;
  mockGetMeSince.mockReset();
  mockGetMeSince.mockResolvedValue({ data: { since: '', count: 0, items: [] } });
  mockForget.mockReset();
});

describe('ContextGreeting', () => {
  it('fête l’anniversaire sans jamais afficher l’âge', async () => {
    render(<ContextGreeting user={{ id: 1, date_of_birth: todayYmd(-30) }} />);
    expect(await screen.findByText('Joyeux anniversaire ! Belle journée à vous.')).toBeTruthy();
    expect(screen.queryByText(/30/)).toBeNull();
  });

  it('respecte l’interrupteur « Petites attentions »', async () => {
    await setSensoryPref('rituals', false);
    render(<ContextGreeting user={{ id: 1, date_of_birth: todayYmd(-30) }} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.queryByTestId('context-greeting')).toBeNull();
  });

  it('une seule fois par jour : pas de nouvelle attention à la session suivante', async () => {
    const user = { id: 1, date_of_birth: todayYmd(-30) };
    const first = render(<ContextGreeting user={user} />);
    await first.findByTestId('context-greeting');
    first.unmount();
    __resetDailyOnce(); // nouvelle session, même jour
    render(<ContextGreeting user={user} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.queryByTestId('context-greeting')).toBeNull();
  });

  it('nouveautés des organisateurs suivis, sinon rien', async () => {
    mockGetMeSince.mockResolvedValue({
      data: { count: 2, items: [
        { id: 'a', title: 'A', reason: 'followed_organizer' },
        { id: 'b', title: 'B', reason: 'new_edition' },
      ] },
    });
    render(<ContextGreeting user={{ id: 1 }} />);
    expect(await screen.findByTestId('context-greeting')).toBeTruthy();
  });

  it('rien sans donnée', async () => {
    render(<ContextGreeting user={{ id: 1 }} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.queryByTestId('context-greeting')).toBeNull();
  });
});

describe('WelcomeBackCard', () => {
  const items = { data: { count: 1, items: [{ id: 'a', slug: 'nuit', title: 'Nuit du jazz', reason: 'followed_organizer', organizer_name: 'Jazz & Co' }] } };

  it('s’affiche après plus de 21 jours d’absence', async () => {
    await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now() - 30 * DAY));
    mockGetMeSince.mockResolvedValue(items);
    render(<WelcomeBackCard enabled />);
    expect(await screen.findByText('Nuit du jazz')).toBeTruthy();
    expect(screen.getByText('Bon retour')).toBeTruthy();
    expect(screen.queryByText(/manqué/)).toBeNull();
  });

  it('rien après une courte absence', async () => {
    await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now() - 3 * DAY));
    mockGetMeSince.mockResolvedValue(items);
    render(<WelcomeBackCard enabled />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.queryByTestId('welcome-back')).toBeNull();
    expect(mockGetMeSince).not.toHaveBeenCalled();
  });

  it('rien si la réponse est vide ou en 404', async () => {
    await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now() - 30 * DAY));
    mockGetMeSince.mockRejectedValue({ response: { status: 404 } });
    render(<WelcomeBackCard enabled />);
    await waitFor(() => expect(mockGetMeSince).toHaveBeenCalled());
    expect(screen.queryByTestId('welcome-back')).toBeNull();
  });

  it('ne se cumule pas avec une annonce', async () => {
    await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now() - 30 * DAY));
    mockGetMeSince.mockResolvedValue(items);
    mockAnnouncement.next = { id: 1 };
    render(<WelcomeBackCard enabled />);
    await waitFor(() => expect(mockGetMeSince).toHaveBeenCalled());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.queryByTestId('welcome-back')).toBeNull();
  });
});

describe('LoadingLine', () => {
  it('rien sous 1,2 s, puis la phrase du contexte', () => {
    jest.useFakeTimers();
    render(<LoadingLine context="tickets" />);
    expect(screen.queryByTestId('loading-line')).toBeNull();
    act(() => {
      jest.advanceTimersByTime(1250);
    });
    expect(screen.getByText('On récupère vos billets…')).toBeTruthy();
    jest.useRealTimers();
  });
});

describe('Oublier mes préférences', () => {
  it('ne prétend jamais avoir effacé en cas d’échec', async () => {
    mockForget.mockResolvedValueOnce({ status: 204 });
    expect(await forgetTastePreferences()).toBe('done');
    mockForget.mockRejectedValueOnce({ response: { status: 404 } });
    expect(await forgetTastePreferences()).toBe('unavailable');
    mockForget.mockRejectedValueOnce({ response: { status: 500 } });
    expect(await forgetTastePreferences()).toBe('error');
    mockForget.mockRejectedValueOnce(new Error('network'));
    expect(await forgetTastePreferences()).toBe('error');
  });
});
