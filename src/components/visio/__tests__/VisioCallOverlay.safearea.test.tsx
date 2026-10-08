/**
 * La WebView de la visio doit commencer SOUS la barre d'état.
 *
 * BUG CORRIGÉ (2026-10-07), signalé par un testeur capture à l'appui :
 * « la webview de la visio ne gère pas de safearea. Regarde comment le contenu
 * est superposé avec l'entête android ».
 *
 * POURQUOI : le conteneur plein écran est en `absoluteFillObject` — c'est
 * VOULU, pour que le fond noir couvre tout l'écran. Mais Jitsi dessine sa
 * propre interface (logo, nom de la réunion, bouton raccrocher) tout en haut
 * de sa page. Ces éléments passaient donc sous l'heure et les icônes réseau
 * d'Android : illisibles, et en partie intouchables.
 *
 * On décale donc la WebView des encoches, sans toucher au fond.
 *
 * En mode BULLE, aucun décalage : la bulle flotte au milieu de l'écran, elle
 * n'a aucun bord système à éviter. Un `marginTop` y créerait une bande noire
 * disgracieuse à l'intérieur de la bulle.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const INSET_TOP = 24;

const baseCall = {
  url: 'https://meet.example.com/room',
  roomId: 'r1',
  title: 'Ma visio',
  recordingNotice: '',
  // Le mode bulle se lit sur `call.mode`, pas sur un booleen `minimized`.
  mode: 'fullscreen',
};

let mockCall: any = baseCall;

jest.mock('../../../contexts/VisioCallContext', () => ({
  useVisioCall: () => ({
    call: mockCall,
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
  useSafeAreaInsets: () => ({ top: INSET_TOP, bottom: 12, left: 0, right: 0 }),
}));

jest.mock('../../../hooks/useVisioHush', () => ({
  useVisioHush: () => ({ onMessage: jest.fn(), sensorElement: null }),
}));

const VisioCallOverlay = require('../VisioCallOverlay').default;

/** Aplatit un style RN (tableau/objet imbriqué) en un seul objet. */
function flatten(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc, s) => ({ ...acc, ...flatten(s) }), {});
  }
  return style;
}

/** Retrouve la View qui enveloppe la WebView via son `pointerEvents`. */
function findWebViewWrap(root: any) {
  return root.UNSAFE_queryAllByProps({ pointerEvents: 'auto' })[0];
}

describe('safe area de la visio', () => {
  it("décale la WebView sous la barre d'état en plein écran", () => {
    mockCall = { ...baseCall, mode: 'fullscreen' };

    const root = render(<VisioCallOverlay />);
    const wrap = findWebViewWrap(root);

    expect(wrap).toBeTruthy();
    expect(flatten(wrap.props.style).marginTop).toBe(INSET_TOP);
  });

  it('ne décale PAS en mode bulle', () => {
    mockCall = { ...baseCall, mode: 'bubble' };

    const root = render(<VisioCallOverlay />);
    // En bulle, le wrap a pointerEvents='none'.
    const wrap = root.UNSAFE_queryAllByProps({ pointerEvents: 'none' })[0];

    expect(wrap).toBeTruthy();
    expect(flatten(wrap.props.style).marginTop).toBeUndefined();
  });
});
