/**
 * Backend schema extractor.
 *
 * Parses Django URL configuration + DRF ViewSets at test runtime to build
 * a list of available `{path, methods}` pairs. Used as a fallback when
 * `manage.py spectacular` cannot be executed (e.g. CI without Python venv).
 *
 * If a real `openapi-schema.json` is present in `__fixtures__`, it is
 * preferred — this extractor is the fallback.
 *
 * Approach :
 *  1. Lit `config/urls.py` pour récupérer les `router.register(...)` + les
 *     `path('api/...', include('apps.X.urls'))` + les paths directs.
 *  2. Pour chaque app sub-router, lit `apps/X/urls.py` et extrait les
 *     `router.register(...)`.
 *  3. Pour chaque ViewSet enregistré, scanne le fichier views.py
 *     correspondant pour trouver les `@action(detail=..., methods=[...])`
 *     decorators (custom actions exposées sur le router DRF).
 *  4. Construit les paths normalisés avec `{id}` pour les params PK.
 *
 * Limitations connues :
 *  - Les ViewSets ne sont pas tous dans `views.py` (certains apps utilisent
 *    `agenda_views.py`, `template_views.py`, etc.). On scanne donc tous les
 *    fichiers `*_views.py` + `views.py` de chaque app.
 *  - Les paths Django avec converter custom (ex: `<str:token>`) sont
 *    normalisés en `{token}`.
 *  - Les SerializerMixin et autres peuvent ajouter des actions implicites
 *    (list, retrieve, create, update, partial_update, destroy) — on les
 *    ajoute par défaut pour chaque ViewSet enregistré.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BackendEndpoint {
  path: string; // e.g. /events/{id}/publish/
  methods: Set<string>; // e.g. Set(['POST'])
  source: string; // pour debug : 'router:events.publish' ou 'urls:auth'
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// Default ViewSet methods provided by DRF DefaultRouter
// (list/create on collection, retrieve/update/partial_update/destroy on detail)
const VIEWSET_DEFAULT_COLLECTION_METHODS = new Set(['GET', 'POST']);
const VIEWSET_DEFAULT_DETAIL_METHODS = new Set([
  'GET',
  'PUT',
  'PATCH',
  'DELETE',
]);

// __dirname = .../EventEzMobile/src/__tests__/contracts
// On remonte 4 niveaux pour atteindre .../EventEz/, puis EventEzBackend.
const BACKEND_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'EventEzBackend',
);

/**
 * Vérifie que le backend est accessible depuis le repo. Si non (ex: CI mobile
 * isolée), l'extracteur retourne null pour permettre un soft-skip.
 */
export function backendAvailable(): boolean {
  try {
    return fs.existsSync(path.join(BACKEND_ROOT, 'manage.py'));
  } catch {
    return false;
  }
}

/**
 * Lit un fichier texte si présent, sinon null.
 */
