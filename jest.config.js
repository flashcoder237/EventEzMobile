/**
 * Config Jest pour tests unitaires + composants RN + API smoke.
 *
 * - preset jest-expo : gère les transforms RN/Expo + mocks natifs basiques
 * - setupFilesAfterEach : mocks globaux (AsyncStorage, Reanimated, Notifee...)
 * - transformIgnorePatterns : laisse Babel transformer les modules ESM RN
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/.maestro/',
    '/.expo/',
    // Tests d'intégration MSW : tournent via jest.integration.config.js
    // (Node env, transformIgnorePatterns différents). Exécuter avec :
    //   npx jest --config jest.integration.config.js
    '/__tests__/integration/',
  ],
  transformIgnorePatterns: [
    // Pattern `expo-[a-z-]+` couvre tous les modules expo-XXX (expo-av, expo-image,
    // expo-camera, etc.). Pattern `react-native-[a-z-]+` couvre les libs RN tierces
    // (react-native-image-viewing, etc.) qui exportent en ESM.
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-[a-z-]+|expo(nent)?|expo-modules-core|expo-[a-z-]+|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|sentry-expo|native-base|react-native-svg|@testing-library/react-native|@notifee/.*)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js|jsx)'],
  // Coverage : sortie utile pour l'audit
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__helpers__/**',
    '!src/types/**',
  ],
  coverageReporters: ['text-summary', 'lcov'],
  // Pour les tests qui simulent des timers
  fakeTimers: { enableGlobally: false },
};
