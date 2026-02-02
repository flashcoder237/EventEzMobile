/**
 * Mock for expo-splash-screen module
 */

module.exports = {
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
  setOptions: jest.fn(),
};
