/**
 * Snapshot tests pour EmptyState.
 *
 * Couvre : default container, withCard, avec action, sans description.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const lightColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  surface: '#FFFFFF',
  gray50: '#F9FAFB',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
  gray700: '#374151',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

import EmptyState from '../EmptyState';

describe('EmptyState snapshots', () => {
  it('renders default with title only', () => {
    const tree = render(<EmptyState title="Aucun evenement" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with title + description + custom icon', () => {
    const tree = render(
      <EmptyState
        icon="calendar-outline"
        title="Aucun evenement"
        description="Revenez plus tard pour decouvrir les nouveautes."
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with action button', () => {
    const tree = render(
      <EmptyState
        title="Aucun favori"
        description="Ajoutez des evenements a vos favoris"
        actionLabel="Decouvrir"
        onAction={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders withCard variant', () => {
    const tree = render(
      <EmptyState
        title="Boite vide"
        description="Aucun message"
        withCard
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
