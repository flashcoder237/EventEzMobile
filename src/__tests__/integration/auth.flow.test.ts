/**
 * Tests d'intégration auth — exerce le vrai code axios + intercepteurs.
 *
 * Couvre :
 *  1. login → setTokens → getCurrentUser (Bearer auto-injecté)
 *  2. register avec body sérialisé correctement
 *  3. token refresh automatique sur 401
 *  4. logout déclenche clearTokens
 *
 * Important : on importe `mswSetup` AVANT tout import depuis `src/api/*` pour
 * que `EXPO_PUBLIC_API_URL` soit override avant que `config.ts` ne capture
 * la valeur.
 */

import './../__helpers__/mswSetup';
import { setupMswHooks, server } from '../__helpers__/mswSetup';
import { http, HttpResponse } from 'msw';
import { TEST_BASE_URL } from '../__helpers__/mswServer';
import { fixtureUser } from '../__helpers__/mswFixtures';

import { authAPI, usersAPI, setTokens, clearTokens, getAccessToken } from '../../api';

describe('Auth integration flow', () => {
  setupMswHooks();

  beforeEach(async () => {
    await clearTokens();
  });

  it('login retourne tokens, et la requête suivante envoie le Bearer', async () => {
    server.use(
      http.post(`${TEST_BASE_URL}/token/`, async ({ request }) => {
        const body = (await request.json()) as { email: string; password: string };
        expect(body).toEqual({ email: 'a@b.com', password: 'pwd' });
        return HttpResponse.json({ access: 'access-tok', refresh: 'refresh-tok' });
      }),
      http.get(`${TEST_BASE_URL}/users/me/`, ({ request }) => {
        const auth = request.headers.get('authorization');
        if (auth !== 'Bearer access-tok') {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json(fixtureUser({ email: 'a@b.com' }));
      }),
    );

    const loginRes = await authAPI.login('a@b.com', 'pwd');
    expect(loginRes.data.access).toBe('access-tok');
    expect(loginRes.data.refresh).toBe('refresh-tok');

    // setTokens est ce que les écrans appellent après login. On simule ce flow.
    await setTokens('access-tok', 'refresh-tok');
    expect(await getAccessToken()).toBe('access-tok');

    const me = await usersAPI.getCurrentUser();
    expect(me.data.email).toBe('a@b.com');
  });

  it('login avec mauvais credentials retourne 401 sans déclencher refresh', async () => {
    let refreshHit = 0;
    server.use(
      http.post(`${TEST_BASE_URL}/token/`, () =>
        HttpResponse.json({ detail: 'No active account found' }, { status: 401 }),
      ),
      http.post(`${TEST_BASE_URL}/token/refresh/`, () => {
        refreshHit++;
        return HttpResponse.json({ access: 'x', refresh: 'y' });
      }),
    );

    await expect(authAPI.login('fail@x.com', 'bad')).rejects.toMatchObject({
      response: { status: 401 },
    });
    // L'intercepteur n'a PAS dû tenter un refresh sur l'endpoint /token/ (auth endpoint exempté).
    expect(refreshHit).toBe(0);
  });

  it('register sérialise correctement le body et reçoit le user créé', async () => {
    server.use(
      http.post(`${TEST_BASE_URL}/register/`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toMatchObject({
          email: 'new@x.com',
          username: 'newuser',
          password: 'Pa55word!',
          confirm_password: 'Pa55word!',
          first_name: 'New',
          last_name: 'User',
        });
        return HttpResponse.json(
          { id: 99, email: body.email, username: body.username },
          { status: 201 },
        );
      }),
    );

    const res = await authAPI.register({
      email: 'new@x.com',
      username: 'newuser',
      password: 'Pa55word!',
      confirm_password: 'Pa55word!',
      first_name: 'New',
      last_name: 'User',
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBe(99);
  });

  it('refresh automatique sur 401 : 1ère requête échoue, refresh réussit, retry passe', async () => {
    await setTokens('expired-access', 'valid-refresh');

    let meHit = 0;
    server.use(
      http.get(`${TEST_BASE_URL}/users/me/`, ({ request }) => {
        meHit++;
        const auth = request.headers.get('authorization');
        if (auth === 'Bearer expired-access') {
          return new HttpResponse(null, { status: 401 });
        }
        if (auth === 'Bearer fresh-access') {
          return HttpResponse.json(fixtureUser({ email: 'refreshed@x.com' }));
        }
        return new HttpResponse(null, { status: 401 });
      }),
      http.post(`${TEST_BASE_URL}/token/refresh/`, async ({ request }) => {
        const body = (await request.json()) as { refresh: string };
        expect(body.refresh).toBe('valid-refresh');
        return HttpResponse.json({ access: 'fresh-access', refresh: 'new-refresh' });
      }),
    );

    const me = await usersAPI.getCurrentUser();
    expect(me.data.email).toBe('refreshed@x.com');
    // 1 fois en 401 + 1 retry après refresh = 2
    expect(meHit).toBe(2);
    // Le nouveau access token doit être stocké
    expect(await getAccessToken()).toBe('fresh-access');
  });

  it('refresh invalide (401) déconnecte la session', async () => {
    await setTokens('expired-access', 'invalid-refresh');

    server.use(
      http.get(`${TEST_BASE_URL}/users/me/`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${TEST_BASE_URL}/token/refresh/`, () =>
        HttpResponse.json({ detail: 'Token blacklisted' }, { status: 401 }),
      ),
    );

    await expect(usersAPI.getCurrentUser()).rejects.toBeDefined();
    // ensureFreshAccessToken nettoie les tokens quand le refresh est blacklisté
    expect(await getAccessToken()).toBeNull();
  });

  it('logout POST /logout/ avec le refresh, puis nettoie les tokens', async () => {
    await setTokens('access-x', 'refresh-x');

    let logoutBody: any = null;
    server.use(
      http.post(`${TEST_BASE_URL}/logout/`, async ({ request }) => {
        logoutBody = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    await authAPI.logout();
    expect(logoutBody).toEqual({ refresh: 'refresh-x' });
    expect(await getAccessToken()).toBeNull();
  });
});