function readFileSafe(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Extrait les `router.register(r'<prefix>', <ViewSet>, ...)` d'un fichier
 * urls.py. Retourne `[{prefix, viewset}]`.
 */
function extractRouterRegistrations(
  source: string,
): Array<{ prefix: string; viewset: string }> {
  const regex = /router\.register\(\s*r?['"]([^'"]*)['"]\s*,\s*([A-Za-z_][\w.]*)/g;
  const out: Array<{ prefix: string; viewset: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(source)) !== null) {
    out.push({ prefix: m[1], viewset: m[2].split('.').pop() || m[2] });
  }
  return out;
}

/**
 * Extrait les `path('<route>', <view>.as_view(), ...)` d'un fichier urls.py.
 */
function extractPathPatterns(source: string): string[] {
  const regex = /\bpath\(\s*['"]([^'"]*)['"]\s*,/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(source)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/**
 * Extrait les `path('<prefix>', include('apps.X.urls'))` d'un fichier urls.py.
 */
function extractIncludes(source: string): Array<{ prefix: string; module: string }> {
  const regex = /\bpath\(\s*['"]([^'"]*)['"]\s*,\s*include\(\s*['"]([^'"]+)['"]\s*\)/g;
  const out: Array<{ prefix: string; module: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(source)) !== null) {
    out.push({ prefix: m[1], module: m[2] });
  }
  return out;
}

/**
 * Normalise un Django URL pattern en path OpenAPI :
 *  - `<int:pk>` → `{id}`
 *  - `<str:token>` → `{token}`
 *  - `<uuid:registration_id>` → `{registration_id}`
 *  - retire le slash de tête si présent.
 */
function normalizeDjangoPath(p: string): string {
  return (
    '/' +
    p
      .replace(/<\w+:(\w+)>/g, '{$1}')
      .replace(/<(\w+)>/g, '{$1}')
      .replace(/^\/+/, '')
  );
}

/**
 * Trouve tous les fichiers *_views.py + views.py d'une app Django.
 */
function findAppViewFiles(appDir: string): string[] {
  try {
    const entries = fs.readdirSync(appDir);
    return entries
      .filter((e) => e === 'views.py' || e.endsWith('_views.py'))
      .map((e) => path.join(appDir, e));
  } catch {
    return [];
  }
}

/**
 * Parse les `@action(detail=..., methods=[...])` d'un fichier views.py et
 * retourne la liste des actions trouvées par ViewSet.
 */
function extractActionsFromViews(
  source: string,
): Array<{
  viewset: string;
  action: string;
  detail: boolean;
  methods: string[];
  urlPath?: string;
}> {
  const out: Array<{
    viewset: string;
    action: string;
    detail: boolean;
    methods: string[];
    urlPath?: string;
  }> = [];

  // Découpe par classe ViewSet
  const classRegex = /^class\s+(\w+)\s*\(/gm;
  const classMatches: Array<{ name: string; start: number }> = [];
  let cm: RegExpExecArray | null;
  while ((cm = classRegex.exec(source)) !== null) {
    classMatches.push({ name: cm[1], start: cm.index });
  }

  for (let i = 0; i < classMatches.length; i++) {
    const cls = classMatches[i];
    const end = i + 1 < classMatches.length ? classMatches[i + 1].start : source.length;
    const body = source.slice(cls.start, end);

    // Match @action(...) puis def <name>(
    const actionRegex = /@action\(([^)]*)\)\s*\n\s*def\s+(\w+)\s*\(/g;
    let am: RegExpExecArray | null;
    while ((am = actionRegex.exec(body)) !== null) {
      const args = am[1];
      const fnName = am[2];
      const detail = /detail\s*=\s*True/.test(args);
      const methodsMatch = args.match(/methods\s*=\s*\[([^\]]+)\]/);
      let methods: string[] = ['GET'];
      if (methodsMatch) {
        methods = methodsMatch[1]
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, '').toUpperCase())
          .filter(Boolean);
      }
      const urlPathMatch = args.match(/url_path\s*=\s*['"]([^'"]+)['"]/);
      out.push({
        viewset: cls.name,
        action: fnName,
        detail,
        methods,
        urlPath: urlPathMatch ? urlPathMatch[1] : undefined,
      });
    }
  }
  return out;
}

/**
 * Convertit un nom d'action snake_case en URL slug. DRF expose les actions
 * en `kebab` ou `snake` selon `url_path`. Par défaut, DRF utilise le snake_case
 * littéral (le nom de la fonction tel quel).
 */
function actionToUrlSlug(actionName: string, explicit?: string): string {
  if (explicit) return explicit;
  // DRF default: function name as-is (snake_case)
  return actionName;
}

/**
 * Construit les endpoints d'un ViewSet enregistré sur un router :
 *  - GET/POST /<prefix>/
 *  - GET/PUT/PATCH/DELETE /<prefix>/{id}/
 *  - + custom actions
 */
function buildViewSetEndpoints(
  prefix: string,
  viewsetName: string,
  actions: Array<{
    viewset: string;
    action: string;
    detail: boolean;
    methods: string[];
    urlPath?: string;
  }>,
): BackendEndpoint[] {
  const out: BackendEndpoint[] = [];
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const base = cleanPrefix ? `/${cleanPrefix}/` : '/';

  // Collection-level
  out.push({
    path: base,
    methods: new Set(VIEWSET_DEFAULT_COLLECTION_METHODS),
    source: `router:${viewsetName}.list_create`,
  });
  // Detail-level
  out.push({
    path: `${base}{id}/`,
    methods: new Set(VIEWSET_DEFAULT_DETAIL_METHODS),
    source: `router:${viewsetName}.detail`,
  });

  // Custom actions
  for (const a of actions.filter((x) => x.viewset === viewsetName)) {
    const slug = actionToUrlSlug(a.action, a.urlPath);
    const actionPath = a.detail ? `${base}{id}/${slug}/` : `${base}${slug}/`;
    out.push({
      path: actionPath,
      methods: new Set(a.methods.map((m) => m.toUpperCase())),
      source: `action:${viewsetName}.${a.action}`,
    });
  }

  return out;
}

/**
 * Charge le contenu d'un module Django (apps.X.urls → apps/X/urls.py).
 */
function loadDjangoModule(modulePath: string): string | null {
  // apps.X.urls → apps/X/urls.py
  const rel = modulePath.replace(/\./g, path.sep) + '.py';
  return readFileSafe(path.join(BACKEND_ROOT, rel));
}

/**
 * Trouve le dossier d'une app à partir de `apps.X.urls`.
 */
function appDirFromModule(modulePath: string): string | null {
  // apps.X.urls → apps/X/
  const parts = modulePath.split('.');
  if (parts.length < 2) return null;
  const dir = path.join(BACKEND_ROOT, parts.slice(0, -1).join(path.sep));
  return fs.existsSync(dir) ? dir : null;
}

/**
 * Construit la liste complète des endpoints backend en parsant les fichiers
 * Python. Préfixe tout par `/api/` (mobile pointe sur `EXPO_PUBLIC_API_URL`
 * qui inclut déjà `/api`, donc côté mobile les paths n'incluent PAS `/api/`).
 *
 * Le test fait la normalisation : on retire `/api/` du début du path backend
 * pour comparer avec les paths mobile.
 */
export function extractBackendEndpoints(): BackendEndpoint[] {
  const all: BackendEndpoint[] = [];
  const seen = new Set<string>(); // key = method:path

  function add(ep: BackendEndpoint): void {
    for (const m of ep.methods) {
      const key = `${m}:${ep.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    all.push(ep);
  }

  // 1. Lis le fichier urls.py principal
  const rootUrls = readFileSafe(path.join(BACKEND_ROOT, 'config', 'urls.py'));
  if (!rootUrls) {
    return [];
  }

  // 2. Récupère tous les ViewSets enregistrés sur le router racine
  const rootRegs = extractRouterRegistrations(rootUrls);

  // 3. Scanne tous les *_views.py de toutes les apps pour collecter les @action
  const appsDir = path.join(BACKEND_ROOT, 'apps');
  let allActions: Array<{
    viewset: string;
    action: string;
    detail: boolean;
    methods: string[];
    urlPath?: string;
  }> = [];
  if (fs.existsSync(appsDir)) {
    for (const appName of fs.readdirSync(appsDir)) {
      const appDir = path.join(appsDir, appName);
      if (!fs.statSync(appDir).isDirectory()) continue;
      for (const vf of findAppViewFiles(appDir)) {
        const src = readFileSafe(vf);
        if (src) allActions = allActions.concat(extractActionsFromViews(src));
      }
    }
  }

  // 4. Construis les endpoints du router racine (préfixés par /api/)
  for (const reg of rootRegs) {
    const eps = buildViewSetEndpoints(`/api/${reg.prefix}`, reg.viewset, allActions);
    eps.forEach(add);
  }

  // 5. Paths directs du root urls.py (préfixés par /)
  for (const p of extractPathPatterns(rootUrls)) {
    if (!p.startsWith('api/')) continue;
    const norm = normalizeDjangoPath(p);
    add({
      path: norm,
      methods: new Set(HTTP_METHODS), // on accepte tous les verbes (APIView peut implémenter n'importe quoi)
      source: `path:${p}`,
    });
  }

  // 6. Includes : path('api/X/', include('apps.Y.urls')) + variants
  const includes = extractIncludes(rootUrls);
  for (const inc of includes) {
    const subSource = loadDjangoModule(inc.module);
    if (!subSource) continue;

    // Préfixe à appliquer à tous les sub-paths
    const incPrefix = '/' + inc.prefix.replace(/^\/+|\/+$/g, '');

    // 6a. ViewSets enregistrés dans le sub-urls
    const subRegs = extractRouterRegistrations(subSource);
    for (const reg of subRegs) {
      const subPrefix = reg.prefix.replace(/^\/+|\/+$/g, '');
      const fullPrefix = subPrefix ? `${incPrefix}/${subPrefix}` : incPrefix;
      const eps = buildViewSetEndpoints(fullPrefix, reg.viewset, allActions);
      eps.forEach(add);
    }

    // 6b. Paths directs du sub-urls
    for (const p of extractPathPatterns(subSource)) {
      // Ignore le path('', include(router.urls)) qui est juste un wrapper
      if (p === '' || /include\(/.test(p)) continue;
      const norm = normalizeDjangoPath(p);
      const full = (incPrefix + norm).replace(/\/{2,}/g, '/');
      add({
        path: full,
        methods: new Set(HTTP_METHODS),
        source: `subpath:${inc.module}:${p}`,
      });
    }
  }

  return all;
}

/**
 * Retourne un Map `path → Set<methods>` à partir des endpoints extraits.
 * Permet une lookup rapide. Plusieurs sources peuvent contribuer au même
 * path (ex: ViewSet + APIView) — on union les méthodes.
 */
export function buildBackendIndex(
  endpoints: BackendEndpoint[],
): Map<string, Set<string>> {
  const idx = new Map<string, Set<string>>();
  for (const ep of endpoints) {
    if (!idx.has(ep.path)) idx.set(ep.path, new Set());
    const set = idx.get(ep.path)!;
    for (const m of ep.methods) set.add(m);
  }
  return idx;
}

/**
 * Si un `openapi-schema.json` exporté par drf-spectacular est dispo dans
 * __fixtures__, on l'utilise en priorité. Format OpenAPI 3.0 :
 *   { paths: { '/events/': { get: {...}, post: {...} } } }
 */
export function loadOpenApiSchema():
  | { paths: Record<string, Record<string, unknown>> }
  | null {
  const fixturePath = path.resolve(__dirname, '..', '__fixtures__', 'openapi-schema.json');
  if (!fs.existsSync(fixturePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Source de vérité unique : si schema fixture présent → utilise-le.
 * Sinon → extracteur Python.
 */
export function getBackendIndex(): Map<string, Set<string>> {
  const schema = loadOpenApiSchema();
  if (schema && schema.paths) {
    const idx = new Map<string, Set<string>>();
    for (const [p, methods] of Object.entries(schema.paths)) {
      const set = new Set<string>();
      for (const verb of Object.keys(methods)) {
        if (HTTP_METHODS.includes(verb.toUpperCase())) {
          set.add(verb.toUpperCase());
        }
      }
      idx.set(p, set);
    }
    return idx;
  }

  if (!backendAvailable()) return new Map();

  return buildBackendIndex(extractBackendEndpoints());
}
