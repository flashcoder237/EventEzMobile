/**
 * Snapshot tests pour EventCard.
 *
 * Couvre les 5 variants (default, featured, horizontal, compact, grid)
 * + les états importants (isLiked, isFeatured, isFree, locationType, isSoon).
 *
 * Snapshots stables :
 *  - Date fixe distante pour eviter les variations "J-x" liees a Date.now()
 *  - getMediaUrl mocke (renvoie tel quel) pour eviter le prefixe SERVER_BASE_URL
 *    qui depend de EXPO_PUBLIC_API_URL.
 *  - Theme mocke en mode light (couleurs deterministes).
 *  - LinearGradient + AnimatedBookmark + AnimatedPressable stubbes.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// === Theme mock ===
const lightColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryBg: '#EEF2FF',
  accent: '#FF6B6B',
  background: '#F4F3F0',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#374151',
  textTertiary: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#065F46',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#92400E',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoDark: '#1E40AF',
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
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

// === expo-image / expo-linear-gradient ===
jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.Image };
});
jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

// === API helper : retourne le path tel quel pour stabilite des snapshots ===
jest.mock('../../../api', () => ({
  __esModule: true,
  getMediaUrl: (path?: string | null) =>
    path && (path.startsWith('http://') || path.startsWith('https://'))
      ? path
      : path
      ? `https://test.local${path.startsWith('/') ? '' : '/'}${path}`
      : null,
}));

// === AnimatedPressable -> Pressable simple ===
jest.mock('../../ui/AnimatedPressable', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, onPress, ...rest }: any) =>
      React.createElement(RN.Pressable, { onPress, ...rest }, children),
  };
});

// === AnimatedBookmark -> View pass-through (pas d'animation dans le snapshot) ===
jest.mock('../../ui/Animations', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    AnimatedBookmark: ({ children }: any) => React.createElement(RN.View, null, children),
  };
});

// === Date fixe pour stabiliser daysUntil() qui depend de Date.now() ===
beforeAll(() => {
  // 2026-05-04 -> "now" dans les snapshots, J-x calcule depuis cette base
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-05-04T10:00:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});

import EventCard from '../EventCard';

const baseProps = {
  id: 'evt-1',
  title: 'Forum Tech 2026',
  // Date plus de 7 jours plus tard -> pas de pill "J-x"
  date: '2026-06-15T10:00:00Z',
  time: '10:00',
  location: 'Douala, Cameroun',
  imageUrl: '/media/events/forum.jpg',
  category: 'Conference',
  price: 5000,
  attendees: 120,
};

describe('EventCard snapshots', () => {
  it('renders default variant', () => {
    const tree = render(<EventCard {...baseProps} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders default variant with isFeatured + isLiked', () => {
    const tree = render(
      <EventCard {...baseProps} isFeatured isLiked />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders default variant with free event + soon (J-2)', () => {
    const tree = render(
      <EventCard
        {...baseProps}
        date="2026-05-06T10:00:00Z"
        isFree
        price={undefined}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders featured variant', () => {
    const tree = render(
      <EventCard {...baseProps} variant="featured" isFeatured />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders horizontal variant', () => {
    const tree = render(
      <EventCard {...baseProps} variant="horizontal" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders compact variant', () => {
    const tree = render(
      <EventCard {...baseProps} variant="compact" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders grid variant with online location', () => {
    const tree = render(
      <EventCard
        {...baseProps}
        variant="grid"
        locationType="online"
        isLiked
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
