/**
 * Snapshot tests pour MapEventCard.
 *
 * Couvre : avec image, sans image (placeholder), free, paid,
 * avec userLocation/distance.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import type { MapMarker } from '../../../types';

const lightColors = {
  primary: '#4F46E5',
  card: '#FFFFFF',
  accent: '#FF6B6B',
  success: '#10B981',
  textSecondary: '#374151',
  gray50: '#F9FAFB',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray900: '#111827',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.Image };
});

jest.mock('../../../api', () => ({
  __esModule: true,
  getMediaUrl: (path?: string | null) =>
    path && (path.startsWith('http://') || path.startsWith('https://'))
      ? path
      : path
      ? `https://test.local${path.startsWith('/') ? '' : '/'}${path}`
      : null,
}));

// formatDate mocke -> sortie deterministe (sinon depend du locale et timezone)
jest.mock('../../../lib/utils/dateFormatters', () => ({
  formatDate: () => '15 juin',
}));

jest.mock('../../icons/CategoryIcons', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ name }: any) => React.createElement(RN.View, { 'data-icon': name }),
  };
});

import MapEventCard from '../MapEventCard';

const baseMarker: MapMarker = {
  id: 'evt-1',
  title: 'Forum Tech 2026',
  lat: 4.0511,
  lng: 9.7679,
  location_name: 'Palais des Congres',
  location_city: 'Douala',
  start_date: '2026-06-15T10:00:00Z',
  category: 'Technologie',
  banner_image: '/media/events/forum.jpg',
  registration_count: 120,
  is_free: false,
  price: 5000,
};

describe('MapEventCard snapshots', () => {
  it('renders paid event with image', () => {
    const tree = render(
      <MapEventCard marker={baseMarker} onPress={() => {}} />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders free event without image (placeholder)', () => {
    const tree = render(
      <MapEventCard
        marker={{ ...baseMarker, banner_image: null, is_free: true, price: undefined }}
        onPress={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with userLocation + distance', () => {
    const tree = render(
      <MapEventCard
        marker={baseMarker}
        userLocation={{ lat: 4.05, lng: 9.7 }}
        calculateDistance={() => 5.3}
        onPress={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders without category', () => {
    const tree = render(
      <MapEventCard
        marker={{ ...baseMarker, category: null }}
        onPress={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
