/**
 * Une recherche sans résultat doit proposer une sortie, pas un cul-de-sac.
 *
 * DEMANDE (2026-10-07) : « si la catégorie recherchée n'existe pas, qu'on
 * propose la catégorie "autre" qui existe ».
 *
 * Avant, une recherche infructueuse n'affichait qu'un message « aucun
 * résultat ». L'organisateur devait deviner seul qu'il existe une catégorie
 * de repli — et la catégorie est un champ OBLIGATOIRE pour créer un
 * événement. On le bloquait donc sur une impasse.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// `SpringSheet` embarque react-native-gesture-handler, dont le module natif
// ne s'installe pas hors application. On le remplace par un rendu simple : ce
// test porte sur le CONTENU de la liste, pas sur l'animation de la feuille.
jest.mock('../../ui/motion/SpringSheet', () => {
  const ReactLib = require('react');
  const RN = require('react-native');
  const Sheet = ({ children }: any) =>
    ReactLib.createElement(RN.View, null, children);
  return {
    __esModule: true,
    default: Sheet,
    SpringSheet: Sheet,
    SpringSheetScrollView: RN.ScrollView,
    SpringSheetFlatList: RN.FlatList,
  };
});

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#fff', text: '#111', background: '#fff', primary: '#4F46E5',
      border: '#eee', gray100: '#eee', gray400: '#999', gray500: '#777',
      gray600: '#555', gray900: '#111', white: '#fff',
    },
    isDark: false,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'fr' } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const SearchableSelectModal = require('../SearchableSelectModal').default;

type Cat = { id: number; slug: string; name: string };

const CATEGORIES: Cat[] = [
  { id: 1, slug: 'musique-concerts', name: 'Musique & Concerts' },
  { id: 2, slug: 'autres', name: 'Autres' },
];

const OTHER = CATEGORIES[1];

function renderModal(props: any = {}) {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const utils = render(
    <SearchableSelectModal
      visible
      onClose={onClose}
      title="Catégorie"
      searchPlaceholder="Rechercher"
      items={CATEGORIES}
      getKey={(c: Cat) => String(c.id)}
      getLabel={(c: Cat) => c.name}
      selectedKey={null}
      onSelect={onSelect}
      emptyText="Aucun résultat"
      {...props}
    />,
  );
  return { ...utils, onSelect, onClose };
}

/** Saisit une recherche qui ne correspond à rien. */
function searchNothing(getByPlaceholderText: any) {
  fireEvent.changeText(
    getByPlaceholderText('Rechercher'), 'zzzz-inexistant-zzzz');
}

describe('repli de la recherche', () => {
  it('propose la catégorie de secours quand rien ne correspond', () => {
    const { getByPlaceholderText, getByTestId } = renderModal({
      fallbackItem: OTHER,
    });

    searchNothing(getByPlaceholderText);

    expect(getByTestId('searchable-fallback')).toBeTruthy();
  });

  it('sélectionne bien cette catégorie et referme', () => {
    const { getByPlaceholderText, getByTestId, onSelect, onClose } =
      renderModal({ fallbackItem: OTHER });

    searchNothing(getByPlaceholderText);
    fireEvent.press(getByTestId('searchable-fallback'));

    expect(onSelect).toHaveBeenCalledWith(OTHER);
    expect(onClose).toHaveBeenCalled();
  });

  it("n'affiche rien de plus quand aucun repli n'est fourni", () => {
    // Le composant sert aussi aux langues, aux villes… où un repli n'aurait
    // aucun sens.
    const { getByPlaceholderText, queryByTestId } = renderModal();

    searchNothing(getByPlaceholderText);

    expect(queryByTestId('searchable-fallback')).toBeNull();
  });

  it('ne propose pas le repli tant que la recherche donne des résultats', () => {
    const { getByPlaceholderText, queryByTestId } = renderModal({
      fallbackItem: OTHER,
    });

    fireEvent.changeText(getByPlaceholderText('Rechercher'), 'Musique');

    expect(queryByTestId('searchable-fallback')).toBeNull();
  });
});
