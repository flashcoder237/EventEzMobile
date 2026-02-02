/**
 * Jest Setup File (runs after environment setup)
 * Configuration globale pour tous les tests
 */

import '@testing-library/jest-native/extend-expect';

// Mock de expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock de expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 4.0511, longitude: 9.7679 },
  })),
  requestBackgroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  watchPositionAsync: jest.fn(),
  LocationAccuracy: {
    High: 4,
    Balanced: 3,
    Low: 2,
    Lowest: 1,
  },
}));

// Mock de expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[xxx]' })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  setBadgeCountAsync: jest.fn(),
}));

// Mock de expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    assets: [{ uri: 'file://test-image.jpg' }],
  })),
  launchCameraAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    assets: [{ uri: 'file://test-camera-image.jpg' }],
  })),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
}));

// Mock de expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  },
  CameraView: jest.fn(),
  CameraType: {
    back: 'back',
    front: 'front',
  },
}));

// Mock de expo-blur
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

// Mock de @react-navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      dispatch: jest.fn(),
      reset: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => true),
    }),
    useRoute: () => ({
      params: {},
      key: 'test-route-key',
      name: 'TestScreen',
    }),
    useFocusEffect: jest.fn((callback) => {
      callback();
    }),
    useIsFocused: () => true,
    NavigationContainer: ({ children }: any) => children,
  };
});

// Mock de react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    SafeAreaProvider: ({ children }: any) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  };
});

// Mock de react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    GestureHandlerRootView: ({ children }: any) => children,
    Swipeable: ({ children }: any) => children,
    DrawerLayout: ({ children }: any) => children,
    State: {},
    PanGestureHandler: ({ children }: any) => children,
    TapGestureHandler: ({ children }: any) => children,
    LongPressGestureHandler: ({ children }: any) => children,
    ScrollView: ({ children, ...props }: any) =>
      React.createElement('ScrollView', props, children),
    FlatList: ({ data, renderItem, keyExtractor, ...props }: any) =>
      React.createElement('FlatList', props),
    TouchableOpacity: ({ children, ...props }: any) =>
      React.createElement('TouchableOpacity', props, children),
    TouchableWithoutFeedback: ({ children, ...props }: any) =>
      React.createElement('TouchableWithoutFeedback', props, children),
    TouchableHighlight: ({ children, ...props }: any) =>
      React.createElement('TouchableHighlight', props, children),
    TouchableNativeFeedback: ({ children, ...props }: any) =>
      React.createElement('TouchableNativeFeedback', props, children),
    Directions: {},
  };
});

// Mock de react-native-screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  screensEnabled: jest.fn(() => true),
}));

// Mock des constantes de thème
jest.mock('../constants/theme', () => ({
  Colors: {
    primary: '#FF6B00',
    primaryLight: '#FFE0CC',
    secondary: '#1A1A2E',
    success: '#10B981',
    successLight: '#D1FAE5',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
  },
  FontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
    displayBold: 'System',
    displaySemiBold: 'System',
  },
  FontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  Spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
  },
  BorderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  Shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
  },
}));

// Silence console warnings in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

global.console = {
  ...console,
  warn: jest.fn((...args) => {
    // Filter out specific warnings if needed
    if (args[0]?.includes?.('React Native')) return;
    originalConsoleWarn(...args);
  }),
  error: jest.fn((...args) => {
    // Filter out specific errors if needed
    if (args[0]?.includes?.('Warning:')) return;
    originalConsoleError(...args);
  }),
};

// Mock fetch global
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
  })
) as jest.Mock;

// Mock setImmediate for flushPromises
global.setImmediate = global.setImmediate || ((fn: () => void) => setTimeout(fn, 0));
