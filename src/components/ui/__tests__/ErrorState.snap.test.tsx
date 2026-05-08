/**
 * Snapshot tests pour ErrorState.
 *
 * Couvre : default, avec retry, withCard, sans retry.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const lightColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  surface: '#FFFFFF',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  gray200: '#E5E7EB',
  gray600: '#4B5563',
  gray900: '#111827',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

import ErrorState from '../ErrorState';

describe('ErrorState snapshots', () => {
  it('renders default (no retry callback)', () => {
    const tree = render(<ErrorState />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with custom title + message', () => {
    const tree = render(
      <ErrorState
        title="Connexion impossible"
        message="Verifiez votre connexion internet."
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with retry button', () => {
    const tree = render(
      <ErrorState
        title="Erreur reseau"
        message="Impossible de charger les donnees."
        onRetry={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders withCard variant + retry hidden', () => {
    const tree = render(
      <ErrorState
        title="Acces refuse"
        message="Vous n'avez pas la permission."
        withCard
        showRetry={false}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
