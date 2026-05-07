/**
 * Tests d'intégration sessions — inscription session avec/sans event registration.
 *
 * Backend rule : on doit être inscrit à l'event pour pouvoir s'inscrire à une
 * de ses sessions → 403 sinon. (Bug fix récent du backend.)
 */

import './../__helpers__/mswSetup';
import { setupMswHooks, server } from '../__helpers__/mswSetup';
import { http, HttpResponse } from 'msw';
import { TEST_BASE_URL } from '../__helpers__/mswServer';

import { sessionsAPI, setTokens, clearTokens } from '../../api';

describe('Sessions flow', () => {
  setupMswHooks();

  beforeEach(async () => {
    await clearTokens();
    await setTokens('access-tok', 'refresh-tok');
  });

  it("registerToSession refuse 403 si l'user n'est pas inscrit à l'event parent", async () => {
    const sessionId = 'sess-1';

    server.use(
      http.post(`${TEST_BASE_URL}/sessions/${sessionId}/register/`, () =>
        HttpResponse.json(
          {
            detail: 'You must be registered to the event to register to its sessions.',
            code: 'event_registration_required',
          },
          { status: 403 },
        ),
      ),
    );

    await expect(sessionsAPI.registerToSession(sessionId)).rejects.toMatchObject({
      response: {
        status: 403,
        data: { code: 'event_registration_required' },
      },
    });
  });

  it("registerToSession passe quand l'user est inscrit à l'event", async () => {
    const sessionId = 'sess-2';

    server.use(
      http.post(`${TEST_BASE_URL}/sessions/${sessionId}/register/`, () =>
        HttpResponse.json({ id: sessionId, registered: true, attendees_count: 12 }),
      ),
    );

    const res = await sessionsAPI.registerToSession(sessionId);
    expect(res.data.registered).toBe(true);
  });
});
