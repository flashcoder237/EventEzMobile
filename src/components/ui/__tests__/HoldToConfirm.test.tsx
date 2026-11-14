/**
 * HoldToConfirm — garde-fou des actions irréversibles.
 *
 * Ce qui est vérifié ici est la MÉCANIQUE de confirmation, pas l'animation :
 * qu'un appui trop court ne confirme jamais, qu'un relâchement annule, et
 * qu'on ne confirme pas deux fois. Ce sont les propriétés dont dépend
 * l'annulation d'un événement (auto-remboursement + notification de tous les
 * inscrits).
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Les variables lues depuis une factory jest.mock doivent etre prefixees
// `mock` (garde de Jest contre les variables non initialisees).
let mockReduced = false;
jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReduced,
}));

const mockHaptics = { light: jest.fn(), success: jest.fn() };
jest.mock('../../../utils/haptics', () => ({
  __esModule: true,
  haptics: {
    light: () => mockHaptics.light(),
    success: () => mockHaptics.success(),
  },
  default: {
    light: () => mockHaptics.light(),
    success: () => mockHaptics.success(),
  },
}));

import HoldToConfirm, { HOLD_DURATION_MS } from '../HoldToConfirm';

describe('HoldToConfirm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReduced = false;
    mockHaptics.light.mockClear();
    mockHaptics.success.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setup = (props: Partial<React.ComponentProps<typeof HoldToConfirm>> = {}) => {
    const onConfirm = jest.fn();
    const utils = render(
      <HoldToConfirm
        testID="hold"
        onConfirm={onConfirm}
        label="Annuler l'événement"
        {...props}
      />,
    );
    return { onConfirm, button: utils.getByTestId('hold'), ...utils };
  };

  it('confirme quand le maintien atteint son terme', () => {
    const { onConfirm, button } = setup();

    fireEvent(button, 'pressIn');
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(HOLD_DURATION_MS); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('ne confirme PAS si le doigt est relâché avant la fin', () => {
    const { onConfirm, button } = setup();

    fireEvent(button, 'pressIn');
    act(() => { jest.advanceTimersByTime(HOLD_DURATION_MS - 200); });
    fireEvent(button, 'pressOut');

    act(() => { jest.advanceTimersByTime(2000); });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ne confirme pas deux fois si le maintien est rejoué aussitôt', () => {
    const { onConfirm, button } = setup();

    fireEvent(button, 'pressIn');
    act(() => { jest.advanceTimersByTime(HOLD_DURATION_MS); });
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Deuxième maintien complet : une nouvelle confirmation est légitime,
    // mais pas un doublon du premier déclenchement.
    act(() => { jest.advanceTimersByTime(1); });
    fireEvent(button, 'pressIn');
    act(() => { jest.advanceTimersByTime(HOLD_DURATION_MS); });
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('ne déclenche rien quand il est désactivé', () => {
    const { onConfirm, button } = setup({ disabled: true });

    fireEvent(button, 'pressIn');
    act(() => { jest.advanceTimersByTime(HOLD_DURATION_MS + 500); });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ne déclenche rien pendant le chargement (action en vol)', () => {
    const { onConfirm, button } = setup({ loading: true });

    fireEvent(button, 'pressIn');
    act(() => { jest.advanceTimersByTime(HOLD_DURATION_MS + 500); });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('conserve le maintien en mouvement réduit (garde-fou, pas décoration)', () => {
    mockReduced = true;
    const { onConfirm, button } = setup();

    fireEvent(button, 'pressIn');
    act(() => { jest.advanceTimersByTime(HOLD_DURATION_MS - 100); });
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(100); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("confirme via l'action d'accessibilité sans exiger de maintien", () => {
    const { onConfirm, button } = setup();

    fireEvent(button, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("n'appelle pas onConfirm après démontage", () => {
    const { onConfirm, button, unmount } = setup();

    fireEvent(button, 'pressIn');
    unmount();

    act(() => { jest.advanceTimersByTime(HOLD_DURATION_MS + 500); });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('joue une haptique au départ et au pic visuel, pas entre les deux', () => {
    const { button } = setup();

    fireEvent(button, 'pressIn');
    expect(mockHaptics.light).toHaveBeenCalledTimes(1);
    expect(mockHaptics.success).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(HOLD_DURATION_MS); });
    expect(mockHaptics.success).toHaveBeenCalledTimes(1);
    expect(mockHaptics.light).toHaveBeenCalledTimes(1);
  });

  it("affiche le libellé de maintien pendant l'appui", () => {
    const { button, getByText } = setup({ holdingLabel: 'Maintenez…' });

    expect(getByText("Annuler l'événement")).toBeTruthy();
    fireEvent(button, 'pressIn');
    expect(getByText('Maintenez…')).toBeTruthy();
  });
});
