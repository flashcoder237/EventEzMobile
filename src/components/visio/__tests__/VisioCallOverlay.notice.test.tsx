/**
 * Mention d'enregistrement : TEMPORAIRE, pas permanente.
 *
 * CAS RÉEL : à l'ouverture de la visio, le bandeau « Cette session est
 * enregistrée… » restait affiché en permanence par-dessus l'interface Jitsi
 * (nom de salle, vignette caméra, nom du participant). Tout le haut de
 * l'écran devenait illisible — le bandeau lui-même compris.
 *
 * C'est une information de CONSENTEMENT : elle doit être vue À L'ENTRÉE,
 * puis s'effacer. Elle reparaît à chaque nouvelle entrée en salle.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';

const call = {
  url: 'https://meet.example.com/room#config.prejoinPageEnabled=false',
  roomId: 'r1',
  title: 'Ma visio',
  recordingNotice: 'Cette session est enregistrée. En rejoignant, vous êtes informé(e)…',
  minimized: false,
};

let mockCall: any = call;

jest.mock('../../../contexts/VisioCallContext', () => ({
  useVisioCall: () => ({
    call: mockCall,
    endCall: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { primary: '#4F46E5', background: '#fff', text: '#111' }, isDark: false }),
}));

jest.mock('react-native-webview', () => {
  const RN = require('react-native');
  return { WebView: RN.View };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../../modules/eventez-pip/src', () => ({
  enterPip: jest.fn(),
  isPipSupported: () => false,
}));

import VisioCallOverlay from '../VisioCallOverlay';

const NOTICE = 'Cette session est enregistrée';

beforeEach(() => {
  jest.useFakeTimers();
  mockCall = { ...call };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('mention d enregistrement', () => {
  it('est affichée à l entrée en salle', () => {
    const { queryByText } = render(<VisioCallOverlay />);
    expect(queryByText(new RegExp(NOTICE))).toBeTruthy();
  });

  it('disparaît après quelques secondes', () => {
    const { queryByText } = render(<VisioCallOverlay />);
    expect(queryByText(new RegExp(NOTICE))).toBeTruthy();

    // Durée d'affichage + fondu de sortie.
    act(() => { jest.advanceTimersByTime(7000 + 500); });

    expect(queryByText(new RegExp(NOTICE))).toBeNull();
  });

  it('reste visible pendant toute la durée prévue', () => {
    const { queryByText } = render(<VisioCallOverlay />);
    // Juste avant l'échéance : encore là, le participant doit pouvoir lire.
    act(() => { jest.advanceTimersByTime(6500); });
    expect(queryByText(new RegExp(NOTICE))).toBeTruthy();
  });

  it('n affiche rien quand la session n est PAS enregistrée', () => {
    mockCall = { ...call, recordingNotice: null };
    const { queryByText } = render(<VisioCallOverlay />);
    expect(queryByText(new RegExp(NOTICE))).toBeNull();
  });

  it('reparaît à une NOUVELLE entrée en salle', () => {
    const { queryByText, rerender } = render(<VisioCallOverlay />);
    act(() => { jest.advanceTimersByTime(7000 + 500); });
    expect(queryByText(new RegExp(NOTICE))).toBeNull();

    // Nouvelle salle → nouvelle URL → le consentement doit être re-présenté.
    mockCall = { ...call, url: 'https://meet.example.com/autre-salle' };
    rerender(<VisioCallOverlay />);

    expect(queryByText(new RegExp(NOTICE))).toBeTruthy();
  });
});
