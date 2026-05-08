/**
 * Snapshot tests pour CategoryCard.
 *
 * Couvre les 3 variants (default, large, compact) avec et sans
 * eventCount + image custom.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const lightColors = {
  primary: '#4F46E5',
  card: '#FFFFFF',
  gray400: '#9CA3AF',
  gray700: '#374151',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('../../ui/AnimatedPressable', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, onPress, ...rest }: any) =>
      React.createElement(RN.Pressable, { onPress, ...rest }, children),
  };
});

// Stub CategoryIcons -> View pass-through (pas de SVG pour stabiliser les snapshots)
jest.mock('../../icons/CategoryIcons', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ name, size, color }: any) =>
      React.createElement(RN.View, { 'data-icon': name, 'data-size': size, 'data-color': color }),
  };
});

import CategoryCard from '../CategoryCard';

describe('CategoryCard snapshots', () => {
  it('renders default variant', () => {
    const tree = render(
      <CategoryCard id="music" name="Musique" eventCount={42} />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders default variant without eventCount', () => {
    const tree = render(
      <CategoryCard id="tech" name="Technologie" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders large variant with image', () => {
    const tree = render(
      <CategoryCard
        id="business"
        name="Business"
        eventCount={12}
        variant="large"
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders large variant without image (gradient fallback)', () => {
    const tree = render(
      <CategoryCard
        id="unknown-cat"
        name="Categorie inconnue"
        eventCount={1}
        variant="large"
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders compact variant', () => {
    const tree = render(
      <CategoryCard id="art" name="Art" variant="compact" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
