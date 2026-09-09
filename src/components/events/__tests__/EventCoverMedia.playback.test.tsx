/**
 * Lecture vidéo de la cover d'événement : PLAY et PAUSE.
 *
 * CAS RÉEL SIGNALÉ : sur la fiche d'un événement, un bouton play lance la
 * vidéo… et il devient alors impossible de l'arrêter. Le bouton play
 * disparaissait à la lecture, et la barre de contrôles n'offrait que le son
 * et le plein écran.
 *
 * Cause : `setManualPlay(true)` existait, jamais `false`. Et le corriger ne
 * suffisait pas — quand l'autoplay est autorisé, `playing` reste vrai quel
 * que soit `manualPlay`. Il fallait un état de pause EXPLICITE.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.Image };
});

const mockPause = jest.fn().mockResolvedValue(undefined);
const mockPlay = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-av', () => {
  const RN = require('react-native');
  const React2 = require('react');
  return {
    Video: React2.forwardRef((props: any, ref: any) => {
      React2.useImperativeHandle(ref, () => ({
        playAsync: mockPlay,
        pauseAsync: mockPause,
        stopAsync: jest.fn().mockResolvedValue(undefined),
        unloadAsync: jest.fn().mockResolvedValue(undefined),
      }));
      return React2.createElement(RN.View, props);
    }),
    ResizeMode: { COVER: 'cover' },
    Audio: { setAudioModeAsync: jest.fn().mockResolvedValue(undefined) },
    InterruptionModeIOS: { DoNotMix: 1, MixWithOthers: 0 },
    InterruptionModeAndroid: { DoNotMix: 1, DuckOthers: 0 },
  };
});

jest.mock('react-native-webview', () => {
  const RN = require('react-native');
  return { WebView: RN.View };
});

jest.mock('../../../api/config', () => ({
  getMediaUrl: (u: any) => (u ? `https://cdn.example.com/${u}` : null),
}));

jest.mock('../EventImage', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

import EventCoverMedia from '../EventCoverMedia';

const event: any = {
  id: 'e1',
  title: 'Mon événement',
  cover_video: 'videos/cover.mp4',
  banner_image: null,
  category: {},
};

const PAUSE = 'Mettre la vidéo en pause';
const PLAY = 'Lire la vidéo avec le son';

beforeEach(() => {
  mockPause.mockClear();
  mockPlay.mockClear();
});

describe('lecture de la cover vidéo', () => {
  it('propose une PAUSE pendant la lecture', () => {
    const { queryByLabelText } = render(
      <EventCoverMedia event={event} mode="hero" showControls allowAutoplay />,
    );
    expect(queryByLabelText(PAUSE)).toBeTruthy();
  });

  it('met réellement la vidéo en pause au tap', () => {
    const { getByLabelText } = render(
      <EventCoverMedia event={event} mode="hero" showControls allowAutoplay />,
    );

    fireEvent.press(getByLabelText(PAUSE));

    // Le player doit avoir reçu l'ordre de pause.
    expect(mockPause).toHaveBeenCalled();
  });

  it('la pause tient MÊME quand l autoplay est autorisé', () => {
    // C'est le piège : `manualPlay=false` seul ne suffisait pas, `playing`
    // restait vrai via `allowAutoplay`.
    const { getByLabelText, queryByLabelText } = render(
      <EventCoverMedia event={event} mode="hero" showControls allowAutoplay />,
    );

    fireEvent.press(getByLabelText(PAUSE));

    // La barre de contrôles disparaît, le bouton play réapparaît.
    expect(queryByLabelText(PAUSE)).toBeNull();
    expect(queryByLabelText(PLAY)).toBeTruthy();
  });

  it('permet de REPRENDRE après une pause', () => {
    const { getByLabelText, queryByLabelText } = render(
      <EventCoverMedia event={event} mode="hero" showControls allowAutoplay />,
    );

    fireEvent.press(getByLabelText(PAUSE));
    fireEvent.press(getByLabelText(PLAY));

    expect(queryByLabelText(PAUSE)).toBeTruthy();
    expect(mockPlay).toHaveBeenCalled();
  });

  it('affiche le bouton play quand l autoplay est refusé', () => {
    // Réseau économe / animations réduites : pas d'autoplay, on attend un tap.
    const { queryByLabelText } = render(
      <EventCoverMedia event={event} mode="hero" showControls allowAutoplay={false} />,
    );
    expect(queryByLabelText(PLAY)).toBeTruthy();
    expect(queryByLabelText(PAUSE)).toBeNull();
  });
});
