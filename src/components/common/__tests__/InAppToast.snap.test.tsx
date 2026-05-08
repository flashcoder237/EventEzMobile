/**
 * Snapshot tests pour InAppToast.
 *
 * Couvre les 5 types d'icone (message/notification/success/warning/info)
 * + variante avec avatar.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const lightColors = {
  card: '#FFFFFF',
  text: '#111827',
  border: '#E5E7EB',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.Image };
});

// GestureDetector -> pass-through (sinon depend de gesture-handler)
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: () => ({
        onUpdate: () => ({
          onEnd: () => ({}),
        }),
      }),
    },
  };
});

import { InAppToast } from '../InAppToast';

const noop = () => {};

describe('InAppToast snapshots', () => {
  it('renders message icon (default chat type)', () => {
    const tree = render(
      <InAppToast id="1" title="Alice" body="Salut !" icon="message" onDismiss={noop} />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders notification icon', () => {
    const tree = render(
      <InAppToast
        id="2"
        title="Nouvelle notification"
        body="Vous avez recu un message"
        icon="notification"
        onDismiss={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders success icon', () => {
    const tree = render(
      <InAppToast
        id="3"
        title="Paiement reussi"
        icon="success"
        onDismiss={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders warning icon', () => {
    const tree = render(
      <InAppToast
        id="4"
        title="Attention"
        body="Connexion instable"
        icon="warning"
        onDismiss={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders info icon', () => {
    const tree = render(
      <InAppToast id="5" title="Info" icon="info" onDismiss={noop} />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with avatar (overrides icon)', () => {
    const tree = render(
      <InAppToast
        id="6"
        title="Bob"
        body="Tu peux verifier ?"
        avatarUrl="https://test.local/avatar.jpg"
        onDismiss={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders without body (title only)', () => {
    const tree = render(
      <InAppToast id="7" title="Connecte" icon="success" onDismiss={noop} />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
