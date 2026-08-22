/**
 * CustomAlert — gravite variable et reactivite des boutons.
 *
 * Deux regressions couvertes ici :
 *  1. Le callback d'un bouton etait differe de 340 ms (`setTimeout(onPress,
 *     EXIT_DELAY + 50)`) : sur un flux de paiement, taper « Confirmer » ne
 *     produisait rien pendant un tiers de seconde.
 *  2. Le tap sur le fond appelait `onClose()` nu, sautant silencieusement le
 *     `onPress` du bouton d'annulation (donc tout nettoyage associe).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#FFF', text: '#111', border: '#E5E7EB', primary: '#4F46E5',
      primaryDark: '#4338CA', success: '#10B981', successDark: '#059669',
      error: '#EF4444', warning: '#F59E0B', warningDark: '#D97706',
      gray100: '#F3F4F6', gray200: '#E5E7EB', gray300: '#D1D5DB',
      gray500: '#6B7280', gray700: '#374151',
    },
    isDark: false,
  }),
}));
jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

import CustomAlert from '../CustomAlert';

describe('CustomAlert — reactivite des boutons', () => {
  it('invoque le callback SYNCHRONEMENT (pas de delai de sortie)', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CustomAlert
        visible
        title="Confirmer le paiement"
        buttons={[{ text: 'Payer', onPress }]}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Payer'));
    // Aucun timer avance : le callback doit deja avoir couru.
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("route le tap sur le fond vers le bouton d'annulation", () => {
    const onCancel = jest.fn();
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <CustomAlert
        visible
        type="warning"
        title="Quitter ?"
        message="Les modifications seront perdues."
        buttons={[{ text: 'Rester' }, { text: 'Quitter', style: 'cancel', onPress: onCancel }]}
        onClose={onClose}
      />,
    );
    const { TouchableWithoutFeedback } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(TouchableWithoutFeedback)[0]);
    expect(onClose).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('CustomAlert — gravite', () => {
  const renderWith = (props: any) =>
    render(<CustomAlert visible title="Titre" onClose={jest.fn()} {...props} />);

  it("n'affiche pas d'eyebrow qui ne fait que repeter le titre", () => {
    // Cas des ~217 appels titres « Erreur » / « Succes » : l'eyebrow generique
    // encodait la gravite une 3e fois sans rien apporter.
    const { queryAllByText } = renderWith({ type: 'error', title: 'Erreur' });
    expect(queryAllByText(/^Erreur$/i)).toHaveLength(1);
  });

  it('affiche un eyebrow de DOMAINE quand il apporte du contexte', () => {
    const { getByText } = renderWith({ type: 'error', domain: 'Paiement' });
    expect(getByText('PAIEMENT')).toBeTruthy();
  });

  // Le watermark est masque aux lecteurs d'ecran (decoratif) : il n'apparait
  // donc pas dans les requetes texte. On inspecte l'arbre rendu.
  const treeText = (r: any) => JSON.stringify(r.toJSON());

  it('ne rend pas le watermark hors du poids critique', () => {
    expect(treeText(renderWith({ type: 'success', weight: 'compact' }))).not.toContain('OK!');
  });

  it('rend le watermark en poids critique', () => {
    expect(treeText(renderWith({ type: 'error', weight: 'critical' }))).toContain('OOPS');
  });

  it('assombrit davantage le fond a mesure que la gravite monte', () => {
    // L'opacite du backdrop EST le signal de gravite : elle se ressent avant
    // meme d'avoir lu un mot.
    expect(treeText(renderWith({ type: 'success', weight: 'compact' }))).toContain('rgba(0,0,0,0.35)');
    expect(treeText(renderWith({ type: 'error', weight: 'critical' }))).toContain('rgba(0,0,0,0.62)');
  });
});
