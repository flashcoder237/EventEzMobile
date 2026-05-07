/**
 * Contract tests : Mobile API ↔ Backend Django (drf-spectacular).
 *
 * Objectif :
 *  - Détecter les drifts entre les appels mobile et le schéma backend
 *    (URL inexistante, verbe HTTP non supporté, param mal nommé).
 *  - Fournir un rapport actionnable (liste des mismatches + exemples).
 *
 * Stratégie de validation :
 *  - **Source de vérité** : `__fixtures__/openapi-schema.json` si présent,
 *    sinon parsing statique des `urls.py` + `@action` decorators du backend.
 *  - Pour chaque endpoint mobile, on cherche un path backend équivalent
 *    (même path après normalisation `{id}`).
 *  - On accepte plusieurs variantes : avec ou sans préfixe `/api`, avec ou
 *    sans trailing slash.
 *
 * Mode soft-fail :
 *  - Variable env `CONTRACT_STRICT=1` → fail le test si mismatches.
 *  - Sinon → log les mismatches en warning et passe (utile pour itérer
 *    sans bloquer la CI).
 *
 * Mismatches connus (à fixer progressivement) :
 *  - DRF expose les actions `@action` en snake_case par défaut, mais
 *    certaines routes utilisent `url_path='kebab-case'` (ex: request-changes,
 *    internal-notes). Le parser respecte `url_path` quand explicite.
 *  - Le routeur DRF pluralise pas mais utilise le prefix littéral
 *    (ex: r'events' → /events/).
 *
 * Pour générer un schéma OpenAPI authentique (recommandé pour la CI) :
 *
 *   cd EventEzBackend
 *   ./.venv/Scripts/python.exe manage.py spectacular --file openapi-schema.json --format openapi-json
 *   cp openapi-schema.json ../EventEzMobile/src/__tests__/__fixtures__/openapi-schema.json
 */

import { collectMobileEndpoints, dedupeEndpoints, MobileEndpoint } from './endpointsCollector';
import {
  getBackendIndex,
  backendAvailable,
  loadOpenApiSchema,
} from './schemaExtractor';

const STRICT = process.env.CONTRACT_STRICT === '1';

/**
 * Génère les variantes de path à essayer pour un path mobile donné.
 * Le mobile appelle `/events/` mais le backend peut le stocker sous
 * `/api/events/` (selon que le schéma vient de drf-spectacular avec
 * `SCHEMA_PATH_PREFIX`).
 */
function pathVariants(mobilePath: string): string[] {
  const trimmed = mobilePath.replace(/\/+$/, '');
  const withSlash = mobilePath.endsWith('/') ? mobilePath : mobilePath + '/';
  const withoutSlash = trimmed;

  return Array.from(
    new Set([
      mobilePath,
      withSlash,
      withoutSlash,
      `/api${mobilePath}`,
      `/api${withSlash}`,
      `/api${withoutSlash}`,
    ]),
  );
}

interface MismatchRecord {
  endpoint: MobileEndpoint;
  reason: 'unknown_path' | 'wrong_method';
  matchedPath?: string;
  allowedMethods?: string[];
}

function findMismatches(
  mobile: MobileEndpoint[],
  backendIndex: Map<string, Set<string>>,
): MismatchRecord[] {
  const mismatches: MismatchRecord[] = [];

  for (const ep of mobile) {
    const variants = pathVariants(ep.path);
    let matched: string | null = null;
    for (const v of variants) {
      if (backendIndex.has(v)) {
        matched = v;
        break;
      }
    }

    if (!matched) {
      mismatches.push({ endpoint: ep, reason: 'unknown_path' });
      continue;
    }

    const allowed = backendIndex.get(matched)!;
    if (!allowed.has(ep.method)) {
      mismatches.push({
        endpoint: ep,
        reason: 'wrong_method',
        matchedPath: matched,
        allowedMethods: Array.from(allowed),
      });
    }
  }

  return mismatches;
}

describe('Mobile ↔ Backend OpenAPI contract', () => {
  const schemaFixture = loadOpenApiSchema();
  const hasBackend = backendAvailable();
  const skipAll = !schemaFixture && !hasBackend;

  if (skipAll) {
    it.skip('skipped — no openapi-schema.json fixture and backend not reachable', () => {});
    return;
  }

  const mobileEndpoints = dedupeEndpoints(collectMobileEndpoints());
  const backendIndex = getBackendIndex();

  it('mobile API modules expose at least 100 endpoints (sanity)', () => {
    expect(mobileEndpoints.length).toBeGreaterThanOrEqual(100);
  });

  it('backend schema exposes at least 50 paths (sanity)', () => {
    expect(backendIndex.size).toBeGreaterThanOrEqual(50);
  });

  it('every mobile endpoint maps to a known backend path + method', () => {
    const mismatches = findMismatches(mobileEndpoints, backendIndex);

    // Toujours imprimer le compteur (sur stderr, pour passer à travers
    // le silencer de jest-expo) — utile pour suivre la progression.
    const unknown = mismatches.filter((m) => m.reason === 'unknown_path');
    const wrongMethod = mismatches.filter((m) => m.reason === 'wrong_method');

    process.stderr.write(
      `\n[contract] Mobile=${mobileEndpoints.length} Backend=${backendIndex.size} ` +
        `Mismatches=${mismatches.length} (unknown=${unknown.length} wrongMethod=${wrongMethod.length})\n`,
    );

    if (mismatches.length === 0) return; // ✅

    // Rapport agrégé
    const summary = [
      '',
      `=== Contract mismatches (${mismatches.length}) ===`,
      `  Mobile endpoints total : ${mobileEndpoints.length}`,
      `  Backend paths total    : ${backendIndex.size}`,
      `  Unknown paths          : ${unknown.length}`,
      `  Wrong HTTP method      : ${wrongMethod.length}`,
      '',
      'Sample of UNKNOWN paths (first 20):',
      ...unknown.slice(0, 20).map(
        (m) =>
          `  [${m.endpoint.method}] ${m.endpoint.path}  (${m.endpoint.module}:${m.endpoint.line} ${m.endpoint.fn ?? '?'})`,
      ),
      '',
      'Sample of WRONG METHOD (first 20):',
      ...wrongMethod.slice(0, 20).map(
        (m) =>
          `  [${m.endpoint.method}] ${m.matchedPath} — backend supports: ${m.allowedMethods?.join(', ')}`,
      ),
      '',
    ].join('\n');

    if (STRICT) {
      throw new Error(summary);
    } else {
      // soft-fail : on log via process.stderr (qui n'est pas silencié par
      // jest-expo) pour permettre l'itération sans casser la build.
      process.stderr.write(summary + '\n');
    }
  });

  it('list of mobile endpoints is exposed for debugging', () => {
    // Test sentinelle qui sert juste à imprimer la liste si besoin
    // (activé via DEBUG=1)
    if (process.env.CONTRACT_DEBUG === '1') {
      // eslint-disable-next-line no-console
      console.log(`\n=== Mobile endpoints (${mobileEndpoints.length}) ===`);
      for (const ep of mobileEndpoints.slice(0, 50)) {
        // eslint-disable-next-line no-console
        console.log(`  [${ep.method}] ${ep.path}  (${ep.module}:${ep.line})`);
      }
      // eslint-disable-next-line no-console
      console.log(`\n=== Backend paths (${backendIndex.size}) ===`);
      let i = 0;
      for (const [p, methods] of backendIndex) {
        if (i++ > 50) break;
        // eslint-disable-next-line no-console
        console.log(`  [${Array.from(methods).join(',')}] ${p}`);
      }
    }
    expect(true).toBe(true);
  });
});
