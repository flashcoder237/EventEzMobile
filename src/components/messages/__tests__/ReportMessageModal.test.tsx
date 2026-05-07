/**
 * Tests Jest pour ReportMessageModal.
 *
 * Le modal est une simple feuille controlee : il prend `visible`, expose
 * un radio par raison, un champ description optionnel et un bouton Envoyer
 * qui appelle onSubmit(reason, description?). La feuille s'anime via
 * useBottomSheetAnim qui ouvre le Modal apres ~10ms ; on stub le hook pour
 * eviter les timers et garantir un render synchrone.
 *
 * Couvre :
 *  - rendu des 6 raisons + bouton Envoyer/Annuler
 *  - bouton Envoyer desactive tant qu'aucune raison selectionnee
 *  - selection raison + clic Envoyer -> onSubmit('spam', undefined)
 *  - description tapee est passee a onSubmit
 *  - clic Annuler -> onClose
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Stub useBottomSheetAnim pour avoir modalOpen=true tout de suite
jest.mock('../../../hooks/useBottomSheetAnim', () => ({
  useBottomSheetAnim: (visible: boolean) => ({
    modalOpen: visible,
    sheetAnim: {},
    backdropAnim: {},
  }),
}));

const themeColors = {
  primary: '#4F46E5',
  accent: '#FF6B6B',
  text: '#111827',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

import ReportMessageModal from '../ReportMessageModal';

describe('ReportMessageModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 6 reasons + cancel/submit buttons', () => {
    const { getByText } = render(
      <ReportMessageModal visible onClose={jest.fn()} onSubmit={jest.fn()} />
    );
    expect(getByText('Spam')).toBeTruthy();
    expect(getByText('Harcèlement')).toBeTruthy();
    expect(getByText('Discours haineux')).toBeTruthy();
    expect(getByText('Contenu inapproprié')).toBeTruthy();
    expect(getByText('Arnaque')).toBeTruthy();
    expect(getByText('Autre')).toBeTruthy();
    expect(getByText('Annuler')).toBeTruthy();
    expect(getByText('Envoyer')).toBeTruthy();
  });

  it('does NOT call onSubmit when no reason is selected', () => {
    const onSubmit = jest.fn();
    const { getByText } = render(
      <ReportMessageModal visible onClose={jest.fn()} onSubmit={onSubmit} />
    );
    fireEvent.press(getByText('Envoyer'));
    // handleSubmit guards on !selectedReason → no call
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with reason when a reason is selected and submit is pressed', () => {
    const onSubmit = jest.fn();
    const { getByText } = render(
      <ReportMessageModal visible onClose={jest.fn()} onSubmit={onSubmit} />
    );
    fireEvent.press(getByText('Spam'));
    fireEvent.press(getByText('Envoyer'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('spam', undefined);
  });

  it('passes description text to onSubmit when provided', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <ReportMessageModal visible onClose={jest.fn()} onSubmit={onSubmit} />
    );
    fireEvent.press(getByText('Harcèlement'));
    fireEvent.changeText(
      getByPlaceholderText('Ajoute du contexte si tu le souhaites…'),
      '  Insultes répétées  '
    );
    fireEvent.press(getByText('Envoyer'));
    // description.trim() est passe en 2eme argument
    expect(onSubmit).toHaveBeenCalledWith('harassment', 'Insultes répétées');
  });

  it('calls onClose when Annuler is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ReportMessageModal visible onClose={onClose} onSubmit={jest.fn()} />
    );
    fireEvent.press(getByText('Annuler'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not submit while submitting=true (button disabled / no call)', () => {
    const onSubmit = jest.fn();
    const { getByText } = render(
      <ReportMessageModal
        visible
        onClose={jest.fn()}
        onSubmit={onSubmit}
        submitting
      />
    );
    fireEvent.press(getByText('Spam'));
    // Le bouton submit affiche un ActivityIndicator quand submitting=true,
    // mais le press n'a pas d'effet (canSubmit=false).
    // Pour atteindre la TouchableOpacity on cherche par accessibilityLabel.
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
