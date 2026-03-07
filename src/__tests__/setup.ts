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

// Mock de @react-navigation/native-stack
jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: any) => React.createElement('View', { testID: 'stack-navigator' }, children),
      Screen: ({ children }: any) => React.createElement('View', { testID: 'stack-screen' }, children),
      Group: ({ children }: any) => React.createElement('View', { testID: 'stack-group' }, children),
    }),
  };
});

// Mock de @react-navigation/bottom-tabs
jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: any) => React.createElement('View', { testID: 'tab-navigator' }, children),
      Screen: ({ children }: any) => React.createElement('View', { testID: 'tab-screen' }, children),
    }),
  };
});

// Mock des constantes de thème
jest.mock('../constants/theme', () => ({
  Colors: {
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    primaryLight: '#818CF8',
    secondary: '#A855F7',
    success: '#22C55E',
    successLight: '#DCFCE7',
    successDark: '#16A34A',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    errorDark: '#DC2626',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    warningDark: '#D97706',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    infoDark: '#2563EB',
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#FAFAFA',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    gray600: '#757575',
    gray700: '#616161',
    gray800: '#424242',
    gray900: '#212121',
    background: '#FFFFFF',
    backgroundSecondary: '#FAFAFA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#F0F0F0',
    text: '#212121',
    textSecondary: '#757575',
    textLight: '#9E9E9E',
    textInverse: '#FFFFFF',
    primaryBg: '#EEF2FF',
    primaryBgLight: '#FAFAFE',
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    gradientStart: '#4F46E5',
    gradientMiddle: '#A855F7',
    gradientEnd: '#A855F7',
  },
  FontFamily: {
    displayExtraBold: 'FunnelDisplay_800ExtraBold',
    displayBold: 'FunnelDisplay_700Bold',
    displaySemiBold: 'FunnelDisplay_600SemiBold',
    displayMedium: 'FunnelDisplay_500Medium',
    displayRegular: 'FunnelDisplay_400Regular',
    bold: 'Montserrat_700Bold',
    semiBold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    light: 'Montserrat_300Light',
  },
  FontSizes: {
    xs: 11,
    sm: 13,
    md: 14,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  FontWeights: {
    light: '300',
    normal: '400',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  Spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
  },
  BorderRadius: {
    none: 0,
    xs: 4,
    sm: 6,
    md: 8,
    base: 10,
    lg: 12,
    xl: 14,
    '2xl': 16,
    '3xl': 18,
    full: 9999,
  },
  Shadows: {
    none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    xs: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
    xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
    card: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    button: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
    buttonPrimary: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
    fab: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
    bottomBar: { shadowColor: '#000', shadowOffset: { width: 0, height: -1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 4 },
    header: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  },
  Gradients: {
    primary: ['#4F46E5', '#4338CA'],
    subtle: ['rgba(124, 58, 237, 0.03)', 'rgba(124, 58, 237, 0.01)'],
    dark: ['transparent', 'rgba(0,0,0,0.7)'],
    light: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'],
  },
  SafeArea: {
    top: 24,
    bottom: 24,
  },
  TextStyles: {
    h1: { fontFamily: 'FunnelDisplay_700Bold', fontSize: 36, color: '#212121' },
    h2: { fontFamily: 'FunnelDisplay_700Bold', fontSize: 24, color: '#212121' },
    h3: { fontFamily: 'FunnelDisplay_600SemiBold', fontSize: 20, color: '#212121' },
    h4: { fontFamily: 'FunnelDisplay_600SemiBold', fontSize: 17, color: '#212121' },
    body: { fontFamily: 'Montserrat_400Regular', fontSize: 15, color: '#616161' },
    bodyBold: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15, color: '#212121' },
    small: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#757575' },
    smallBold: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#616161' },
    caption: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#9E9E9E' },
    label: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#616161' },
    button: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15, color: '#FFFFFF' },
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
