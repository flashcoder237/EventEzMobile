/**
 * Tests de performance — EventDetailsScreen.
 *
 * EventDetailsScreen (~1900 lignes) fait beaucoup au mount :
 *  - useEventDetails (hook lourd qui agrege 7 APIs)
 *  - parallax animations + lazy tabs (Reviews, Sponsors, Agenda, Location)
 *  - galerie images, FollowButton, ConvertedPrice, EditorialCanvas
 *
 * On mesure le temps que prend React a rendre le tree statique avec un event
 * preload (pas de fetch, le hook renvoie loading=false immediat).
 *
 * Seuils larges pour ne pas etre flaky en CI.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// ── Reanimated extension : EventDetailsScreen utilise FadeInUp avec
// chainage delay/duration/springify, le mock global de jest.setup.js ne
// chaine pas tous les niveaux. On cree un proxy qui retourne toujours
// un chainable compatible.
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
  // Chainable infini : .delay(...).duration(...).springify() etc renvoient toujours
  // le meme objet — assez pour passer les call-sites au mount.
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
    withDecay: (v: any) => v,
    cancelAnimation: () => {},
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
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
    FadeIn: makeChainable(),
    FadeOut: makeChainable(),
    FadeInUp: makeChainable(),
    FadeInDown: makeChainable(),
    FadeOutUp: makeChainable(),
    FadeOutDown: makeChainable(),
    SlideInDown: makeChainable(),
    SlideOutDown: makeChainable(),
    SlideInUp: makeChainable(),
    SlideOutUp: makeChainable(),
    ZoomIn: makeChainable(),
    ZoomOut: makeChainable(),
    Layout: { springify: () => ({}) },
  };
});

// ── Navigation ────────────────────────────────────────────────────
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: { eventId: 'evt-1' },
  }),
  useFocusEffect: (fn: any) => fn(),
}));

// ── Theme / Auth / Alert ──────────────────────────────────────────
const themeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  warning: '#F59E0B',
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
  useTheme: () => ({
    colors: themeColors,
    isDark: false,
    gradients: {
      primary: ['#4F46E5', '#A855F7'] as const,
      accent: ['#FF6B6B', '#FF8E8E'] as const,
    },
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'a@b.com' },
    isAuthenticated: true,
  }),
}));

jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showConfirm: jest.fn(),
    showAlert: jest.fn(),
  }),
}));

// ── useEventDetails — renvoie un event preload (loading=false direct) ──
const fakeEvent = {
  id: 'evt-1',
  title: 'Festival Indie 2026',
  description: 'Description courte',
  event_type: 'billetterie',
  status: 'validated',
  start_date: '2026-09-01T19:00:00Z',
  end_date: '2026-09-01T23:00:00Z',
  location_type: 'in_person',
  location_city: 'Douala',
  location_country: 'Cameroun',
  organizer: { id: 1, first_name: 'Alice', company_name: 'Acme' },
  banner_image: null,
  gallery_images: [],
  view_count: 100,
  registration_count: 25,
  currency: 'XAF',
  ticket_types: [],
};

jest.mock('../../hooks/useEventDetails', () => ({
  useEventDetails: () => ({
    event: fakeEvent,
    loading: false,
    isPreview: false,
    isFollowing: false,
    setIsFollowing: jest.fn(),
    followersCount: 10,
    setFollowersCount: jest.fn(),
    activeTab: 'about',
    setActiveTab: jest.fn(),
    showReviewForm: false,
    setShowReviewForm: jest.fn(),
    reviewRating: 0,
    setReviewRating: jest.fn(),
    reviewComment: '',
    setReviewComment: jest.fn(),
    submittingReview: false,
    userReview: null,
    waitlistEntry: null,
    joiningWaitlist: false,
    userRegistration: null,
    feedbacks: [],
    loadingFeedbacks: false,
    sessions: [],
    loadingSessions: false,
    showImageViewer: false,
    setShowImageViewer: jest.fn(),
    scrollViewRef: { current: null },
    tabsOffsetY: { current: 0 },
    handleShare: jest.fn(),
    handleShareToWhatsApp: jest.fn(),
    handleContactOrganizer: jest.fn(),
    handleSubmitReview: jest.fn(),
    handleJoinWaitlist: jest.fn(),
    handleLeaveWaitlist: jest.fn(),
    getTicketAvailability: () => 100,
    areAllTicketsSoldOut: () => false,
    formatDate: (d: string) => d,
    formatDateShort: (d: string) => d,
    formatTime: (d: string) => '19:00',
    isPaymentRequired: () => true,
    navigation: { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() },
    user: { id: 1, email: 'a@b.com' },
    showError: jest.fn(),
  }),
}));

jest.mock('../../hooks/useAuthGuard', () => ({
  useAuthGuard: () => ({ requireAuth: (fn: any) => fn() }),
}));

// ── API ──────────────────────────────────────────────────────────
jest.mock('../../api', () => ({
  __esModule: true,
  getMediaUrl: (u: string) => u,
  eventsAPI: {
    verifyAccessCode: jest.fn(() => Promise.resolve({ data: { valid: true } })),
  },
}));

// ── expo-image / blur / linear-gradient / image-viewing ──────────
jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

jest.mock('expo-blur', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    BlurView: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('react-native-image-viewing', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

// ── Composants potentiellement lourds — neutralises ────────────
jest.mock('../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EditorialCanvas: ({ children }: any) => React.createElement(RN.View, null, children),
    WatermarkNumeral: ({ children }: any) => React.createElement(RN.View, null, children),
    EditorialPillCTA: ({ children, onPress }: any) =>
      React.createElement(RN.TouchableOpacity, { onPress }, children),
    EditorialColors: { ink: '#111', sand: '#F4F3F0' },
  };
});

jest.mock('../../components/ui/BlurHeader', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

jest.mock('../../components/events/FollowEventButton', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

jest.mock('../../components/common/FollowUserButton', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

jest.mock('../../components/events/AddToCalendarButton', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

jest.mock('../../components/events/AboutTab', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

jest.mock('../../components/events/TicketsTab', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

jest.mock('../../components/events/SimilarEventsSection', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

jest.mock('../../components/ui/Skeleton', () => {
  const RN = require('react-native');
  return {
    DetailScreenSkeleton: () => RN.View,
  };
});

jest.mock('../../components/ui/Badge', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    Badge: ({ children }: any) => React.createElement(RN.Text, null, children),
  };
});

jest.mock('../../components/common/ConvertedPrice', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

import EventDetailsScreen from '../../screens/events/EventDetailsScreen';

describe('EventDetailsScreen — performance', () => {
  // Warmup : un render avant le beforeEach pour eviter le cout de
  // module compilation/transformation Jest dans la mesure (Babel parse +
  // require chain). Ce cold-start est ~3-4s en sandbox CI mais ne
  // reflete pas le runtime mobile.
  beforeAll(() => {
    render(<EventDetailsScreen />);
  });

  beforeEach(() => jest.clearAllMocks());

  it('mounts in less than 800ms (after warmup)', () => {
    const start = performance.now();
    render(<EventDetailsScreen />);
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] EventDetailsScreen mount: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(800);
  });

  it('mounts 5 instances in less than 3000ms (regression check)', () => {
    const start = performance.now();
    for (let i = 0; i < 5; i++) {
      render(<EventDetailsScreen key={i} />);
    }
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] EventDetailsScreen x 5: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(3000);
  });
});
