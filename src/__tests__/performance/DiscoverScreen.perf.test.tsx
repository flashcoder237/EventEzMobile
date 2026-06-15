/**
 * Tests de performance — DiscoverScreen.
 *
 * Page d'accueil avec plusieurs sections (featured, nearby, categories,
 * recommendations, advertisements). FlatLists multiples + animations
 * d'entree (FadeInDown, SectionEntrance, StaggeredItem).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// Reanimated mock etendu (FadeInDown, FadeOutUp avec chainage complet)
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const React = require('react');
  const View = (props: any) => React.createElement(RN.View, props, props.children);
  const Text = (props: any) => React.createElement(RN.Text, props, props.children);
  const value = (initial: any) => ({ value: initial });
  const Animated: any = {
    View,
    Text,
    ScrollView: (props: any) => React.createElement(RN.ScrollView, props, props.children),
    Image: (props: any) => React.createElement(RN.Image, props),
    createAnimatedComponent: (C: any) => C,
    call: () => {},
  };
  const makeChainable = () => {
    const chain: any = {};
    chain.delay = () => chain;
    chain.duration = () => chain;
    chain.springify = () => chain;
    chain.damping = () => chain;
    chain.mass = () => chain;
    chain.stiffness = () => chain;
    chain.withInitialValues = () => chain;
    chain.build = () => chain;
    return chain;
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
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    withRepeat: (v: any) => v,
    withSequence: (v: any) => v,
    cancelAnimation: () => {},
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    interpolate: () => 0,
    interpolateColor: () => '#000',
    Extrapolate: { CLAMP: 'clamp' },
    Extrapolation: { CLAMP: 'clamp' },
    Easing: {
      bezier: () => () => 0,
      linear: () => 0,
      out: () => () => 0,
    },
    FadeIn: makeChainable(),
    FadeInDown: makeChainable(),
    FadeInUp: makeChainable(),
    FadeOut: makeChainable(),
    FadeOutUp: makeChainable(),
    FadeOutDown: makeChainable(),
    SlideInDown: makeChainable(),
    SlideOutDown: makeChainable(),
    Layout: { springify: () => ({}) },
  };
});

jest.mock('@react-navigation/native', () => {
  const ReactActual = require('react');
  return {
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({ params: {} }),
    // Le vrai useFocusEffect lance le callback dans un effet (au focus), PAS
    // pendant le rendu. Un mock `(fn) => fn()` l'appelait à CHAQUE rendu →
    // boucle infinie ("too many re-renders"). On le wrappe dans un useEffect
    // (une fois au mount, comme un focus initial).
    useFocusEffect: (cb: any) => {
      ReactActual.useEffect(() => cb(), []);
    },
  };
});

const themeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  success: '#10B981',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  card: '#FFFFFF',
  white: '#FFFFFF',
  text: '#111827',
  border: '#E5E7EB',
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
};
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

jest.mock('../../contexts/NotificationContext', () => ({
  useUnreadCounts: () => ({
    notificationsUnread: 0,
    messagesUnread: 0,
  }),
}));

jest.mock('../../hooks/useCommissionConfig', () => ({
  useCommissionConfig: () => ({
    config: { commission_rate: 0.05, fixed_fee: 100, currency: 'XAF' },
    currency: 'XAF',
  }),
}));

jest.mock('../../hooks/useNetworkSpeed', () => ({
  useNetworkSpeed: () => ({ isSlowCellular: false, isOffline: false }),
}));

jest.mock('../../api', () => ({
  __esModule: true,
  getMediaUrl: (u: string) => u,
  eventsAPI: {
    getEvents: () => Promise.resolve({ data: { results: [] } }),
    getNearbyEvents: () => Promise.resolve({ data: { results: [] } }),
    getFeaturedEvents: () => Promise.resolve({ data: { results: [] } }),
    getUpcomingEvents: () => Promise.resolve({ data: { results: [] } }),
    getEvent: () => Promise.resolve({ data: {} }),
  },
  categoriesAPI: {
    getCategories: () => Promise.resolve({ data: { results: [] } }),
  },
  recommendationsAPI: {
    getRecommendations: () => Promise.resolve({ data: { results: [] } }),
    recordInteraction: () => Promise.resolve({ data: {} }),
  },
  advertisementsAPI: {
    getActive: () => Promise.resolve({ data: { results: [] } }),
    getNearby: () => Promise.resolve({ data: { results: [] } }),
  },
}));

jest.mock('../../services/CacheService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => null),
    set: jest.fn(),
    remove: jest.fn(),
    invalidate: jest.fn(),
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => Promise.resolve({ status: 'denied' }),
  getCurrentPositionAsync: () => Promise.resolve({ coords: { latitude: 0, longitude: 0 } }),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) => React.createElement(RN.View, null, children),
    WatermarkNumeral: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

jest.mock('../../components/ui/Skeleton', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    DiscoverScreenSkeleton: () => React.createElement(RN.View, null),
  };
});

jest.mock('../../components/ui/Animations', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    SectionEntrance: ({ children }: any) => React.createElement(RN.View, null, children),
    StaggeredItem: ({ children }: any) => React.createElement(RN.View, null, children),
    PulsingBadge: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

jest.mock('../../components/ui/AnimatedPressable', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, onPress }: any) =>
      React.createElement(RN.TouchableOpacity, { onPress }, children),
  };
});

jest.mock('../../components/common/AdvertisementCard', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

import DiscoverScreen from '../../screens/events/DiscoverScreen';

describe('DiscoverScreen — performance', () => {
  // Warmup pour absorber le cout de compilation/require Jest (cold-start ~3-4s)
  beforeAll(() => {
    render(<DiscoverScreen />);
  });

  beforeEach(() => jest.clearAllMocks());

  it('mounts in less than 800ms (after warmup)', () => {
    const start = performance.now();
    render(<DiscoverScreen />);
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] DiscoverScreen mount: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(800);
  });

  it('mounts 5 instances in less than 3000ms (regression check)', () => {
    const start = performance.now();
    for (let i = 0; i < 5; i++) {
      render(<DiscoverScreen key={i} />);
    }
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] DiscoverScreen x 5: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(3000);
  });
});
