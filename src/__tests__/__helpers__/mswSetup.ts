/**
 * Setup MSW pour tests d'intégration.
 *
 * Ce fichier doit être importé en haut des test files de
 * `src/__tests__/integration/`. Il :
 *  - force `EXPO_PUBLIC_API_URL` vers `http://test.local/api` AVANT que
 *    `src/api/config.ts` ne soit chargé
 *  - polyfill BroadcastChannel (utilisé par msw/node, absent dans jsdom mais
 *    présent dans Node 22 → no-op si déjà défini)
 *  - configure les hooks listen/reset/close globalement pour le test file
 *
 * MSW v2 requiert `fetch`, `Request`, `Response`, `Headers` globaux. Node 22
 * les fournit nativement, donc rien à polyfill. Si tu vois "Response is not
 * defined", c'est probablement que jest-environment-jsdom est utilisé →
 * importer `undici` et exposer ses globals.
 */

// 1. Override EXPO_PUBLIC_API_URL avant tout import. Doit rester au top du
//    fichier (avant les imports métier de chaque test).
process.env.EXPO_PUBLIC_API_URL = 'http://test.local/api';

// 2. Polyfill BroadcastChannel si absent (Node < 18 / jsdom)
if (typeof (globalThis as any).BroadcastChannel === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { BroadcastChannel } = require('worker_threads');
  (globalThis as any).BroadcastChannel = BroadcastChannel;
}

// 3. Polyfill TextEncoder/TextDecoder si absent (jsdom < 16)
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  (globalThis as any).TextEncoder = TextEncoder;
  (globalThis as any).TextDecoder = TextDecoder;
}

import { server } from './mswServer';

/**
 * À appeler dans chaque test file après les imports :
 *
 *   describe('flow', () => {
 *     setupMswHooks();
 *     // ...
 *   });
 */
export function setupMswHooks() {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}

export { server };
