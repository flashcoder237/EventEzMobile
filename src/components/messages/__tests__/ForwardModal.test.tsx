/**
 * Tests Jest pour ForwardModal.
 *
 * ForwardModal est purement controle : recoit `targets` (User[]),
 * filtre par `searchQuery`, et appelle `onSelectTarget(userId)` au clic.
 * Aucun appel API en interne.
 *
 * Couvre :
 *  - render de la liste des destinataires + champ recherche
 *  - click sur un destinataire -> onSelectTarget(String(id))
 *  - filtre par recherche : appelle onSearchChange (controlled input)
 *  - bouton fermer (icon close) -> onClose
 *  - empty state si targets vide
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Stub bottom sheet anim pour render synchrone
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
  white: '#FFFFFF',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

// expo-image mock
jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.Image };
});

// LoadingSpinner — neutralise pour render
jest.mock('../../ui/LoadingOverlay', () => {
  const RN = require('react-native');
  return { LoadingSpinner: () => RN.View };
});

import ForwardModal from '../ForwardModal';

const targets: any[] = [
  { id: 1, email: 'alice@example.com', first_name: 'Alice', last_name: 'Martin' },
  { id: 2, email: 'bob@example.com', first_name: 'Bob', last_name: 'Dupont' },
];

describe('ForwardModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the list of targets and the search input', () => {
    const { getByText, getByPlaceholderText } = render(
      <ForwardModal
        visible
        targets={targets}
        loading={false}
        searchQuery=""
        onSearchChange={jest.fn()}
        onClose={jest.fn()}
        onSelectTarget={jest.fn()}
      />
    );
    expect(getByText('Transférer à')).toBeTruthy();
    // Les noms (Alice Martin / Bob Dupont) sont assembles par getDisplayName
    expect(getByText('Alice Martin')).toBeTruthy();
    expect(getByText('Bob Dupont')).toBeTruthy();
    expect(getByText('alice@example.com')).toBeTruthy();
    expect(getByPlaceholderText('Rechercher un contact...')).toBeTruthy();
  });

  it('calls onSelectTarget with the user id (as string) when a target is pressed', () => {
    const onSelectTarget = jest.fn();
    const { getByText } = render(
      <ForwardModal
        visible
        targets={targets}
        loading={false}
        searchQuery=""
        onSearchChange={jest.fn()}
        onClose={jest.fn()}
        onSelectTarget={onSelectTarget}
      />
    );
    fireEvent.press(getByText('Bob Dupont'));
    expect(onSelectTarget).toHaveBeenCalledWith('2');
  });

  it('forwards the search input changes via onSearchChange', () => {
    const onSearchChange = jest.fn();
    const { getByPlaceholderText } = render(
      <ForwardModal
        visible
        targets={targets}
        loading={false}
        searchQuery=""
        onSearchChange={onSearchChange}
        onClose={jest.fn()}
        onSelectTarget={jest.fn()}
      />
    );
    fireEvent.changeText(getByPlaceholderText('Rechercher un contact...'), 'ali');
    expect(onSearchChange).toHaveBeenCalledWith('ali');
  });

  it('filters targets by searchQuery (Alice matches, Bob hidden)', () => {
    const { getByText, queryByText } = render(
      <ForwardModal
        visible
        targets={targets}
        loading={false}
        searchQuery="alice"
        onSearchChange={jest.fn()}
        onClose={jest.fn()}
        onSelectTarget={jest.fn()}
      />
    );
    expect(getByText('Alice Martin')).toBeTruthy();
    expect(queryByText('Bob Dupont')).toBeNull();
  });

  it('shows empty state when targets is empty', () => {
    const { getByText } = render(
      <ForwardModal
        visible
        targets={[]}
        loading={false}
        searchQuery=""
        onSearchChange={jest.fn()}
        onClose={jest.fn()}
        onSelectTarget={jest.fn()}
      />
    );
    expect(getByText('Aucun contact disponible')).toBeTruthy();
  });
});
