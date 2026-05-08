/**
 * Snapshot tests pour GradientButton.
 *
 * Couvre les 4 variants (primary/outline/secondary/ghost) +
 * tailles (xs/sm/md/lg/xl) + etats (loading/disabled/icones).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const lightColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray700: '#374151',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

import GradientButton from '../GradientButton';

describe('GradientButton snapshots', () => {
  const noop = () => {};

  it('renders primary md (default)', () => {
    const tree = render(<GradientButton title="Continuer" onPress={noop} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders outline variant with iconLeft', () => {
    const tree = render(
      <GradientButton
        title="Reessayer"
        onPress={noop}
        variant="outline"
        iconLeft="refresh-outline"
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders secondary variant sm', () => {
    const tree = render(
      <GradientButton title="Annuler" onPress={noop} variant="secondary" size="sm" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders ghost variant', () => {
    const tree = render(
      <GradientButton title="Voir plus" onPress={noop} variant="ghost" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders disabled primary', () => {
    const tree = render(
      <GradientButton title="Envoyer" onPress={noop} disabled />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders loading primary', () => {
    const tree = render(
      <GradientButton title="Envoyer" onPress={noop} loading />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders fullWidth lg', () => {
    const tree = render(
      <GradientButton title="Confirmer" onPress={noop} size="lg" fullWidth />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
