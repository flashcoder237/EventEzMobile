/**
 * MSW (Mock Service Worker) server pour tests d'intégration mobile.
 *
 * Différence avec apiMock.ts (smoke tests) :
 *   - apiMock.ts : intercepte axios via jest.mock → vérifie URL/verbe/body
 *   - mswServer.ts : intercepte fetch/XHR au niveau réseau → exerce le vrai
 *     code axios (intercepteurs, refresh token, retry, sérialisation)
 *
 * Les tests d'intégration doivent forcer l'API_BASE_URL vers `http://test.local/api`
 * via la variable d'env `EXPO_PUBLIC_API_URL` (set dans jest.setup.js ou per-test).
 *
 * Usage type :
 *   import { server } from '../__helpers__/mswServer';
 *   import { http, HttpResponse } from 'msw';
 *
 *   beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 *   afterEach(() => server.resetHandlers());
 *   afterAll(() => server.close());
 *
 *   it('test', async () => {
 *     server.use(
 *       http.post('http://test.local/api/token/', () =>
 *         HttpResponse.json({ access: 'a', refresh: 'r' }),
 *       ),
 *     );
 *     // ...
 *   });
 */

import { setupServer } from 'msw/node';

export const server = setupServer();

export const TEST_BASE_URL = 'http://test.local/api';
