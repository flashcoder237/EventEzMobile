/**
 * Mock for expo-font module
 */

module.exports = {
  useFonts: jest.fn(() => [true, null]),
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
  Font: {
    isLoaded: jest.fn(() => true),
    isLoading: jest.fn(() => false),
  },
};
