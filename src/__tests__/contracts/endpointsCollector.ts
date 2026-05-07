/**
 * Mobile API endpoint collector.
 *
 * Parse les fichiers `src/api/*.ts` (hors `__tests__/`, `instance.ts`,
 * `index.ts`, `config.ts`) et extrait tous les appels :
 *   api.get(...)   api.post(...)   api.put(...)   api.patch(...)   api.delete(...)
 *   fetchUpload('METHOD', '...', ...)
 *
 * Supporte template literals avec `${id}` (substitué en `{id}`) et chaînes
 * simples. N'évalue pas les expressions complexes — un endpoint "compliqué"
 * (ex: URL construite par concaténation conditionnelle) est skippé avec
 * un warning.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MobileEndpoint {
  module: string; // ex: 'auth.ts'
  fn: string | null; // nom de la fonction (best-effort)
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string; // path normalisé avec {id}
  rawPath: string; // path brut tel qu'écrit dans le code (pour debug)
  line: number;
}

const API_DIR = path.resolve(__dirname, '..', '..', 'api');

// On exclut ces fichiers : ils ne contiennent pas d'endpoints métier.
const EXCLUDED_FILES = new Set([
  'instance.ts',
  'index.ts',
  'config.ts',
  'client.ts', // legacy, conservé pour référence
]);

/**
 * Liste les fichiers `*.ts` directement sous src/api/.
 */
function listApiModules(): string[] {
  if (!fs.existsSync(API_DIR)) return [];
  return fs
    .readdirSync(API_DIR)
    .filter((f) => f.endsWith('.ts') && !EXCLUDED_FILES.has(f))
    .map((f) => path.join(API_DIR, f));
}

/**
 * Normalise un path :
 *  - `${id}`, `${userId}`, etc. → `{id}` (DRF expose tous les PK comme `{id}`)
 *  - Trim trailing/leading whitespace
 */
function normalizeMobilePath(rawPath: string): string {
  return rawPath
    .replace(/\$\{[^}]+\}/g, '{id}')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Trouve le nom de la fonction la plus proche au-dessus d'une position
 * donnée dans le source. Best-effort : cherche la dernière déclaration
 * du type `<name>: (...)` ou `<name>(...) {` ou `<name> = (...)`.
 */
function findEnclosingFnName(source: string, position: number): string | null {
  const before = source.slice(0, position);
  const lines = before.split('\n');

  // Scan en arrière sur ~30 lignes
  const start = Math.max(0, lines.length - 30);
  for (let i = lines.length - 1; i >= start; i--) {
    const line = lines[i];
    // Pattern "  myFn: (..." ou "  myFn(..." ou "  myFn = (..."
    const m =
      line.match(/^\s*(\w+)\s*:\s*\(/) ||
      line.match(/^\s*(\w+)\s*\(/) ||
      line.match(/^\s*(\w+)\s*=\s*\(/);
    if (m && !['const', 'let', 'var', 'function', 'export', 'import', 'return', 'if', 'for', 'while', 'switch'].includes(m[1])) {
      return m[1];
    }
  }
  return null;
}

/**
 * Extrait les endpoints d'un fichier source TypeScript.
 *
 * Patterns reconnus :
 *  1. `api.<method>('<path>', ...)`
 *  2. `api.<method>(\`<template>\`, ...)`
 *  3. `fetchUpload('METHOD', '<path>', ...)`
 */
function extractFromSource(source: string, moduleName: string): MobileEndpoint[] {
  const out: MobileEndpoint[] = [];

  // Pattern 1+2 : api.method('path' | `tpl`)
  const apiCall = /\bapi\.(get|post|put|patch|delete)\s*\(\s*([`'"])((?:\\.|(?!\2)[^\\])*)\2/g;
  let m: RegExpExecArray | null;
  while ((m = apiCall.exec(source)) !== null) {
    const method = m[1].toUpperCase() as MobileEndpoint['method'];
    const rawPath = m[3];
    const norm = normalizeMobilePath(rawPath);
    const lineNum = source.slice(0, m.index).split('\n').length;
    out.push({
      module: moduleName,
      fn: findEnclosingFnName(source, m.index),
      method,
      path: norm,
      rawPath,
      line: lineNum,
    });
  }

  // Pattern 3 : fetchUpload('METHOD', '<path>', ...)
  const uploadCall = /\bfetchUpload\s*\(\s*['"](GET|POST|PUT|PATCH|DELETE)['"]\s*,\s*([`'"])((?:\\.|(?!\2)[^\\])*)\2/g;
  while ((m = uploadCall.exec(source)) !== null) {
    const method = m[1].toUpperCase() as MobileEndpoint['method'];
    const rawPath = m[3];
    const norm = normalizeMobilePath(rawPath);
    const lineNum = source.slice(0, m.index).split('\n').length;
    out.push({
      module: moduleName,
      fn: findEnclosingFnName(source, m.index),
      method,
      path: norm,
      rawPath,
      line: lineNum,
    });
  }

  return out;
}

/**
 * Collecte tous les endpoints depuis tous les modules API mobiles.
 */
export function collectMobileEndpoints(): MobileEndpoint[] {
  const all: MobileEndpoint[] = [];
  for (const modulePath of listApiModules()) {
    const source = fs.readFileSync(modulePath, 'utf-8');
    const moduleName = path.basename(modulePath);
    all.push(...extractFromSource(source, moduleName));
  }
  return all;
}

/**
 * Dédoublonne par (method, path) — garde une seule occurrence.
 */
export function dedupeEndpoints(endpoints: MobileEndpoint[]): MobileEndpoint[] {
  const seen = new Set<string>();
  const out: MobileEndpoint[] = [];
  for (const e of endpoints) {
    const key = `${e.method}:${e.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}
