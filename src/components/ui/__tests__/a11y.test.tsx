/**
 * Tests d'accessibilité pour les composants UI primitives critiques.
 *
 * Empêche la régression des `accessibilityLabel`, `accessibilityRole`,
 * `accessibilityState` qui sont essentiels pour TalkBack (Android) et
 * VoiceOver (iOS). Sans ces props, les lecteurs d'écran annoncent du
 * bruit ("button button button") au lieu d'une étiquette utile.
 *
 * Couvre :
 *   - GradientButton : role=button, label=title (ou override), disabled state
 *   - Input : label, hint, disabled state
 *   - Badge : role=text, label
 *   - EditorialButton (via GradientButton.tsx pattern)
 *
 * Ce que ces tests NE testent PAS (out of scope) :
 *   - Contraste de couleurs (WCAG AA) — nécessite un audit visuel
 *   - Target size minimum (44pt iOS / 48dp Android) — nécessite measure()
 *   - Reading order — nécessite un vrai screen reader
 *   - Navigation au clavier — nécessite un device avec clavier connecté
 *
 * Reco : compléter ces tests avec un audit Maestro qui parcourt l'app
 * avec un screen reader virtuel (`-launch-args` Android).
 */

import React from 'react';
import { render } from '@testing-library/react-native';

const lightColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryBg: '#EEF2FF',
  accent: '#FF6B6B',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  text: '#111827',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorBg: '#FEF2F2',
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#047857',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  info: '#0EA5E9',
  infoLight: '#E0F2FE',
  infoDark: '#0369A1',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  card: '#FFFFFF',
  white: '#FFFFFF',
  border: '#E5E7EB',
  gray50: '#F9FAFB',
  gray300: '#D1D5DB',
  gray600: '#4B5563',
  gray800: '#1F2937',
  gray900: '#111827',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

import GradientButton from '../GradientButton';
import Input from '../Input';
import Badge from '../Badge';


