/**
 * Mock for expo-asset module
 */

const Asset = {
  loadAsync: jest.fn(() => Promise.resolve()),
  fromModule: jest.fn((module) => ({
    downloadAsync: jest.fn(() => Promise.resolve()),
    uri: 'mock-asset-uri',
    localUri: 'mock-local-uri',
    width: 100,
    height: 100,
    name: 'mock-asset',
    type: 'png',
  })),
  fromURI: jest.fn((uri) => ({
    downloadAsync: jest.fn(() => Promise.resolve()),
    uri: uri,
    localUri: uri,
  })),
};

module.exports = {
  Asset,
};
