/**
 * Mock for expo-secure-store module
 */

const store = {};

module.exports = {
  getItemAsync: jest.fn((key) => Promise.resolve(store[key] || null)),
  setItemAsync: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key) => {
    delete store[key];
    return Promise.resolve();
  }),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afterFirstUnlockThisDeviceOnly',
  ALWAYS: 'always',
  ALWAYS_THIS_DEVICE_ONLY: 'alwaysThisDeviceOnly',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'whenPasscodeSetThisDeviceOnly',
  WHEN_UNLOCKED: 'whenUnlocked',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
};
