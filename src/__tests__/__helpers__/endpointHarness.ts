/**
 * Harnais « tous les endpoints » : exécute CHAQUE fonction de CHAQUE objet
 * `xxxAPI` exporté par `src/api/*.ts`, avec des arguments factices, et
 * enregistre les requêtes HTTP émises (verbe + URL).
 *
 * Utilisé par :
 *  - `src/api/__tests__/allEndpoints.test.ts`   (verbe/URL figés, réponse, erreurs)
 *  - `src/api/__tests__/backendRoutes.contract.test.ts` (URL ↔ routes Django)
 *
 * Prérequis dans le fichier de test (jest.mock est hoisté) :
 *   jest.mock('../instance', ...createTestMock())   → client axios mocké
 *   jest.mock('../config', ...)                     → fetchUpload mocké
 *
 * Arguments factices : un Proxy « caméléon » qui se convertit en chaîne
 * (`id1`, `id2`…) dans un template literal, et renvoie un autre caméléon pour
 * toute propriété lue (`data.page`, `params.search`…). Si la fonction plante
 * avec ces arguments, on réessaie avec des chaînes simples puis des objets vides.
 */
import { getMockedApi, resetMockApi } from './apiMock';

export type HttpCall = { method: string; url: string };

export interface EndpointRecord {
  /** `module.objet.fonction` */
  key: string;
  module: string;
  apiObject: string;
  fn: string;
  calls: HttpCall[];
  /** Erreur synchrone/asynchrone levée avec TOUS les jeux d'arguments factices. */
  argError?: string;
  /** Jeu d'arguments qui a produit la requête (réutilisé pour les autres scénarios). */
  args?: any[];
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'request'] as const;

// ---------------------------------------------------------------- arguments
function chameleon(label: string, depth = 0): any {
  const target = function () {};
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === Symbol.toPrimitive) return () => label;
      if (prop === 'toString' || prop === 'valueOf') return () => label;
      if (prop === 'toJSON') return () => label;
      if (prop === Symbol.iterator) return function* () {};
      if (prop === 'then') return undefined; // jamais « thenable »
      if (prop === 'length') return 0;
      if (prop === 'constructor') return Object;
      if (typeof prop === 'symbol') return undefined;
      if (depth > 3) return label;
      return chameleon(label, depth + 1);
    },
    apply() {
      return chameleon(label, depth + 1);
    },
    has() {
      return false;
    },
    ownKeys() {
      return [];
    },
    getOwnPropertyDescriptor() {
      return undefined;
    },
  });
}

function argSets(n: number): any[][] {
  const count = Math.max(n, 3);
  const idx = Array.from({ length: count }, (_, i) => i + 1);
  return [
    idx.map((i) => chameleon(`id${i}`)),
    idx.map((i) => `id${i}`),
    idx.map((i) => (i === 1 ? 'id1' : {})),
  ];
}

// ---------------------------------------------------------------- capture
function collectCalls(fetchUploadMock?: jest.Mock, fetchMock?: jest.Mock): HttpCall[] {
  const api = getMockedApi();
  const calls: HttpCall[] = [];
  for (const m of METHODS) {
    for (const c of (api as any)[m].mock.calls) {
      if (m === 'request') {
        const cfg = c[0] || {};
        calls.push({ method: String(cfg.method || 'get').toUpperCase(), url: String(cfg.url) });
      } else {
        calls.push({ method: m.toUpperCase(), url: String(c[0]) });
      }
    }
  }
  if (fetchUploadMock) {
    for (const c of fetchUploadMock.mock.calls) {
      calls.push({ method: String(c[0]).toUpperCase(), url: String(c[1]) });
    }
  }
  if (fetchMock) {
    for (const c of fetchMock.mock.calls) {
      const init = c[1] || {};
      calls.push({ method: String(init.method || 'GET').toUpperCase(), url: String(c[0]) });
    }
  }
  return calls;
}

/**
 * Réponse factice servie pendant l'enregistrement. Elle porte un `id` pour que
 * les fonctions en plusieurs étapes (ex. lookup par token PUIS action sur l'id)
 * aillent jusqu'au bout et que TOUTES leurs requêtes soient enregistrées.
 */
const RECORD_DATA = { id: 'srv1' };
const recordResponse = () =>
  Promise.resolve({
    data: RECORD_DATA,
    status: 200,
    ok: true,
    json: () => Promise.resolve(RECORD_DATA),
    text: () => Promise.resolve(JSON.stringify(RECORD_DATA)),
  });

