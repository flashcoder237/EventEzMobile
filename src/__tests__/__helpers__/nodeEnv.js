/**
 * Test environment Node "pur" pour MSW v2.
 *
 * jest-expo / RN ajoute `react-native` aux customExportConditions, ce qui fait
 * que `msw/node` résout vers `null` (le package marque `react-native: null`).
 *
 * Cet environnement supprime cette condition pour que MSW résolve normalement
 * en `node`. À utiliser via le pragma docblock dans chaque test :
 *
 *   /** @jest-environment ./src/__tests__/__helpers__/nodeEnv.js *\/
 */

const NodeEnv = require('jest-environment-node').TestEnvironment;

module.exports = class IntegrationEnv extends NodeEnv {
  // On garde 'node' et 'require' (standard) — sans 'react-native', donc msw/node
  // résout correctement.
  customExportConditions = ['node', 'require', 'default'];
};
