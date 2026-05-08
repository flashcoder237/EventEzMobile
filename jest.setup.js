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

// react-i18next : mock qui résout les clés depuis le fichier de traduction FR.
// Permet aux tests de chercher les vraies strings affichées (ex: 'Se connecter')
// sans avoir à initialiser i18next ni patcher chaque test individuellement.
jest.mock('react-i18next', () => {
  const fr = require('./src/i18n/locales/fr.json');
  const resolveKey = (key, options) => {
    if (typeof key !== 'string') return key;
    const parts = key.split('.');
    let value = fr;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        // Fallback : si options.defaultValue présent, l'utiliser; sinon retourner la clé
        return options && typeof options === 'object' && options.defaultValue
          ? options.defaultValue
          : key;
      }
    }
    if (typeof value !== 'string') return key;
    // Interpolation simple {{var}}
    if (options && typeof options === 'object') {
      return value.replace(/\{\{(\w+)\}\}/g, (_, k) =>
        options[k] !== undefined ? String(options[k]) : `{{${k}}}`,
      );
    }
    return value;
  };
  return {
    useTranslation: () => ({
      t: resolveKey,
      i18n: {
        changeLanguage: jest.fn(() => Promise.resolve()),
        language: 'fr',
        hasResourceBundle: jest.fn(() => true),
        addResourceBundle: jest.fn(),
      },
    }),
    Trans: ({ children, i18nKey, values }) => {
      const React = require('react');
      const RN = require('react-native');
      const text = i18nKey ? resolveKey(i18nKey, values) : children;
      return React.createElement(RN.Text, null, text);
    },
    initReactI18next: { type: '3rdParty', init: () => {} },
    I18nextProvider: ({ children }) => children,
  };
});

// Reanimated : mock minimal (l'official mock TS de v4 n'est pas transpilé par Jest).
// Les composants réels en runtime utilisent useAnimatedStyle/withTiming etc.
// — on stub juste ce dont les écrans ont besoin pour rendre.
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const React = require('react');
  const View = (props) => React.createElement(RN.View, props, props.children);
  const Text = (props) => React.createElement(RN.Text, props, props.children);
  const noopHook = () => ({});
  const value = (initial) => ({ value: initial });
  const Animated = {
    View,
    Text,
    ScrollView: (props) => React.createElement(RN.ScrollView, props, props.children),
    Image: (props) => React.createElement(RN.Image, props),
    createAnimatedComponent: (C) => C,
    call: () => {},
  };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: value,
    useAnimatedStyle: () => ({}),
    useAnimatedScrollHandler: () => () => {},
    useDerivedValue: value,
    useAnimatedRef: () => ({ current: null }),
    useAnimatedReaction: () => {},
    withTiming: (v) => v,
    withSpring: (v) => v,
    withDelay: (_d, v) => v,
    withRepeat: (v) => v,
    withSequence: (v) => v,
    withDecay: (v) => v,
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    interpolate: () => 0,
    interpolateColor: () => '#000',
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Easing: {
      bezier: () => () => 0,
      linear: () => 0,
      ease: () => 0,
      out: () => () => 0,
      in: () => () => 0,
      inOut: () => () => 0,
    },
    FadeIn: { duration: () => ({ delay: () => ({}) }), delay: () => ({}) },
    FadeOut: { duration: () => ({ delay: () => ({}) }), delay: () => ({}) },
    SlideInDown: { duration: () => ({ delay: () => ({}) }), delay: () => ({}) },
    SlideOutDown: { duration: () => ({ delay: () => ({}) }), delay: () => ({}) },
    Layout: { springify: () => ({}) },
  };
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
    KeyboardAwareScrollView: ({ children }) => children,
  };
});

// @expo/vector-icons : stub Icon -> Text. Sans ce mock, expo-vector-icons
// charge expo-font (ESM) qui crash le parser Jest.
jest.mock('@expo/vector-icons', () => {
  const RN = require('react-native');
  const React = require('react');
  const Stub = (props) => React.createElement(RN.Text, props, props.name || '');
  return new Proxy(
    { Ionicons: Stub },
    { get: (target, prop) => (prop === '__esModule' ? false : target[prop] || Stub) },
  );
});

// expo-font : mock total — chargé indirectement par @expo/vector-icons et autres
jest.mock('expo-font', () => ({
  __esModule: true,
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
  useFonts: jest.fn(() => [true, null]),
  Font: {},
}));

// react-native-safe-area-context : stub SafeAreaView -> View
jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, ...rest }) => React.createElement(RN.View, rest, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
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