function clearAll(fetchUploadMock?: jest.Mock, fetchMock?: jest.Mock) {
  resetMockApi();
  const api = getMockedApi();
  for (const m of METHODS) (api as any)[m].mockImplementation(recordResponse);
  fetchUploadMock?.mockClear();
  fetchUploadMock?.mockImplementation(recordResponse);
  fetchMock?.mockClear();
  fetchMock?.mockImplementation(recordResponse as any);
}

async function settle(p: any): Promise<{ ok: boolean; error?: any }> {
  try {
    await p;
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/** Liste des objets `xxxAPI` (et leurs fonctions) d'un module. */
export function apiObjectsOf(mod: Record<string, any>): Array<[string, Record<string, Function>]> {
  return Object.entries(mod)
    .filter(([name, v]) => /API$/.test(name) && v && typeof v === 'object')
    .map(([name, v]) => [name, v as Record<string, Function>]);
}

export function functionsOf(obj: Record<string, any>): string[] {
  return Object.keys(obj).filter((k) => typeof obj[k] === 'function').sort();
}

/**
 * Exécute une fonction d'API avec des arguments factices et enregistre les
 * requêtes. Ne lève jamais : un échec est consigné dans `argError`.
 */
export async function recordEndpoint(
  moduleName: string,
  apiObject: string,
  obj: Record<string, Function>,
  fn: string,
  fetchUploadMock?: jest.Mock,
  fetchMock?: jest.Mock,
): Promise<EndpointRecord> {
  const rec: EndpointRecord = {
    key: `${moduleName}.${apiObject}.${fn}`,
    module: moduleName,
    apiObject,
    fn,
    calls: [],
  };
  let lastError: any;
  for (const args of argSets(obj[fn].length)) {
    clearAll(fetchUploadMock, fetchMock);
    let res: { ok: boolean; error?: any };
    try {
      res = await settle(obj[fn](...args));
    } catch (e) {
      res = { ok: false, error: e };
    }
    const calls = collectCalls(fetchUploadMock, fetchMock);
    if (calls.length > 0) {
      rec.calls = calls;
      rec.argError = undefined;
      rec.args = args;
      return rec;
    }
    if (!res.ok) lastError = res.error;
  }
  if (lastError) rec.argError = String(lastError?.message || lastError).slice(0, 160);
  rec.args = argSets(obj[fn].length)[1];
  return rec;
}

/** Fichiers de `src/api/` qui ne sont PAS des modules d'endpoints. */
const NON_ENDPOINT_FILES = new Set(['config', 'index', 'instance', 'types']);

/** Tous les modules d'endpoints de `src/api/` (découverte dynamique : un nouveau module est couvert d'office). */
export function listApiModules(apiDir: string): string[] {
  const fs = require('fs');
  return (fs.readdirSync(apiDir) as string[])
    .filter((f) => /\.ts$/.test(f) && !/\.d\.ts$/.test(f))
    .map((f) => f.replace(/\.ts$/, ''))
    .filter((m) => !NON_ENDPOINT_FILES.has(m))
    .sort();
}

/**
 * Exécute TOUTES les fonctions de TOUS les objets `xxxAPI` des modules donnés.
 * `requireModule` doit être un `require` relatif au dossier `src/api`.
 */
export async function recordAllEndpoints(
  modules: string[],
  requireModule: (name: string) => Record<string, any>,
  fetchUploadMock?: jest.Mock,
  fetchMock?: jest.Mock,
): Promise<EndpointRecord[]> {
  const out: EndpointRecord[] = [];
  for (const m of modules) {
    const mod = requireModule(m);
    for (const [name, obj] of apiObjectsOf(mod)) {
      for (const fn of functionsOf(obj)) {
        out.push(await recordEndpoint(m, name, obj, fn, fetchUploadMock, fetchMock));
      }
    }
  }
  return out;
}

/** Retire la query string et le préfixe d'API absolu éventuel. */
export function normalizeUrl(url: string, apiBase = 'http://test.local/api'): string {
  let u = url.split('?')[0].split('#')[0];
  if (u.startsWith(apiBase)) u = u.slice(apiBase.length);
  if (u.startsWith('http://test.local')) u = u.slice('http://test.local'.length);
  if (u.startsWith('/api/')) u = u.slice(4);
  return u;
}
