/**
 * Jest config dédiée aux tests d'intégration MSW.
 *
 * Différences clés avec jest.config.js :
 *  - testEnvironment Node "pur" (sans react-native customExportConditions →
 *    msw/node résout vers le bon entry point)
 *  - transformIgnorePatterns ouvert pour msw + ses deps ESM-only (rettime,
 *    until-async, @open-draft/deferred-promise, headers-polyfill, cookie, etc.)
 *  - testMatch limité à src/__tests__/integration/
 *  - hérite des mocks RN/Expo via le même jest.setup.js
 *
 * Usage : `npx jest --config jest.integration.config.js`
 *
 * Les smoke tests existants tournent toujours via la config par défaut
 * (`npx jest`).
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: '<rootDir>/src/__tests__/__helpers__/nodeEnv.js',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.maestro/', '/.expo/'],
  // Liste des modules ESM-only utilisés par MSW que Babel doit transformer.
  // Le `(?!...)` négatif veut dire : "ignore tout sauf ce qui matche ces noms".
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|expo-modules-core|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|sentry-expo|native-base|react-native-svg|@testing-library/react-native|@notifee/.*|msw|@mswjs/.*|@bundled-es-modules/.*|@open-draft/.*|until-async|rettime|headers-polyfill|cookie|statuses|@inquirer/.*|strict-event-emitter|outvariant|is-node-process|path-to-regexp|tough-cookie|picocolors|graphql|type-fest|yargs)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'],
  testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.(ts|tsx|js|jsx)'],
  // jest-expo n'a pas de transformer pour .mjs (rettime, until-async, etc.).
  // On en ajoute un via babel-jest pour les modules ESM-only utilisés par MSW.
  transform: {
    '^.+\\.m?[jt]sx?$': ['babel-jest', { caller: { name: 'metro' }, presets: ['babel-preset-expo'] }],
  },
  fakeTimers: { enableGlobally: false },
};
