/**
 * Tests d'intégration edge cases — 500, 503, network errors, retry exponentiel.
 */

import './../__helpers__/mswSetup';
import { setupMswHooks, server } from '../__helpers__/mswSetup';
import { http, HttpResponse } from 'msw';
import { TEST_BASE_URL } from '../__helpers__/mswServer';

import { eventsAPI, setTokens, clearTokens } from '../../api';
import { eventBus } from '../../lib/eventBus';

describe('Edge cases', () => {
  setupMswHooks();

  beforeEach(async () => {
    await clearTokens();
    await setTokens('access-tok', 'refresh-tok');
  });

  it('500 backend → erreur remontée sans retry (pas un timeout/network)', async () => {
    let hitCount = 0;
    server.use(
      http.get(`${TEST_BASE_URL}/events/`, () => {
        hitCount++;
        return HttpResponse.json({ detail: 'Internal Server Error' }, { status: 500 });
      }),
    );

    await expect(eventsAPI.getEvents()).rejects.toMatchObject({
      response: { status: 500 },
    });
    // Pas de retry sur 500 — uniquement sur timeout/network
    expect(hitCount).toBe(1);
  });

  it('503 service_unavailable → émet event "service-unavailable" sur eventBus', async () => {
    server.use(
      http.get(`${TEST_BASE_URL}/events/`, () =>
        HttpResponse.json(
          {
            error: 'service_unavailable',
            incident: { title: 'Maintenance', message: 'Be right back' },
          },
          { status: 503 },
        ),
      ),
    );

    let received: any = null;
    const off = eventBus.on('service-unavailable', (data: any) => {
      received = data;
    });

    await expect(eventsAPI.getEvents()).rejects.toBeDefined();
    off();

    expect(received).toBeDefined();
    expect(received.incident.title).toBe('Maintenance');
  });

  it('403 email_verification_required → émet event api-verification-required', async () => {
    server.use(
      http.get(`${TEST_BASE_URL}/events/`, () =>
        HttpResponse.json(
          { code: 'email_verification_required', detail: 'Please verify your email' },
          { status: 403 },
        ),
      ),
    );

    let received: any = null;
    const off = eventBus.on('api-verification-required', (data: any) => {
      received = data;
    });

    await expect(eventsAPI.getEvents()).rejects.toBeDefined();
    off();

    expect(received).toBeDefined();
    expect(received.message).toBe('Please verify your email');
  });

  it("requête 200 OK normale : déduplication n'impacte pas les tests d'intégration", async () => {
    let hitCount = 0;
    server.use(
      http.get(`${TEST_BASE_URL}/events/featured/`, () => {
        hitCount++;
        return HttpResponse.json({ count: 0, results: [] });
      }),
    );

    // Deux appels successifs (await) — pas concurrents → pas de dedup
    await eventsAPI.getFeaturedEvents();
    await eventsAPI.getFeaturedEvents();
    expect(hitCount).toBe(2);
  });
});
