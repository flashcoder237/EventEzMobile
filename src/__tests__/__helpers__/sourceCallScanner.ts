/**
 * Scanner statique des appels HTTP « dispersés » (écrans, hooks, services) :
 * `api.get('/x/')`, `api.post(`/events/${id}/…`)`, `useSWR('/x/')`,
 * `fetch(`${API_BASE_URL}/x/`)`. Les commentaires sont ignorés.
 *
 * Complète le harnais dynamique (qui exécute les objets `xxxAPI`) : un appel
 * écrit en dur dans un composant n'a pas de fonction à exécuter, on le lit
 * donc dans le source. Les `${…}` deviennent `id1`.
 */
import fs from 'fs';
import path from 'path';

export interface SourceCall {
  file: string;
  line: number;
  kind: 'api' | 'swr' | 'fetch';
  /** Verbe HTTP, ou `*` si non déterminable statiquement (fetch). */
  method: string;
  /** Chemin tel qu'écrit dans le source. */
  raw: string;
  /** Chemin relatif à /api, `${…}` → `id1`, sans query string. */
  path: string;
}

const API_CALL =
  /\b(?:api|apiClient|axiosInstance)\.(get|post|put|patch|delete)\s*(?:<[^>()]*>)?\(\s*(['"`])(\/[^'"`]*?)\2/g;
const SWR_CALL = /\buseSWR(?:Immutable|Infinite)?\s*(?:<[^>()]*>)?\(\s*(?:[^,()]*?\?\s*)?(['"`])(\/[^'"`]*?)\1/g;
const FETCH_CALL = /fetch\(\s*`\$\{[^}]*(?:API_URL|API_BASE_URL|apiUrl|API_BASE)[^}]*\}(\/[^`]*)`/g;

/** Remplace les commentaires par des blancs en conservant les numéros de ligne. */
function stripComments(src: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, ' ');
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/^[ \t]*\/\/.*$/gm, blank);
}

function walk(dir: string, exclude: (rel: string) => boolean, root: string, out: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (exclude(rel)) continue;
    if (entry.isDirectory()) walk(full, exclude, root, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) out.push(full);
  }
}

export function toApiPath(raw: string): string {
  let p = raw.replace(/\$\{[^}]*\}/g, 'id1').split('?')[0];
  if (p.startsWith('/api/')) p = p.slice(4);
  return p;
}

export function scanSourceCalls(root: string, exclude: (rel: string) => boolean): SourceCall[] {
  const files: string[] = [];
  walk(root, exclude, root, files);
  const calls: SourceCall[] = [];
  for (const file of files) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const rel = path.relative(root, file).split(path.sep).join('/');
    const lineOf = (idx: number) => src.slice(0, idx).split('\n').length;
    for (const m of src.matchAll(API_CALL)) {
      calls.push({ file: rel, line: lineOf(m.index!), kind: 'api', method: m[1].toUpperCase(), raw: m[3], path: toApiPath(m[3]) });
    }
    for (const m of src.matchAll(SWR_CALL)) {
      calls.push({ file: rel, line: lineOf(m.index!), kind: 'swr', method: 'GET', raw: m[2], path: toApiPath(m[2]) });
    }
    for (const m of src.matchAll(FETCH_CALL)) {
      calls.push({ file: rel, line: lineOf(m.index!), kind: 'fetch', method: '*', raw: m[1], path: toApiPath(m[1]) });
    }
  }
  return calls;
}
