/**
 * Snapshot tests pour MenuItem.
 *
 * Couvre : default, avec subtitle, avec stat, avec badge, avec alert,
 * danger, loading, isLast.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const lightColors = {
  primary: '#4F46E5',
  surface: '#FFFFFF',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

import MenuItem from '../MenuItem';

describe('MenuItem snapshots', () => {
  it('renders title only', () => {
    const tree = render(
      <MenuItem icon="settings-outline" title="Parametres" onPress={() => {}} />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with subtitle', () => {
    const tree = render(
      <MenuItem
        icon="person-outline"
        title="Mon compte"
        subtitle="Gerer mes infos personnelles"
        onPress={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with stat inline', () => {
    const tree = render(
      <MenuItem
        icon="ticket-outline"
        title="Mes billets"
        stat="3 actifs"
        onPress={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with badge', () => {
    const tree = render(
      <MenuItem
        icon="notifications-outline"
        title="Notifications"
        badge={5}
        onPress={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with badge >99', () => {
    const tree = render(
      <MenuItem
        icon="mail-outline"
        title="Messages"
        badge={150}
        onPress={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with critical alert', () => {
    const tree = render(
      <MenuItem
        icon="shield-outline"
        title="Verification"
        alert={{ type: 'critical', label: 'Action requise' }}
        onPress={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders danger variant + isLast', () => {
    const tree = render(
      <MenuItem
        icon="log-out-outline"
        title="Deconnexion"
        danger
        isLast
        showArrow={false}
        onPress={() => {}}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders loading state', () => {
    const tree = render(
      <MenuItem icon="sync-outline" title="Synchronisation" loading />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
