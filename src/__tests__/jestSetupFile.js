/**
 * Jest Setup File (runs before tests)
 * Sets up React Native mocks before any imports
 * This file runs BEFORE the jest-expo preset loads
 */

// Set global variables first
global.__DEV__ = true;

// Mock react-native before anything else loads
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  // Mock Dimensions
  RN.Dimensions = {
    get: jest.fn().mockReturnValue({ width: 375, height: 812, scale: 2, fontScale: 1 }),
    set: jest.fn(),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  };

  // Mock PixelRatio
  RN.PixelRatio = {
    get: jest.fn().mockReturnValue(2),
    getFontScale: jest.fn().mockReturnValue(1),
    getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
    roundToNearestPixel: jest.fn((size) => Math.round(size)),
  };

  // Ensure StyleSheet.create returns the styles
  const originalStyleSheet = RN.StyleSheet;
  RN.StyleSheet = {
    ...originalStyleSheet,
    create: (styles) => styles,
    flatten: originalStyleSheet.flatten || ((style) => {
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.filter(Boolean));
      }
      return style || {};
    }),
    compose: originalStyleSheet.compose || ((style1, style2) => [style1, style2]),
    hairlineWidth: 1,
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  };

  // Mock Animated
  const mockAnimatedValue = (value) => ({
    _value: value,
    _animation: null,
    _listeners: [],
    setValue: jest.fn((newValue) => { mockAnimatedValue._value = newValue; }),
    setOffset: jest.fn(),
    flattenOffset: jest.fn(),
    addListener: jest.fn(() => 'listener-id'),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    stopAnimation: jest.fn((callback) => callback && callback(value)),
    resetAnimation: jest.fn((callback) => callback && callback(value)),
    interpolate: jest.fn(() => mockAnimatedValue(0)),
    __getValue: jest.fn(() => value),
  });

  RN.Animated = {
    ...RN.Animated,
    Value: jest.fn((value) => mockAnimatedValue(value)),
    ValueXY: jest.fn(() => ({
      x: mockAnimatedValue(0),
      y: mockAnimatedValue(0),
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
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    decay: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
    })),
    stagger: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
    })),
    loop: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    })),
    event: jest.fn(() => jest.fn()),
    add: jest.fn(() => mockAnimatedValue(0)),
    subtract: jest.fn(() => mockAnimatedValue(0)),
    divide: jest.fn(() => mockAnimatedValue(0)),
    multiply: jest.fn(() => mockAnimatedValue(0)),
    modulo: jest.fn(() => mockAnimatedValue(0)),
    diffClamp: jest.fn(() => mockAnimatedValue(0)),
    delay: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
    })),
    createAnimatedComponent: jest.fn((Component) => Component),
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
  };

  // Mock Platform
  RN.Platform = {
    OS: 'ios',
    Version: '14.0',
    isPad: false,
    isTVOS: false,
    isTV: false,
    select: jest.fn((obj) => obj.ios || obj.default),
  };

  // Mock NativeModules
  RN.NativeModules = {
    ...RN.NativeModules,
    UIManager: {
      RCTView: () => {},
      measure: jest.fn(),
      measureInWindow: jest.fn(),
      measureLayout: jest.fn(),
      createView: jest.fn(),
      updateView: jest.fn(),
      removeSubviewsFromContainerWithID: jest.fn(),
      replaceExistingNonRootView: jest.fn(),
      setChildren: jest.fn(),
      manageChildren: jest.fn(),
    },
    StatusBarManager: {
      getHeight: jest.fn((callback) => callback({ height: 44 })),
      setStyle: jest.fn(),
      setHidden: jest.fn(),
      setNetworkActivityIndicatorVisible: jest.fn(),
    },
    SettingsManager: {
      settings: {},
      getConstants: () => ({ settings: {} }),
    },
    PlatformConstants: {
      forceTouchAvailable: false,
    },
    DeviceInfo: {
      Dimensions: { window: { width: 375, height: 812, scale: 2, fontScale: 1 } },
    },
  };

  // Mock Appearance
  RN.Appearance = {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  };

  // Mock useColorScheme
  RN.useColorScheme = jest.fn(() => 'light');

  // Mock AccessibilityInfo
  RN.AccessibilityInfo = {
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    announceForAccessibility: jest.fn(),
    setAccessibilityFocus: jest.fn(),
  };

  // Mock Keyboard
  RN.Keyboard = {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    dismiss: jest.fn(),
    scheduleLayoutAnimation: jest.fn(),
  };

  // Mock Linking
  RN.Linking = {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  };

  // Mock Share
  RN.Share = {
    share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
  };

  // Mock Alert
  RN.Alert = {
    alert: jest.fn(),
    prompt: jest.fn(),
  };

  // Mock Vibration
  RN.Vibration = {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  };

  // Mock BackHandler
  RN.BackHandler = {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    exitApp: jest.fn(),
  };

  // Mock InteractionManager
  RN.InteractionManager = {
    runAfterInteractions: jest.fn((callback) => {
      callback && callback();
      return { then: jest.fn(), done: jest.fn(), cancel: jest.fn() };
    }),
    createInteractionHandle: jest.fn(),
    clearInteractionHandle: jest.fn(),
    setDeadline: jest.fn(),
  };

  // Mock AppState
  RN.AppState = {
    currentState: 'active',
    isAvailable: true,
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  };

  return RN;
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');

  const View = React.forwardRef((props, ref) => {
    return React.createElement('View', { ...props, ref });
  });

  return {
    __esModule: true,
    default: {
      call: jest.fn(),
      createAnimatedComponent: (component) => component,
      Value: jest.fn(() => ({ setValue: jest.fn() })),
      event: jest.fn(),
      add: jest.fn(),
      eq: jest.fn(),
      set: jest.fn(),
      cond: jest.fn(),
      interpolate: jest.fn(),
      View,
      Text: View,
      Image: View,
      ScrollView: View,
      FlatList: View,
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
      linear: jest.fn((t) => t),
      ease: jest.fn((t) => t),
      bezier: jest.fn(() => (t) => t),
      in: jest.fn((t) => t),
      out: jest.fn((t) => t),
      inOut: jest.fn((t) => t),
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

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const mockComponent = (name) => {
    const MockIcon = React.forwardRef((props, ref) =>
      React.createElement('Text', { ...props, ref, testID: `icon-${props.name}` }, props.name)
    );
    MockIcon.displayName = name;
    return MockIcon;
  };

  return {
    Ionicons: mockComponent('Ionicons'),
    MaterialIcons: mockComponent('MaterialIcons'),
    FontAwesome: mockComponent('FontAwesome'),
    FontAwesome5: mockComponent('FontAwesome5'),
    Feather: mockComponent('Feather'),
    MaterialCommunityIcons: mockComponent('MaterialCommunityIcons'),
    AntDesign: mockComponent('AntDesign'),
    Entypo: mockComponent('Entypo'),
    EvilIcons: mockComponent('EvilIcons'),
    Foundation: mockComponent('Foundation'),
    Octicons: mockComponent('Octicons'),
    SimpleLineIcons: mockComponent('SimpleLineIcons'),
    Zocial: mockComponent('Zocial'),
    createIconSet: jest.fn(() => mockComponent('CustomIcon')),
    createIconSetFromFontello: jest.fn(() => mockComponent('FontelloIcon')),
    createIconSetFromIcoMoon: jest.fn(() => mockComponent('IcoMoonIcon')),
  };
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: React.forwardRef(({ children, ...props }, ref) =>
      React.createElement('View', { ...props, ref }, children)
    ),
  };
});

// Mock expo-blur
jest.mock('expo-blur', () => {
  const React = require('react');
  return {
    BlurView: React.forwardRef(({ children, ...props }, ref) =>
      React.createElement('View', { ...props, ref }, children)
    ),
  };
});

// Mock expo-font
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

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

// Suppress console warnings about unhandled promise rejections in tests
const originalConsoleError = console.error;
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
