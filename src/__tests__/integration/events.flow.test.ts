/**
 * Tests d'intégration events — browse + détails + création registration.
 */

import './../__helpers__/mswSetup';
import { setupMswHooks, server } from '../__helpers__/mswSetup';
import { http, HttpResponse } from 'msw';
import { TEST_BASE_URL } from '../__helpers__/mswServer';
import { fixtureEvent, fixtureRegistration } from '../__helpers__/mswFixtures';

import { eventsAPI, registrationsAPI, setTokens, clearTokens } from '../../api';

describe('Events browse + register flow', () => {
  setupMswHooks();

  beforeEach(async () => {
    await clearTokens();
    await setTokens('access-tok', 'refresh-tok');
  });

  it('liste events → details → crée registration avec ticket_type + quantity', async () => {
    const eventId = fixtureEvent().id;
    let createdBody: any = null;

    server.use(
      http.get(`${TEST_BASE_URL}/events/`, ({ request }) => {
        const url = new URL(request.url);
        // Vérifie que les query params sont passés correctement
        expect(url.searchParams.get('category')).toBe('music');
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [fixtureEvent()],
        });
      }),
      http.get(`${TEST_BASE_URL}/events/:id/`, ({ params }) =>
        HttpResponse.json(fixtureEvent({ id: params.id as string, currency: 'XAF' })),
      ),
      http.post(`${TEST_BASE_URL}/registrations/`, async ({ request }) => {
        createdBody = await request.json();
        return HttpResponse.json(
          fixtureRegistration({ event: createdBody.event }),
          { status: 201 },
        );
      }),
    );

    // 1. Browse
    const list = await eventsAPI.getEvents({ category: 'music' });
    expect(list.data.results).toHaveLength(1);
    expect(list.data.results[0].id).toBe(eventId);

    // 2. Détails
    const details = await eventsAPI.getEvent(eventId);
    expect(details.data.currency).toBe('XAF');

    // 3. Création registration
    const reg = await registrationsAPI.createRegistration({
      event: eventId,
      tickets: [{ ticket_type: 1, quantity: 2 }],
    });
    expect(reg.status).toBe(201);
    expect(createdBody).toMatchObject({
      event: eventId,
      tickets: [{ ticket_type: 1, quantity: 2 }],
    });
  });

  it('publishEvent → POST /events/:id/publish/ et reçoit status submitted', async () => {
    const eventId = '22222222-2222-2222-2222-222222222222';

    server.use(
      http.post(`${TEST_BASE_URL}/events/${eventId}/publish/`, () =>
        HttpResponse.json(fixtureEvent({ id: eventId, status: 'submitted' })),
      ),
    );

    const res = await eventsAPI.publishEvent(eventId);
    expect(res.data.status).toBe('submitted');
  });
});
