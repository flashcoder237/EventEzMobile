/**
 * Snapshot tests pour Input.
 *
 * Couvre : default, avec icon, avec label/hint/error/success,
 * disabled, secureTextEntry, variant=title.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const lightColors = {
  primary: '#4F46E5',
  card: '#FFFFFF',
  text: '#111827',
  textTertiary: '#6B7280',
  error: '#EF4444',
  success: '#10B981',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

import Input from '../Input';

describe('Input snapshots', () => {
  it('renders default with placeholder', () => {
    const tree = render(<Input placeholder="Email" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with label + icon + hint', () => {
    const tree = render(
      <Input label="Email" icon="mail-outline" hint="Votre email professionnel" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with error state', () => {
    const tree = render(
      <Input label="Mot de passe" error="Mot de passe trop court" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with success state', () => {
    const tree = render(
      <Input label="Email" success="Email valide" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders disabled', () => {
    const tree = render(
      <Input label="Lecture seule" value="abc@test.com" disabled />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders secureTextEntry (password)', () => {
    const tree = render(
      <Input label="Mot de passe" placeholder="••••••" secureTextEntry />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders title variant with labelTrailing', () => {
    const tree = render(
      <Input
        label="Titre"
        labelTrailing="0/100"
        variant="title"
        placeholder="Titre de l'evenement"
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
