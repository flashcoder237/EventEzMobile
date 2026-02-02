/**
 * Jest Setup File (runs before tests)
 * Sets up React Native mocks before any imports
 */

// Set global variables first
global.__DEV__ = true;

// Create mock React for use in mocks
const React = require('react');

// Helper to create a mock component
const createMockComponent = (name) => {
  const component = React.forwardRef((props, ref) => {
    return React.createElement(name, { ...props, ref });
  });
  component.displayName = name;
  return component;
};

// Mock Animated Value
const createMockAnimatedValue = (initialValue) => ({
  _value: initialValue,
  setValue: jest.fn(),
  setOffset: jest.fn(),
  flattenOffset: jest.fn(),
  addListener: jest.fn(() => 'listener-id'),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  stopAnimation: jest.fn((cb) => cb && cb(initialValue)),
  resetAnimation: jest.fn((cb) => cb && cb(initialValue)),
  interpolate: jest.fn(() => createMockAnimatedValue(0)),
  __getValue: jest.fn(() => initialValue),
});

// Mock react-native
jest.mock('react-native', () => {
  const React = require('react');

  const View = createMockComponent('View');
  const Text = createMockComponent('Text');
  const Image = createMockComponent('Image');
  const ScrollView = createMockComponent('ScrollView');
  const FlatList = createMockComponent('FlatList');
  const TextInput = createMockComponent('TextInput');
  const TouchableOpacity = createMockComponent('TouchableOpacity');
  const TouchableHighlight = createMockComponent('TouchableHighlight');
  const TouchableWithoutFeedback = createMockComponent('TouchableWithoutFeedback');
  const ActivityIndicator = createMockComponent('ActivityIndicator');
  const Modal = createMockComponent('Modal');
  const RefreshControl = createMockComponent('RefreshControl');
  const SafeAreaView = createMockComponent('SafeAreaView');
  const StatusBar = createMockComponent('StatusBar');
  const KeyboardAvoidingView = createMockComponent('KeyboardAvoidingView');
  const Pressable = createMockComponent('Pressable');
  const Switch = createMockComponent('Switch');
  const SectionList = createMockComponent('SectionList');

  return {
    // Components
    View,
    Text,
    Image,
    ScrollView,
    FlatList,
    TextInput,
    TouchableOpacity,
    TouchableHighlight,
    TouchableWithoutFeedback,
    ActivityIndicator,
    Modal,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    KeyboardAvoidingView,
    Pressable,
    Switch,
    SectionList,

    // StyleSheet
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => {
        if (Array.isArray(style)) {
          return Object.assign({}, ...style.filter(Boolean));
        }
        return style || {};
      },
      compose: (style1, style2) => [style1, style2],
      hairlineWidth: 1,
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    },

    // Dimensions
    Dimensions: {
      get: jest.fn().mockReturnValue({ width: 375, height: 812, scale: 2, fontScale: 1 }),
      set: jest.fn(),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },

    // PixelRatio
    PixelRatio: {
      get: jest.fn().mockReturnValue(2),
      getFontScale: jest.fn().mockReturnValue(1),
      getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
      roundToNearestPixel: jest.fn((size) => Math.round(size)),
    },

    // Platform
    Platform: {
      OS: 'ios',
      Version: '14.0',
      isPad: false,
      isTVOS: false,
      isTV: false,
      select: jest.fn((obj) => obj.ios || obj.default),
    },

    // Animated
    Animated: {
      Value: jest.fn((value) => createMockAnimatedValue(value)),
      ValueXY: jest.fn(() => ({
        x: createMockAnimatedValue(0),
        y: createMockAnimatedValue(0),
        setValue: jest.fn(),
        setOffset: jest.fn(),
        flattenOffset: jest.fn(),
        stopAnimation: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        getLayout: jest.fn(() => ({})),
        getTranslateTransform: jest.fn(() => []),
      })),
      timing: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      spring: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      decay: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
      })),
      stagger: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
      })),
      loop: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
      })),
      event: jest.fn(() => jest.fn()),
      add: jest.fn(() => createMockAnimatedValue(0)),
      subtract: jest.fn(() => createMockAnimatedValue(0)),
      divide: jest.fn(() => createMockAnimatedValue(0)),
      multiply: jest.fn(() => createMockAnimatedValue(0)),
      modulo: jest.fn(() => createMockAnimatedValue(0)),
      diffClamp: jest.fn(() => createMockAnimatedValue(0)),
      delay: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
      })),
      createAnimatedComponent: jest.fn((Component) => Component),
      View,
      Text,
      Image,
      ScrollView,
      FlatList,
    },

    // NativeModules
    NativeModules: {
      UIManager: {
        RCTView: () => {},
        measure: jest.fn(),
        measureInWindow: jest.fn(),
        measureLayout: jest.fn(),
      },
      StatusBarManager: {
        getHeight: jest.fn((cb) => cb && cb({ height: 44 })),
        setStyle: jest.fn(),
        setHidden: jest.fn(),
      },
      SettingsManager: {
        settings: {},
        getConstants: () => ({ settings: {} }),
      },
      PlatformConstants: {
        forceTouchAvailable: false,
      },
    },

    // Appearance
    Appearance: {
      getColorScheme: jest.fn(() => 'light'),
      addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
    },

    // useColorScheme hook
    useColorScheme: jest.fn(() => 'light'),

    // useWindowDimensions hook
    useWindowDimensions: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),

    // AccessibilityInfo
    AccessibilityInfo: {
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      announceForAccessibility: jest.fn(),
    },

    // Keyboard
    Keyboard: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
      dismiss: jest.fn(),
    },

    // Linking
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
      getInitialURL: jest.fn(() => Promise.resolve(null)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },

    // Share
    Share: {
      share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
    },

    // Alert
    Alert: {
      alert: jest.fn(),
      prompt: jest.fn(),
    },

    // Vibration
    Vibration: {
      vibrate: jest.fn(),
      cancel: jest.fn(),
    },

    // BackHandler
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    },

    // InteractionManager
    InteractionManager: {
      runAfterInteractions: jest.fn((cb) => {
        cb && cb();
        return { then: jest.fn(), done: jest.fn(), cancel: jest.fn() };
      }),
      createInteractionHandle: jest.fn(),
      clearInteractionHandle: jest.fn(),
    },

    // AppState
    AppState: {
      currentState: 'active',
      isAvailable: true,
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },

    // I18nManager
    I18nManager: {
      isRTL: false,
      allowRTL: jest.fn(),
      forceRTL: jest.fn(),
    },

    // LogBox
    LogBox: {
      ignoreLogs: jest.fn(),
      ignoreAllLogs: jest.fn(),
    },
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');

  const View = React.forwardRef((props, ref) => {
    return React.createElement('View', { ...props, ref });
  });
  View.displayName = 'Animated.View';

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (component) => component,
      View,
      Text: View,
      Image: View,
      ScrollView: View,
    },
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    useDerivedValue: jest.fn((fn) => ({ value: typeof fn === 'function' ? fn() : fn })),
    useAnimatedGestureHandler: jest.fn(() => ({})),
    useAnimatedScrollHandler: jest.fn(() => ({})),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    useAnimatedReaction: jest.fn(),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withDelay: jest.fn((_, value) => value),
    withSequence: jest.fn((...values) => values[0]),
    withRepeat: jest.fn((value) => value),
    cancelAnimation: jest.fn(),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    interpolate: jest.fn((value) => value),
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Easing: {
      linear: (t) => t,
      ease: (t) => t,
      bezier: () => (t) => t,
      in: (t) => t,
      out: (t) => t,
      inOut: (t) => t,
    },
    Layout: {
      duration: jest.fn(() => ({})),
      springify: jest.fn(() => ({})),
    },
    FadeIn: { duration: jest.fn(() => ({})) },
    FadeOut: { duration: jest.fn(() => ({})) },
    FadeInDown: { duration: jest.fn(() => ({})) },
    FadeOutUp: { duration: jest.fn(() => ({})) },
    SlideInRight: { duration: jest.fn(() => ({})) },
    SlideOutLeft: { duration: jest.fn(() => ({})) },
    SlideInLeft: { duration: jest.fn(() => ({})) },
    SlideOutRight: { duration: jest.fn(() => ({})) },
    ZoomIn: { duration: jest.fn(() => ({})) },
    ZoomOut: { duration: jest.fn(() => ({})) },
    createAnimatedComponent: (component) => component,
    Animated: {
      View,
      Text: View,
      Image: View,
      ScrollView: View,
      FlatList: View,
    },
  };
});

// Note: The following expo modules are handled by moduleNameMapper in jest.config.js:
// - expo-asset
// - expo-font
// - expo-splash-screen
// - expo-linear-gradient
// - expo-blur
// - @expo/vector-icons

// Mock window for jsdom environment
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };
  };
}

// Suppress console warnings in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') ||
     args[0].includes('act(...)') ||
     args[0].includes('React Native'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('React Native')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};
