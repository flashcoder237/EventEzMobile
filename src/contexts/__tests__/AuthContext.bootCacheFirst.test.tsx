/**
 * Démarrage CACHE-FIRST de l'AuthProvider.
 *
 * - token + user en cache → session affichée immédiatement (isInitializing
 *   false AVANT la réponse de /users/me/), puis revalidation en arrière-plan.
 * - revalidation réussie → user mis à jour.
 * - revalidation en échec réseau → user en cache conservé.
 * - revalidation 401 (refresh échoué) → session fermée.
 * - pas de token → invité, sans appel réseau.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

const mockGetCurrentUser = jest.fn();
const mockGetAccessToken = jest.fn();
const mockClearTokens = jest.fn(() => Promise.resolve());
jest.mock('../../api', () => ({
  authAPI: {},
  usersAPI: { getCurrentUser: () => mockGetCurrentUser() },
  setTokens: jest.fn(),
  clearTokens: () => mockClearTokens(),
  getAccessToken: () => mockGetAccessToken(),
  getRefreshToken: jest.fn(),
}));

const mockCacheGet = jest.fn();
jest.mock('../../services/CacheService', () => ({
  __esModule: true,
  default: {
    get: (...a: any[]) => mockCacheGet(...a),
    set: jest.fn(() => Promise.resolve()),
    clearAll: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('../../services/analyticsService', () => ({
  EventEzAnalytics: { login: jest.fn(), logout: jest.fn(), signup: jest.fn() },
  setAnalyticsUser: jest.fn(),
  clearAnalyticsUser: jest.fn(),
}));
jest.mock('../../services/crashReporting', () => ({
  setUser: jest.fn(),
  clearUser: jest.fn(),
}));
jest.mock('../../i18n', () => ({ changeLanguage: jest.fn(() => Promise.resolve()) }));
jest.mock('../../lib/utils/jwt', () => ({ getJWTUserId: () => '42' }));

import { AuthProvider, useAuth } from '../AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const cachedUser = { id: 42, email: 'a@b.c', role: 'user', first_name: 'Old' };

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: any) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAccessToken.mockResolvedValue('token');
  mockCacheGet.mockResolvedValue({ data: cachedUser });
});

it('affiche le user en cache sans attendre /users/me/', async () => {
  const pending = deferred<any>();
  mockGetCurrentUser.mockReturnValue(pending.promise);

  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isInitializing).toBe(false));
  expect(result.current.isAuthenticated).toBe(true);
  expect(result.current.user?.first_name).toBe('Old');

  // Revalidation en arrière-plan → user rafraîchi
  await act(async () => {
    pending.resolve({ data: { ...cachedUser, first_name: 'Fresh' } });
  });
  await waitFor(() => expect(result.current.user?.first_name).toBe('Fresh'));
});

it('conserve le user en cache si la revalidation échoue (réseau)', async () => {
  mockGetCurrentUser.mockRejectedValue({ code: 'ERR_NETWORK' });
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isInitializing).toBe(false));
  await act(async () => { await Promise.resolve(); });
  expect(result.current.isAuthenticated).toBe(true);
  expect(mockClearTokens).not.toHaveBeenCalled();
});

it('ferme la session si la revalidation renvoie 401', async () => {
  mockGetCurrentUser.mockRejectedValue({ response: { status: 401 } });
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isInitializing).toBe(false));
  await waitFor(() => expect(mockClearTokens).toHaveBeenCalled());
  expect(result.current.isAuthenticated).toBe(false);
});

it('sans token : invité, aucun appel réseau', async () => {
  mockGetAccessToken.mockResolvedValue(null);
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isInitializing).toBe(false));
  expect(result.current.isAuthenticated).toBe(false);
  expect(mockGetCurrentUser).not.toHaveBeenCalled();
});

it('sans user en cache : attend /users/me/ (comportement historique)', async () => {
  mockCacheGet.mockResolvedValue(null);
  mockGetCurrentUser.mockResolvedValue({ data: cachedUser });
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isInitializing).toBe(false));
  expect(result.current.isAuthenticated).toBe(true);
  expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
});
