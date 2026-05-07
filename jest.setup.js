/**
 * Setup global Jest — mocks de modules natifs et globaux.
 *
 * Chargé via setupFiles avant chaque suite. Les mocks ici s'appliquent
 * partout. Les tests peuvent override avec jest.spyOn() ou jest.mock() locaux.
 */

// AsyncStorage : remplacement par un mock en mémoire (le pattern officiel)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated : preset built-in (anime tout en mode synchrone pour les tests)
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// expo-secure-store : in-memory mock
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    setItemAsync: jest.fn((k, v) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((k) => Promise.resolve(store.get(k) ?? null)),
    deleteItemAsync: jest.fn((k) => {
      store.delete(k);
      return Promise.resolve();
    }),
  };
});

// expo-notifications : stub pour les tests qui font require() sur push service
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[mock]' })),
  getDevicePushTokenAsync: jest.fn(() => Promise.resolve({ data: 'fcm-mock' })),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
  IosAuthorizationStatus: { AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
}));

// expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'JestMock',
  modelName: 'TestRunner',
  osName: 'Test',
  osVersion: '1.0',
}));

// expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
    easConfig: null,
  },
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  easConfig: null,
}));

// expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `eventez://${path}`),
  openURL: jest.fn(() => Promise.resolve()),
  openSettings: jest.fn(() => Promise.resolve()),
  parse: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

// @notifee/react-native
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    displayNotification: jest.fn(() => Promise.resolve('notif-id')),
    cancelNotification: jest.fn(() => Promise.resolve()),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
    createChannel: jest.fn(() => Promise.resolve('channel-id')),
    setNotificationCategories: jest.fn(() => Promise.resolve()),
    onForegroundEvent: jest.fn(() => () => {}),
    onBackgroundEvent: jest.fn(),
    requestPermission: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
  },
  EventType: { PRESS: 1, ACTION_PRESS: 2 },
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidVisibility: { PUBLIC: 1, PRIVATE: 0 },
  AndroidColor: { RED: '#EF4444', WHITE: '#FFFFFF' },
}));

// react-native-keyboard-controller : stubs
jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  return {
    KeyboardProvider: ({ children }) => children,
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    KeyboardAwareScrollView: 'KeyboardAwareScrollView',
  };
});

// Silence des warnings RN qui polluent les logs de tests
jest.spyOn(console, 'warn').mockImplementation((msg) => {
  if (typeof msg === 'string' && (
    msg.includes('useNativeDriver') ||
    msg.includes('Animated:')
  )) return;
  // Garde les autres warnings visibles pour debug
  // eslint-disable-next-line no-console
  // console.warn(msg);
});