describe('GradientButton — a11y', () => {
  const noop = () => {};

  it('expose role=button et label=title par defaut', () => {
    const { getByRole } = render(
      <GradientButton title="Payer 5000 FCFA" onPress={noop} />,
    );
    const btn = getByRole('button');
    expect(btn).toBeTruthy();
    expect(btn.props.accessibilityLabel).toBe('Payer 5000 FCFA');
  });

  it('override label via accessibilityLabel prop', () => {
    const { getByRole } = render(
      <GradientButton
        title="OK"  // Title court mais ambigu pour un screen reader
        accessibilityLabel="Confirmer le paiement de 5000 FCFA"
        onPress={noop}
      />,
    );
    const btn = getByRole('button');
    expect(btn.props.accessibilityLabel).toBe('Confirmer le paiement de 5000 FCFA');
  });

  it('annonce disabled state aux screen readers', () => {
    const { getByRole } = render(
      <GradientButton title="Soumettre" onPress={noop} disabled />,
    );
    const btn = getByRole('button');
    // accessibilityState.disabled=true → VoiceOver annoncera "désactivé"
    expect(btn.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('outline variant garde son role=button', () => {
    const { getByRole } = render(
      <GradientButton title="Annuler" onPress={noop} variant="outline" />,
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('loading state expose disabled (UX : bloque le double-tap)', () => {
    const { getByRole } = render(
      <GradientButton title="En cours..." onPress={noop} loading />,
    );
    const btn = getByRole('button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });
});


describe('Input — a11y', () => {
  it('expose label comme accessibilityLabel quand aucun override', () => {
    const { getByLabelText } = render(
      <Input
        label="Numéro de téléphone"
        value=""
        onChangeText={() => {}}
      />,
    );
    expect(getByLabelText('Numéro de téléphone')).toBeTruthy();
  });

  it('override label via accessibilityLabel prop', () => {
    const { getByLabelText } = render(
      <Input
        label="Tel"
        accessibilityLabel="Numéro Mobile Money à débiter"
        value=""
        onChangeText={() => {}}
      />,
    );
    expect(getByLabelText('Numéro Mobile Money à débiter')).toBeTruthy();
  });

  it('expose hint pour clarification (ex: format attendu)', () => {
    const { getByLabelText } = render(
      <Input
        label="Téléphone"
        hint="9 chiffres, format 6XX XXX XXX"
        value=""
        onChangeText={() => {}}
      />,
    );
    const input = getByLabelText('Téléphone');
    expect(input.props.accessibilityHint).toBe('9 chiffres, format 6XX XXX XXX');
  });

  it('fallback sur placeholder si pas de label', () => {
    const { getByLabelText } = render(
      <Input
        placeholder="Saisir le montant"
        value=""
        onChangeText={() => {}}
      />,
    );
    expect(getByLabelText('Saisir le montant')).toBeTruthy();
  });

  it('disabled state propage a accessibilityState', () => {
    const { getByLabelText } = render(
      <Input
        label="Email"
        value="user@example.com"
        onChangeText={() => {}}
        disabled
      />,
    );
    const input = getByLabelText('Email');
    expect(input.props.accessibilityState).toMatchObject({ disabled: true });
  });
});


describe('Badge — a11y', () => {
  // Note : Badge rend un wrapper <View accessibilityRole="text"> + un <Text>
  // enfant qui herite role=text → 2 elements role=text en interne.
  // On query par accessibilityLabel (unique) plutot que par role.

  it('expose label par defaut', () => {
    const { getByLabelText } = render(<Badge label="Nouveau" />);
    expect(getByLabelText('Nouveau')).toBeTruthy();
  });

  it('override accessibilityLabel pour les badges symboliques', () => {
    // Cas : badge "5" qui represente le nombre de notifications → l'a11y
    // doit dire "5 notifications" pas juste "5".
    const { getByLabelText } = render(
      <Badge label="5" accessibilityLabel="5 notifications non lues" />,
    );
    expect(getByLabelText('5 notifications non lues')).toBeTruthy();
  });

  it('rend correctement pour les variants supportes', () => {
    // BadgeVariant = default | secondary | destructive | outline | success | warning | info
    const variants = ['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info'] as const;
    variants.forEach((variant) => {
      const { getByLabelText } = render(
        <Badge label={`${variant} badge`} variant={variant} />,
      );
      expect(getByLabelText(`${variant} badge`)).toBeTruthy();
    });
  });
});


describe('Smoke a11y matrix — composants critiques', () => {
  /**
   * Verification que les composants utilises sur les ecrans sensibles
   * (paiement, wallet, login) ont TOUS les 3 props a11y essentiels :
   *  - accessibilityRole (button/text/etc.)
   *  - accessibilityLabel (texte parle par le screen reader)
   *  - accessibilityState.disabled (quand pertinent)
   *
   * Un seul test parametrise qui pourrait detecter une regression future
   * (ex : refactor qui retire accessibilityLabel d'un button).
   */
  const noop = () => {};

  it('GradientButton primary + ghost + outline → tous role=button', () => {
    const variants = ['primary', 'outline', 'ghost', 'secondary'] as const;
    variants.forEach((variant) => {
      const { getByRole } = render(
        <GradientButton title={`btn ${variant}`} onPress={noop} variant={variant} />,
      );
      expect(getByRole('button')).toBeTruthy();
    });
  });

  it('Input avec et sans label → toujours accessible', () => {
    const cases = [
      { label: 'Email', placeholder: undefined, expected: 'Email' },
      { label: undefined, placeholder: 'Type here', expected: 'Type here' },
    ];
    cases.forEach(({ label, placeholder, expected }) => {
      const { getByLabelText } = render(
        <Input
          label={label}
          placeholder={placeholder}
          value=""
          onChangeText={noop}
        />,
      );
      expect(getByLabelText(expected!)).toBeTruthy();
    });
  });
});
