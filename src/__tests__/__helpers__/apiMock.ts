/**
 * Helper pour mocker l'instance axios utilisée par tous les modules API.
 *
 * Le pattern : tous les modules src/api/*.ts importent `api` depuis
 * `./instance.ts`. On intercepte ce module via jest.mock pour fournir
 * un client mock dont on peut inspecter chaque appel.
 *
 * Usage dans un test :
 *   import { mockApi, getMockedApi } from '../../__tests__/__helpers__/apiMock';
 *   mockApi();
 *   const api = getMockedApi();
 *
 *   // Dans le test :
 *   api.get.mockResolvedValueOnce({ data: { id: 1 } });
 *   await authAPI.getCurrentUser();
 *   expect(api.get).toHaveBeenCalledWith('/users/me/');
 */

export interface MockedApi {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
  request: jest.Mock;
  defaults: { baseURL: string; headers: Record<string, any> };
  interceptors: {
    request: { use: jest.Mock; eject: jest.Mock };
    response: { use: jest.Mock; eject: jest.Mock };
  };
}

let _mockedApi: MockedApi | null = null;

export function getMockedApi(): MockedApi {
  if (!_mockedApi) {
    _mockedApi = createMockApi();
  }
  return _mockedApi;
}

function createMockApi(): MockedApi {
  const ok = (data: any = {}) => Promise.resolve({ data, status: 200 });
  return {
    get: jest.fn(() => ok()),
    post: jest.fn(() => ok()),
    put: jest.fn(() => ok()),
    patch: jest.fn(() => ok()),
    delete: jest.fn(() => ok()),
    request: jest.fn(() => ok()),
    defaults: { baseURL: 'http://test.local/api', headers: {} },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };
}

/**
 * À appeler EN HAUT DU FICHIER de test (avant les imports métier).
 * Mocke `src/api/instance.ts` pour exposer le client mocké.
 *
 * Note : jest.mock est hoisted, donc on l'appelle au top-level du test
 * file, pas via une fonction.
 *
 * Pattern recommandé :
 *   jest.mock('../../api/instance', () => {
 *     const { createTestMock } = require('../../../__tests__/__helpers__/apiMock');
 *     return createTestMock();
 *   });
 */
export function createTestMock() {
  const api = createMockApi();
  _mockedApi = api;
  // Helpers utilitaires aussi exportés par instance.ts
  return {
    __esModule: true,
    default: api,
    api,
    setTokens: jest.fn(() => Promise.resolve()),
    clearTokens: jest.fn(() => Promise.resolve()),
    getAccessToken: jest.fn(() => Promise.resolve('mock-access-token')),
    deduplicatedGet: jest.fn((url: string, config?: any) => api.get(url, config)),
  };
}

/**
 * Reset les mocks entre les tests pour éviter la contamination.
 * À appeler dans `beforeEach` ou `afterEach`.
 */
export function resetMockApi(): void {
  if (!_mockedApi) return;
  _mockedApi.get.mockClear();
  _mockedApi.post.mockClear();
  _mockedApi.put.mockClear();
  _mockedApi.patch.mockClear();
  _mockedApi.delete.mockClear();
  _mockedApi.request.mockClear();
  // Restaure les valeurs par défaut (résolution OK avec data vide)
  const ok = () => Promise.resolve({ data: {}, status: 200 });
  _mockedApi.get.mockImplementation(ok);
  _mockedApi.post.mockImplementation(ok);
  _mockedApi.put.mockImplementation(ok);
  _mockedApi.patch.mockImplementation(ok);
  _mockedApi.delete.mockImplementation(ok);
}
