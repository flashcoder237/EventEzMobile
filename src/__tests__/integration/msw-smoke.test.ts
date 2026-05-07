/**
 * Smoke test minimal pour vérifier que MSW boot correctement avec jest-expo.
 *
 * Si ce test casse, les autres tests d'intégration ne pourront pas tourner.
 */

import './../__helpers__/mswSetup';
import { server, setupMswHooks } from '../__helpers__/mswSetup';
import { http, HttpResponse } from 'msw';
import axios from 'axios';

describe('MSW boot', () => {
  setupMswHooks();

  it('intercepte une requête fetch globale', async () => {
    server.use(
      http.get('http://test.local/api/ping/', () =>
        HttpResponse.json({ ok: true }),
      ),
    );

    const res = await fetch('http://test.local/api/ping/');
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it('intercepte une requête axios', async () => {
    server.use(
      http.get('http://test.local/api/axios-ping/', () =>
        HttpResponse.json({ source: 'axios' }),
      ),
    );

    const { data } = await axios.get('http://test.local/api/axios-ping/');
    expect(data).toEqual({ source: 'axios' });
  });
});
