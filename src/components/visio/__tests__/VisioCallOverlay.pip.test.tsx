/**
 * Picture-in-Picture : l'interface de l'app doit disparaître en vignette.
 *
 * DEMANDE (2026-10-07) : « Mets les vrais experts techniques sur l'utilisation
 * du picture-in-picture, recherche même les bonnes documentations en ligne car
 * là c'est trop mal géré ».
 *
 * LE POINT CLÉ, confirmé par la documentation Android : le PiP ne « extrait »
 * pas la vidéo, il réduit TOUTE la fenêtre de l'activité. Notre en-tête
 * (titre, réduire, raccrocher) et le bandeau d'enregistrement se retrouvaient
 * donc dans une vignette d'environ 200 dp, où ils couvraient la vidéo — et
 * étaient de toute façon intouchables, le système ne transmettant pas les
 * évènements tactiles à une fenêtre PiP.
 *
 *   « Remove other UI elements before your activity enters PiP and restore
 *     them when your activity becomes full screen again. »
 *   https://developer.android.com/develop/ui/views/picture-in-picture
 *
 * SECOND POINT, invisible à l'œil nu : le PiP était déclenché depuis
 * `AppState === 'background'`, qui n'arrive qu'APRÈS que l'activité a cessé
 * d'être visible. Android refuse alors la demande :
 *
 *   « The system may disallow entering picture-in-picture in various cases,
 *     including when the activity is not visible [...] »
 *
 * On arme désormais le PiP pour toute la durée de l'appel ; l'entrée est
 * déclenchée côté natif depuis `onUserLeaveHint`, pendant que l'activité est
 * encore visible.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';

const mockSetAutoEnter = jest.fn();
let mockPipListener: ((inPip: boolean) => void) | null = null;
let mockCurrentPipMode = false;

jest.mock('../../../../modules/eventez-pip/src', () => ({
  enterPip: jest.fn(),
  isPipSupported: () => true,
  setPipAutoEnter: (v: boolean) => mockSetAutoEnter(v),
  isInPipMode: () => mockCurrentPipMode,
  addPipModeListener: (cb: (inPip: boolean) => void) => {
    mockPipListener = cb;
    return { remove: () => { mockPipListener = null; } };
  },
}));

const call = {
  url: 'https://meet.example.com/room',
  roomId: 'r1',
  title: 'Ma visio',
  recordingNotice: '',
  mode: 'fullscreen',
};

jest.mock('../../../contexts/VisioCallContext', () => ({
  useVisioCall: () => ({
    call,
    endCall: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { primary: '#4F46E5', background: '#fff', text: '#111' },
    isDark: false,
  }),
}));

jest.mock('react-native-webview', () => {
  const RN = require('react-native');
  return { WebView: RN.View };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 12, left: 0, right: 0 }),
}));

jest.mock('../../../hooks/useVisioHush', () => ({
  useVisioHush: () => ({ onMessage: jest.fn(), sensorElement: null }),
}));

const VisioCallOverlay = require('../VisioCallOverlay').default;

beforeEach(() => {
  mockSetAutoEnter.mockClear();
  mockPipListener = null;
  mockCurrentPipMode = false;
});

describe('Picture-in-Picture', () => {
  it("arme le PiP dès le DÉBUT de l'appel, pas au moment de quitter", () => {
    render(<VisioCallOverlay />);

    // LE bug : on attendait `AppState === 'background'`, trop tard pour
    // qu'Android accepte la demande.
    expect(mockSetAutoEnter).toHaveBeenCalledWith(true);
  });

  it('désarme le PiP quand la visio se termine', () => {
    const view = render(<VisioCallOverlay />);
    mockSetAutoEnter.mockClear();

    view.unmount();

    expect(mockSetAutoEnter).toHaveBeenCalledWith(false);
  });

  /** Compte les boutons de contrôle rendus par l'overlay. */
  const controlCount = (view: any) =>
    view.UNSAFE_queryAllByProps({ accessibilityRole: 'button' }).length;

  it("affiche les contrôles tant qu'on n'est PAS en vignette", () => {
    const view = render(<VisioCallOverlay />);

    expect(controlCount(view)).toBeGreaterThan(0);
  });

  it('MASQUE les contrôles en fenêtre PiP', () => {
    const view = render(<VisioCallOverlay />);
    expect(controlCount(view)).toBeGreaterThan(0);

    act(() => { mockPipListener?.(true); });

    // Dans une vignette, ces boutons couvriraient la vidéo et seraient
    // intouchables.
    expect(controlCount(view)).toBe(0);
  });

  it('restaure les contrôles au retour en plein écran', () => {
    const view = render(<VisioCallOverlay />);

    act(() => { mockPipListener?.(true); });
    act(() => { mockPipListener?.(false); });

    expect(controlCount(view)).toBeGreaterThan(0);
  });
});
