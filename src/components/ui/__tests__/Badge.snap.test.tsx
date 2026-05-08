/**
 * Snapshot tests pour Badge.
 *
 * Couvre les 7 variants (default, secondary, destructive, outline,
 * success, warning, info) + les 2 tailles (sm, md).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const lightColors = {
  primary: '#4F46E5',
  primaryBg: '#EEF2FF',
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
  border: '#E5E7EB',
  gray100: '#F3F4F6',
  gray700: '#374151',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

import Badge from '../Badge';

describe('Badge snapshots', () => {
  it('renders default variant md', () => {
    const tree = render(<Badge label="Default" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders secondary variant', () => {
    const tree = render(<Badge label="Secondary" variant="secondary" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders destructive variant', () => {
    const tree = render(<Badge label="Erreur" variant="destructive" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders outline variant', () => {
    const tree = render(<Badge label="Outline" variant="outline" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders success variant', () => {
    const tree = render(<Badge label="Valide" variant="success" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders warning variant', () => {
    const tree = render(<Badge label="Attention" variant="warning" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders info variant', () => {
    const tree = render(<Badge label="Info" variant="info" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders small size', () => {
    const tree = render(<Badge label="Small" variant="success" size="sm" />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
