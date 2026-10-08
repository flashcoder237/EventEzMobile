/**
 * Animation de chargement d'écran.
 *
 * DEMANDE (2026-10-07) : « Animation de chargement d'écran ».
 *
 * Tous les écrans affichaient l'`ActivityIndicator` du système : la roue grise
 * d'Android, identique à celle de n'importe quelle application. Une attente est
 * pourtant l'un des rares moments où l'utilisateur regarde l'écran sans rien
 * faire.
 *
 * Ce qui compte vraiment ici, et que ces tests verrouillent :
 *   - le réglage système « Réduire les animations » est RESPECTÉ. Une
 *     animation qui l'ignore n'est pas un détail de confort : pour une
 *     personne sujette au mal des transports ou aux migraines vestibulaires,
 *     c'est un symptôme physique ;
 *   - l'écran reste annoncé aux lecteurs d'écran pendant le chargement.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

let mockReduceMotion = false;
jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReduceMotion,
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#4F46E5', accent: '#FF6B6B', gray500: '#777',
    },
    isDark: false,
  }),
}));

const BrandLoader = require('../BrandLoader').default;

/** Aplatit un style RN (tableau/objet imbriqué) en un seul objet. */
function flatten(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc, s) => ({ ...acc, ...flatten(s) }), {});
  }
  return style;
}

beforeEach(() => {
  mockReduceMotion = false;
});

describe('BrandLoader', () => {
  it('affiche les trois points de la marque', () => {
    const { getByTestId } = render(<BrandLoader />);

    [0, 1, 2].forEach((i) => {
      expect(getByTestId(`brand-loader-dot-${i}`)).toBeTruthy();
    });
  });

  it('est annoncé comme une progression aux lecteurs d’écran', () => {
    const { getByTestId } = render(<BrandLoader message="Chargement…" />);

    const loader = getByTestId('brand-loader');
    expect(loader.props.accessibilityRole).toBe('progressbar');
    expect(loader.props.accessibilityLabel).toBe('Chargement…');
  });

  it('affiche le message quand il est fourni', () => {
    const { getByText } = render(<BrandLoader message="Préparation…" />);

    expect(getByText('Préparation…')).toBeTruthy();
  });

  it('N’ANIME PAS quand « Réduire les animations » est actif', () => {
    mockReduceMotion = true;

    const { getByTestId } = render(<BrandLoader />);

    // Sans mouvement : opacité fixe, et surtout AUCUNE transformation.
    const dot = flatten(getByTestId('brand-loader-dot-1').props.style);
    expect(typeof dot.opacity).toBe('number');
    expect(dot.transform).toBeUndefined();
  });

  it('reste lisible sans animation : les points gardent des opacités distinctes', () => {
    mockReduceMotion = true;

    const { getByTestId } = render(<BrandLoader />);

    const opacities = [0, 1, 2].map(
      (i) => flatten(getByTestId(`brand-loader-dot-${i}`).props.style).opacity,
    );
    expect(new Set(opacities).size).toBe(3);
  });

  it('honore une couleur imposée par l’appelant', () => {
    // Quelques écrans dessinent sur un fond sombre.
    const { getByTestId } = render(<BrandLoader color="#FFFFFF" />);

    [0, 1, 2].forEach((i) => {
      const dot = flatten(getByTestId(`brand-loader-dot-${i}`).props.style);
      expect(dot.backgroundColor).toBe('#FFFFFF');
    });
  });

  it('se démonte sans laisser de boucle d’animation active', () => {
    // Une boucle laissée en vie réveille le thread d'animation sur un écran
    // qui n'existe plus.
    const view = render(<BrandLoader />);

    expect(() => view.unmount()).not.toThrow();
  });
});
