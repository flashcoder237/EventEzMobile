/**
 * Contrat backend des appels HTTP écrits EN DUR hors de `src/api/`
 * (écrans, hooks, services, contextes) : chaque chemin doit exister côté
 * Django avec un verbe accepté. Voir `backendRoutes.contract.test.ts` pour
 * les objets `xxxAPI` et la régénération de la fixture des routes.
 */
import path from 'path';
import { scanSourceCalls, SourceCall } from '../../__tests__/__helpers__/sourceCallScanner';

const routesFixture = require('./__fixtures__/backendRoutes.json') as {
  routes: Array<{ regex: string; methods: string[] }>;
};
const ROUTES = routesFixture.routes.map((r) => ({ ...r, re: new RegExp(`^${r.regex}$`) }));

function backendMethods(rel: string): string[] | null {
  const p = rel.replace(/^\//, '');
  const hits = ROUTES.filter((r) => r.re.test(p));
  return hits.length ? Array.from(new Set(hits.flatMap((r) => r.methods))) : null;
}

const SRC = path.join(__dirname, '..', '..');
const CALLS: SourceCall[] = scanSourceCalls(
  SRC,
  (rel) => rel === 'api' || rel.includes('__tests__') || rel.includes('__mocks__'),
);

describe('appels HTTP dispersés (hors src/api)', () => {
  it('le scanner en trouve (garde-fou contre un scanner muet)', () => {
    expect(CALLS.length).toBeGreaterThan(0);
  });

  if (CALLS.length === 0) return;

  it.each(CALLS.map((c) => [`${c.file}:${c.line} ${c.method} ${c.raw}`, c] as const))('%s', (_n, c) => {
    const methods = backendMethods(c.path);
    if (methods === null) throw new Error(`Aucune route backend pour /api${c.path}`);
    if (c.method !== '*' && !methods.includes('*')) expect(methods).toContain(c.method);
  });
});
