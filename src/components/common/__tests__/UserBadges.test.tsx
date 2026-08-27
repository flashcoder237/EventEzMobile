/**
 * UserBadges — les deux signaux doivent rester DISTINCTS.
 *
 * Régression visée : le KYC organisateur ne produisait aucun signal visible
 * pour l'acheteur, et « Pionnier » ne doit jamais être confondu avec
 * « Vérifié » (ancienneté vs identité).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { success: '#10B981', gray500: '#6B7280', text: '#111827' },
    isDark: false,
  }),
}));

import UserBadges, { isUserVerified, isUserPioneer } from '../UserBadges';

describe('UserBadges', () => {
  it("n'affiche rien pour un utilisateur ordinaire", () => {
    const { queryByText } = render(<UserBadges user={{}} />);
    expect(queryByText('Vérifié')).toBeNull();
    expect(queryByText('Pionnier')).toBeNull();
  });

  it('affiche « Vérifié » depuis organizer_profile.verified_status', () => {
    const { queryByText } = render(
      <UserBadges user={{ organizer_profile: { verified_status: true } }} />,
    );
    expect(queryByText('Vérifié')).toBeTruthy();
    // Vérifié n'implique PAS pionnier.
    expect(queryByText('Pionnier')).toBeNull();
  });

  it('affiche « Pionnier » sans impliquer « Vérifié »', () => {
    // Un testeur sans KYC ne doit hériter d'AUCUN signal de sécurité.
    const { queryByText } = render(<UserBadges user={{ is_pioneer: true }} />);
    expect(queryByText('Pionnier')).toBeTruthy();
    expect(queryByText('Vérifié')).toBeNull();
  });

  it('affiche les deux quand ils coexistent', () => {
    const { queryByText } = render(
      <UserBadges user={{ is_pioneer: true, is_verified: true }} />,
    );
    expect(queryByText('Pionnier')).toBeTruthy();
    expect(queryByText('Vérifié')).toBeTruthy();
  });

  it('reste annoncé aux lecteurs d\'écran en mode iconOnly', () => {
    const { queryByText, getByLabelText } = render(
      <UserBadges user={{ is_verified: true }} iconOnly />,
    );
    expect(queryByText('Vérifié')).toBeNull(); // libellé masqué visuellement
    expect(getByLabelText('Vérifié')).toBeTruthy(); // mais bien accessible
  });
});

describe('helpers', () => {
  it('isUserVerified accepte les trois formes renvoyées par l\'API', () => {
    expect(isUserVerified({ is_verified: true })).toBe(true);
    expect(isUserVerified({ organizer_profile: { verified_status: true } })).toBe(true);
    expect(isUserVerified({ organizer_profile: { verified: true } })).toBe(true);
    expect(isUserVerified({})).toBe(false);
    expect(isUserVerified(null)).toBe(false);
  });

  it('isUserPioneer ne lit QUE is_pioneer', () => {
    expect(isUserPioneer({ is_pioneer: true })).toBe(true);
    // Un vérifié n'est pas pionnier pour autant.
    expect(isUserPioneer({ is_verified: true })).toBe(false);
    expect(isUserPioneer(null)).toBe(false);
  });
});
