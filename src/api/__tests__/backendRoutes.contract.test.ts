/**
 * Contrat mobile ↔ backend : chaque requête émise par une fonction d'API
 * mobile doit correspondre à une route Django RÉELLE, avec un verbe accepté.
 *
 * Source de vérité : `__fixtures__/backendRoutes.json`, extrait de l'urlconf
 * Django (ViewSets → actions par verbe, APIView → méthodes définies).
 * Régénérer après tout changement de routes backend :
 *
 *   cd EventEzBackend
 *   .venv/Scripts/python.exe ../EventEzMobile/src/api/__tests__/__fixtures__/dump_backend_routes.py \
 *       ../EventEzMobile/src/api/__tests__/__fixtures__/backendRoutes.json
 *   (puis copier le même JSON dans eventez-frontend/src/lib/__tests__/__fixtures__/)
 *
 * Contrairement à `src/__tests__/contracts/openapi.test.ts` (analyse statique
 * du texte, en mode soft-fail), ce test EXÉCUTE chaque fonction et échoue
 * pour de bon. Les écarts connus sont listés dans KNOWN_BUGS (`it.failing`) :
 * quand un bug est corrigé, son test passe → `it.failing` échoue → retirer
 * l'entrée de la liste.
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
import {
  apiObjectsOf,
  EndpointRecord,
  functionsOf,
  listApiModules,
  normalizeUrl,
  recordEndpoint,
} from '../../__tests__/__helpers__/endpointHarness';

const routesFixture = require('./__fixtures__/backendRoutes.json') as {
  routes: Array<{ regex: string; methods: string[]; name: string }>;
};

const fetchUploadMock = require('../config').fetchUpload as jest.Mock;
const fetchMock = jest.fn();
(global as any).fetch = fetchMock;

const ROUTES = routesFixture.routes.map((r) => ({ ...r, re: new RegExp(`^${r.regex}$`) }));

/** Méthodes acceptées par le backend pour un chemin relatif à /api/ (sans slash initial). */
function backendMethods(rel: string): string[] | null {
  const p = rel.replace(/^\//, '');
  const hits = ROUTES.filter((r) => r.re.test(p));
  if (hits.length === 0) return null;
  return Array.from(new Set(hits.flatMap((r) => r.methods)));
}

/**
 * Écarts connus mobile ↔ backend. Les 3 trouvés le 2026-10-03 (join visio
 * supprimé, createTransaction en lecture seule, trackClick en GET) sont corrigés.
 */
const KNOWN_BUGS: Record<string, string> = {};

const MODULES = listApiModules(path.join(__dirname, '..'));
const ENTRIES = MODULES.flatMap((m) =>
  apiObjectsOf(require(`../${m}`)).flatMap(([apiObject, obj]) =>
    functionsOf(obj).map((fn) => ({ key: `${m}.${apiObject}.${fn}`, module: m, apiObject, fn, obj })),
  ),
);

/** Fonctions qui construisent une URL sans requête (voir allEndpoints.test.ts). */
const URL_BUILDERS: Record<string, string> = {
  'tickets.ticketPurchasesAPI.applePassUrl': 'GET',
  'tickets.ticketsAPI.applePassUrl': 'GET',
};
const CALLER_URL: Record<string, any[]> = {
  'misc.exportAPI.download': ['/registrations/export/', { format: 'csv' }],
};

async function callsFor(e: (typeof ENTRIES)[number]): Promise<Array<{ method: string; url: string }>> {
  if (URL_BUILDERS[e.key]) {
    return [{ method: URL_BUILDERS[e.key], url: String(e.obj[e.fn]('id1')) }];
  }
  const obj = CALLER_URL[e.key]
    ? { [e.fn]: () => e.obj[e.fn](...CALLER_URL[e.key]) }
    : e.obj;
  const rec: EndpointRecord = await recordEndpoint(e.module, e.apiObject, obj, e.fn, fetchUploadMock, fetchMock);
  return rec.calls;
}

function check(calls: Array<{ method: string; url: string }>) {
  expect(calls.length).toBeGreaterThan(0);
  for (const c of calls) {
    const rel = normalizeUrl(c.url);
    const methods = backendMethods(rel);
    if (methods === null) {
      throw new Error(`Aucune route backend pour ${c.method} /api${rel}`);
    }
    if (!methods.includes('*') && !methods.includes(c.method)) {
      throw new Error(`${c.method} non accepté sur /api${rel} (backend : ${methods.join(', ')})`);
    }
  }
}

describe('fixture des routes backend', () => {
  it('contient l’urlconf complète', () => {
    expect(ROUTES.length).toBeGreaterThan(1000);
  });

  it('discrimine vraiment (route inconnue, verbe, paramètre)', () => {
    expect(backendMethods('/route-qui-n-existe-pas/')).toBeNull();
    expect(backendMethods('/events/')).toEqual(expect.arrayContaining(['GET', 'POST']));
    expect(backendMethods('/events/abc/publish/')).toEqual(['POST']);
    expect(backendMethods('/events/abc/publish/extra/')).toBeNull();
  });

  it('chaque bug connu vise une fonction qui existe encore', () => {
    const keys = new Set(ENTRIES.map((e) => e.key));
    for (const k of Object.keys(KNOWN_BUGS)) expect(keys.has(k)).toBe(true);
  });
});

describe.each(MODULES)('contrat backend — %s', (moduleName) => {
  const entries = ENTRIES.filter((e) => e.module === moduleName);
  if (entries.length === 0) {
    it('aucun objet xxxAPI', () => expect(entries).toHaveLength(0));
    return;
  }
  for (const e of entries) {
    if (KNOWN_BUGS[e.key]) {
      // BUG connu (voir KNOWN_BUGS) — `failing` : passera au rouge une fois corrigé.
      it.failing(`${e.key} — BUG: ${KNOWN_BUGS[e.key]}`, async () => {
        check(await callsFor(e));
      });
    } else {
      it(e.key, async () => {
        check(await callsFor(e));
      });
    }
  }
});
