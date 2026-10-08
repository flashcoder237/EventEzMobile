/**
 * La carte doit répondre AU TAP, pas à la fin d'un appel réseau.
 *
 * BUG CORRIGÉ (2026-10-07), signalé par un testeur : « la carte de sélection
 * d'emplacement est très lente », « la carte est même visible que parfois ».
 *
 * Deux causes distinctes :
 *
 * 1. MONTAGE PERMANENT — la carte était montée à toutes les étapes du
 *    formulaire de création. Ni elle ni l'écran n'étant mémoïsés, chaque
 *    frappe au clavier re-rendait l'arbre contenant la vue native Google Maps.
 *    (Corrigé dans EventCreateScreen : montage conditionnel.)
 *
 * 2. GÉOCODAGE BLOQUANT — chaque tap attendait Nominatim (limité à 1 appel par
 *    seconde, plusieurs secondes de latence) avant de mettre quoi que ce soit
 *    à jour. L'interface paraissait figée après chaque tap, et trois taps
 *    rapides lançaient trois requêtes concurrentes dont la première revenue
 *    écrasait l'adresse — même quand elle correspondait à un ancien point.
 *
 * Ce fichier verrouille le point 2 : la sélection est posée immédiatement, et
 * les requêtes obsolètes sont annulées.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('react-native-maps', () => {
  // `createElement` vient de React, pas de React Native.
  const ReactLib = require('react');
  const RN = require('react-native');
  const MapView = (props: any) =>
    ReactLib.createElement(RN.View, { ...props, testID: 'map' }, props.children);
  return {
    __esModule: true,
    default: MapView,
    Marker: (props: any) => ReactLib.createElement(RN.View, props, props.children),
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#fff', text: '#111', background: '#fff', primary: '#4F46E5',
      border: '#eee', gray100: '#eee', gray400: '#999', gray500: '#777',
      gray600: '#555', white: '#fff', error: '#f00',
    },
    isDark: false,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'fr' } }),
}));

const MapPickerModal = require('../MapPickerModal').default;

const TAP = {
  nativeEvent: { coordinate: { latitude: 4.0511, longitude: 9.7679 } },
};

function renderModal(onLocationSelect = jest.fn()) {
  return {
    onLocationSelect,
    ...render(
      <MapPickerModal
        visible
        onClose={jest.fn()}
        onLocationSelect={onLocationSelect}
      />,
    ),
  };
}

beforeEach(() => {
  // Nominatim qui ne répond JAMAIS : c'est le pire cas réel (rate-limit).
  // L'interface doit rester utilisable malgré tout.
  jest.useFakeTimers();
  (global as any).fetch = jest.fn(() => new Promise(() => {}));
});

afterEach(() => {
  // Le garde-fou de 8 s reste armé tant que `fetch` ne retombe pas — ce qui
  // est précisément le cas simulé ici. On purge les timers pour que Jest
  // puisse rendre la main.
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('réactivité de la carte', () => {
  it("retient le point TOUT DE SUITE, sans attendre l'adresse", async () => {
    const { getByTestId, onLocationSelect } = renderModal();

    fireEvent(getByTestId('map'), 'press', TAP);

    // LE bug : il fallait attendre Nominatim pour que quoi que ce soit bouge.
    // Le bouton de validation doit devenir utilisable immédiatement.
    await waitFor(() => {
      const confirm = getByTestId('map-confirm');
      expect(confirm.props.accessibilityState?.disabled).toBeFalsy();
    });

    fireEvent.press(getByTestId('map-confirm'));
    expect(onLocationSelect).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 4.0511, lng: 9.7679 }),
    );
  });

  it('annule la requête précédente quand on retape ailleurs', async () => {
    const aborted: boolean[] = [];
    (global as any).fetch = jest.fn((_url: string, opts: any) => {
      opts?.signal?.addEventListener?.('abort', () => aborted.push(true));
      return new Promise(() => {});
    });

    const { getByTestId } = renderModal();

    fireEvent(getByTestId('map'), 'press', TAP);
    fireEvent(getByTestId('map'), 'press', {
      nativeEvent: { coordinate: { latitude: 3.86, longitude: 11.52 } },
    });

    // Sans annulation, la première réponse — plus ancienne — pouvait écraser
    // l'adresse du point le plus récemment choisi.
    await waitFor(() => expect(aborted.length).toBeGreaterThan(0));
  });
});
