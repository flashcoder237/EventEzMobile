/**
 * Tests pour ForwardModal — composant de transfert de messages.
 *
 * Verifie que :
 *  - les destinataires sont rendus
 *  - la search bar est presente et envoie ses changements via onSearchChange
 *  - clic sur un destinataire le sélectionne (sans envoyer)
 *  - tap sur le CTA sticky appelle onSendToTargets avec la liste d'IDs
 *  - searchQuery filtre les résultats
 *  - empty state s'affiche quand targets est vide
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ForwardModal from '../ForwardModal';

// Mock du theme — getDisplayName tire firstName/lastName, on renvoie les
// raw users pour piloter les valeurs depuis le test.
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      surface: '#fff',
      gray50: '#f9fafb',
      gray100: '#f3f4f6',
      gray300: '#d1d5db',
      gray400: '#9ca3af',
      gray500: '#6b7280',
      gray700: '#374151',
      gray900: '#111827',
    },
  }),
}));

jest.mock('../../ui/LoadingOverlay', () => ({
  LoadingSpinner: () => null,
}));

const targets: any[] = [
  { id: 1, first_name: 'Alice', last_name: 'Martin', email: 'alice@example.com' },
  { id: 2, first_name: 'Bob', last_name: 'Dupont', email: 'bob@example.com' },
];

describe('ForwardModal', () => {
  it('renders the list of targets and the search input', () => {
    const { getByText, getByPlaceholderText } = render(
      <ForwardModal
        visible
        targets={targets}
        loading={false}
        searchQuery=""
        onSearchChange={jest.fn()}
        onClose={jest.fn()}
        onSendToTargets={jest.fn()}
      />
    );
    expect(getByText('Transférer à')).toBeTruthy();
    expect(getByText('Alice Martin')).toBeTruthy();
    expect(getByText('Bob Dupont')).toBeTruthy();
    expect(getByText('alice@example.com')).toBeTruthy();
    expect(getByPlaceholderText('Rechercher un contact...')).toBeTruthy();
  });

  it('toggles selection on tap and calls onSendToTargets via the sticky CTA', () => {
    const onSendToTargets = jest.fn();
    const { getByText } = render(
      <ForwardModal
        visible
        targets={targets}
        loading={false}
        searchQuery=""
        onSearchChange={jest.fn()}
        onClose={jest.fn()}
        onSendToTargets={onSendToTargets}
      />
    );
    // Tap row : sélectionne sans envoyer
    fireEvent.press(getByText('Bob Dupont'));
    expect(onSendToTargets).not.toHaveBeenCalled();
    // Le CTA sticky envoie la sélection
    fireEvent.press(getByText('Envoyer à 1 destinataire'));
    expect(onSendToTargets).toHaveBeenCalledWith(['2']);
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
        onSendToTargets={jest.fn()}
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
        onSendToTargets={jest.fn()}
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
        onSendToTargets={jest.fn()}
      />
    );
    expect(getByText('Aucun contact disponible')).toBeTruthy();
  });
});
