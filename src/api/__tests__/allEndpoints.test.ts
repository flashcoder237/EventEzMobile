/**
 * TOUS les endpoints mobile — une ligne de test par fonction d'API.
 *
 * Pour chaque fonction de chaque objet `xxxAPI` exporté par `src/api/*.ts`
 * (modules découverts dynamiquement : un nouveau module est couvert d'office) :
 *
 *  1. Requête    : exactement UNE requête HTTP, URL relative propre (pas de
 *                  `undefined`/`null`/`[object …]`), verbe + URL figés par
 *                  snapshot → tout changement de route est visible en revue.
 *  2. Réponse    : avec une réponse 200 (liste paginée DRF), la fonction se
 *                  résout sans planter sur la transformation de la réponse.
 *  3. Erreur     : si le serveur répond 500, la fonction PROPAGE l'erreur
 *                  d'origine (ou l'absorbe volontairement) — jamais une autre
 *                  exception (TypeError…) née d'un chemin d'erreur cassé.
 *
 * Les tests détaillés (params/body exacts) restent dans les fichiers
 * `<module>.test.ts` ; ce fichier garantit qu'AUCUNE fonction n'échappe.
 * Le croisement avec les routes Django est dans `backendRoutes.contract.test.ts`.
 */
jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

jest.mock('../config', () => ({
  __esModule: true,
  API_BASE_URL: 'http://test.local/api',
  SERVER_BASE_URL: 'http://test.local',
  ACCESS_TOKEN_KEY: 'eventez_access_token',
  REFRESH_TOKEN_KEY: 'eventez_refresh_token',
  getMediaUrl: jest.fn((u: string) => u),
  fetchUpload: jest.fn(() => Promise.resolve({ data: {} })),
}));

import path from 'path';
import { getMockedApi } from '../../__tests__/__helpers__/apiMock';
import {
  apiObjectsOf,
  functionsOf,
  listApiModules,
  normalizeUrl,
  recordEndpoint,
} from '../../__tests__/__helpers__/endpointHarness';

const fetchUploadMock = require('../config').fetchUpload as jest.Mock;
const fetchMock = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  }),
);
(global as any).fetch = fetchMock;

const MODULES = listApiModules(path.join(__dirname, '..'));

type Entry = { key: string; module: string; apiObject: string; fn: string; obj: Record<string, Function> };
const ENTRIES: Entry[] = MODULES.flatMap((m) =>
  apiObjectsOf(require(`../${m}`)).flatMap(([apiObject, obj]) =>
    functionsOf(obj).map((fn) => ({ key: `${m}.${apiObject}.${fn}`, module: m, apiObject, fn, obj })),
  ),
);

/**
 * Fonctions qui CONSTRUISENT une URL sans appeler le réseau (téléchargement
 * authentifié fait ailleurs). Leur URL est vérifiée contre le backend dans le
 * test de contrat.
 */
const URL_BUILDERS = new Set(['tickets.ticketPurchasesAPI.applePassUrl', 'tickets.ticketsAPI.applePassUrl']);

/**
 * Fonctions qui font plusieurs requêtes par conception (lookup puis action).
 * Valeur = nombre de requêtes attendu.
 */
const MULTI_STEP: Record<string, number> = {
  'social.invitationsAPI.respondByToken': 2, // GET by_token puis POST accept/decline
};

/**
 * Fonctions dont l'URL est fournie par l'appelant (passe-plat générique) :
 * on leur passe une vraie URL d'API.
 */
const CALLER_URL: Record<string, any[]> = {
  'misc.exportAPI.download': ['/registrations/export/', { format: 'csv' }],
};

const PAGINATED = { count: 1, next: null, previous: null, results: [{ id: 'id1' }] };

function setAllTransports(impl: () => Promise<any>) {
  const api = getMockedApi();
  for (const m of ['get', 'post', 'put', 'patch', 'delete', 'request'] as const) {
    (api as any)[m].mockImplementation(impl);
  }
  fetchUploadMock.mockImplementation(impl);
  fetchMock.mockImplementation(impl as any);
}

afterAll(() => {
  setAllTransports(() => Promise.resolve({ data: {}, status: 200 }));
});

describe('inventaire des endpoints mobile', () => {
  it('découvre tous les modules et fonctions d’API', () => {
    expect(MODULES.length).toBeGreaterThanOrEqual(20);
    expect(ENTRIES.length).toBeGreaterThanOrEqual(700);
  });
});

describe.each(MODULES)('module %s', (moduleName) => {
  const entries = ENTRIES.filter((e) => e.module === moduleName);

  if (entries.length === 0) {
    it('n’exporte aucun objet xxxAPI (module utilitaire)', () => {
      expect(entries).toHaveLength(0);
    });
    return;
  }

  it.each(entries.map((e) => [e.key, e] as const))('%s', async (_key, e) => {
    // ---------------------------------------------------------- 1. requête
    let rec = await recordEndpoint(e.module, e.apiObject, e.obj, e.fn, fetchUploadMock, fetchMock);
    if (CALLER_URL[e.key]) {
      const wrapped = { [e.fn]: (..._a: any[]) => e.obj[e.fn](...CALLER_URL[e.key]) };
      rec = await recordEndpoint(e.module, e.apiObject, wrapped, e.fn, fetchUploadMock, fetchMock);
      rec.args = CALLER_URL[e.key];
    }

    if (URL_BUILDERS.has(e.key)) {
      const url = String(e.obj[e.fn]('id1'));
      expect(url).toMatch(/^http:\/\/test\.local\/api\/[^\s]+$/);
      expect(url).not.toMatch(/undefined|null|\[object/);
      expect(`BUILDER ${normalizeUrl(url)}`).toMatchSnapshot();
      return;
    }

    expect(rec.argError).toBeUndefined();
    expect(rec.calls).toHaveLength(MULTI_STEP[e.key] ?? 1);
    for (const c of rec.calls) {
      expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).toContain(c.method);
      const r = normalizeUrl(c.url);
      expect(r.startsWith('/')).toBe(true);
      expect(r).not.toMatch(/undefined|null|NaN|\[object|\/\/|\s/);
    }
    const method = rec.calls.map((c) => c.method).join('+');
    const rel = rec.calls.map((c) => normalizeUrl(c.url)).join(' + ');

    // ---------------------------------------------------------- 2. réponse
    setAllTransports(() =>
      Promise.resolve({
        data: { ...PAGINATED, id: 'srv1' },
        status: 200,
        ok: true,
        json: () => Promise.resolve(PAGINATED),
        text: () => Promise.resolve(JSON.stringify(PAGINATED)),
      }),
    );
    await e.obj[e.fn](...(rec.args || [])); // ne doit pas lever

    // ---------------------------------------------------------- 3. erreur
    const serverError: any = Object.assign(new Error('Request failed with status code 500'), {
      isAxiosError: true,
      response: { status: 500, data: { detail: 'boom' } },
    });
    setAllTransports(() => Promise.reject(serverError));
    let outcome: 'propage' | 'absorbe';
    try {
      await e.obj[e.fn](...(rec.args || []));
      outcome = 'absorbe';
    } catch (err) {
      // L'erreur remontée doit être celle du transport, pas une exception
      // secondaire née d'un chemin d'erreur cassé.
      expect(err).toBe(serverError);
      outcome = 'propage';
    }

    expect(`${method} ${rel} | erreur ${outcome}`).toMatchSnapshot();
  });
});
