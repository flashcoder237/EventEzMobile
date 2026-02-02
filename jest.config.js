module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|expo-asset|expo-font|expo-modules-core)',
  ],
  setupFiles: ['<rootDir>/src/__tests__/jestSetupFile.js'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js|jsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo-asset$': '<rootDir>/src/__tests__/mocks/expoAssetMock.js',
    '^expo-font$': '<rootDir>/src/__tests__/mocks/expoFontMock.js',
    '^expo-splash-screen$': '<rootDir>/src/__tests__/mocks/expoSplashScreenMock.js',
    '^expo-linear-gradient$': '<rootDir>/src/__tests__/mocks/expoLinearGradientMock.js',
    '^expo-blur$': '<rootDir>/src/__tests__/mocks/expoBlurMock.js',
    '^@expo/vector-icons$': '<rootDir>/src/__tests__/mocks/expoVectorIconsMock.js',
    '^@expo/vector-icons/(.*)$': '<rootDir>/src/__tests__/mocks/expoVectorIconsMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  globals: {
    __DEV__: true,
  },
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/react-native-reanimated/mock',
  ],
  testTimeout: 10000,
  bail: false,
  verbose: true,
};
