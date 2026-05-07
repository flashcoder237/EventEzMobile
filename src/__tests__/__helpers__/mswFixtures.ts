/**
 * Handlers MSW par défaut + builders de fixtures pour tests d'intégration.
 *
 * Fournit des réponses "happy path" pour les endpoints les plus communs.
 * Les tests peuvent override n'importe quel handler avec `server.use(...)`.
 */

import { http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw';
import { TEST_BASE_URL } from './mswServer';

// ============================================
// FIXTURES
// ============================================

export const fixtureUser = (overrides: Record<string, any> = {}) => ({
  id: 1,
  email: 'alice@example.com',
  username: 'alice',
  first_name: 'Alice',
  last_name: 'Smith',
  role: 'user',
  user_type: 'individual',
  is_verified: true,
  ...overrides,
});

export const fixtureEvent = (overrides: Record<string, any> = {}) => ({
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Test Event',
  description: 'A great event',
  status: 'validated',
  event_type: 'billetterie',
  start_date: '2026-06-01T18:00:00Z',
  end_date: '2026-06-01T22:00:00Z',
  location: 'Yaoundé',
  currency: 'XAF',
  ...overrides,
});

export const fixtureRegistration = (overrides: Record<string, any> = {}) => ({
  id: 'reg-uuid-1',
  event: fixtureEvent().id,
  user: 1,
  status: 'pending',
  total_amount: '5000',
  currency: 'XAF',
  ...overrides,
});

export const fixturePayment = (overrides: Record<string, any> = {}) => ({
  id: 'pay-uuid-1',
  registration: 'reg-uuid-1',
  amount: '5000',
  currency: 'XAF',
  payment_method: 'mtn_money',
  status: 'pending',
  ...overrides,
});

// ============================================
// DEFAULT HANDLERS
// ============================================

/**
 * Handlers par défaut. Les tests qui ont besoin de plus peuvent les compléter
 * via `server.use(...)`. On expose tout en un seul array pour permettre
 * `server.listen(...defaultHandlers)` si besoin.
 */
export const defaultHandlers = [
  // Auth — login renvoie tokens
  http.post(`${TEST_BASE_URL}/token/`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body?.email === 'fail@example.com') {
      return HttpResponse.json({ detail: 'No active account found' }, { status: 401 });
    }
    return HttpResponse.json({
      access: 'access-token-default',
      refresh: 'refresh-token-default',
    });
  }),

  // Refresh token
  http.post(`${TEST_BASE_URL}/token/refresh/`, () =>
    HttpResponse.json({
      access: 'access-token-refreshed',
      refresh: 'refresh-token-refreshed',
    }),
  ),

  // /users/me/
  http.get(`${TEST_BASE_URL}/users/me/`, ({ request }) => {
    const auth = request.headers.get('authorization');
    if (!auth) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(fixtureUser());
  }),

  // Events list
  http.get(`${TEST_BASE_URL}/events/`, () =>
    HttpResponse.json({ count: 1, next: null, previous: null, results: [fixtureEvent()] }),
  ),

  // Single event
  http.get(`${TEST_BASE_URL}/events/:id/`, ({ params }) =>
    HttpResponse.json(fixtureEvent({ id: params.id as string })),
  ),
];

/** Helper pour créer un handler authentifié — vérifie le Bearer */
export function authedHandler<P extends PathParams = PathParams, B extends DefaultBodyType = DefaultBodyType>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  expectedToken: string,
  resolver: () => Response | Promise<Response>,
) {
  return http[method]<P, B>(path, ({ request }) => {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${expectedToken}`) {
      return new HttpResponse(null, { status: 401 });
    }
    return resolver();
  });
}
