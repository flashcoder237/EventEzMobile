/**
 * Jest Setup File (runs before tests)
 * Sets up React Native mocks before any imports
 */

// Must mock before any imports happen
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn().mockReturnValue({ width: 375, height: 812, scale: 2, fontScale: 1 }),
  set: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

jest.mock('react-native/Libraries/Utilities/PixelRatio', () => ({
  get: jest.fn().mockReturnValue(2),
  getFontScale: jest.fn().mockReturnValue(1),
  getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
  roundToNearestPixel: jest.fn((size) => Math.round(size)),
}));

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
    useDerivedValue: jest.fn((fn) => ({ value: fn() })),
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

// Set global variables
global.__DEV__ = true;

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
