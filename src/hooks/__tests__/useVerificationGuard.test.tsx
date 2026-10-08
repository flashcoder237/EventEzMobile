/**
 * Le garde de vérification ne doit JAMAIS échouer en silence.
 *
 * BUG CORRIGÉ (2026-10-07), signalé par un testeur : « à quoi sert ce bouton
 * de favori si cliquer dessus ne fait rien ? ».
 *
 * Le bouton était pourtant entièrement câblé : handler, appel API, mise à jour
 * optimiste, rollback sur erreur. Mais tout passait par ce garde, qui pour un
 * utilisateur non connecté émettait `auth-required` sur le bus d'événements —
 * un événement QUE PERSONNE N'ÉCOUTAIT. L'action s'arrêtait là, sans écran de
 * connexion, sans message, sans rien.
 *
 * C'est le pire type de panne : silencieuse, et impossible à distinguer d'un
 * bouton oublié.
 */
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

let mockAuth: any = { user: null, isAuthenticated: false };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

const mockEmit = jest.fn();
jest.mock('../../lib/eventBus', () => ({
  eventBus: { emit: (...args: any[]) => mockEmit(...args) },
}));

const { useVerificationGuard } = require('../useVerificationGuard');

function Probe({ onRun }: { onRun: () => void }) {
  const { requireVerification } = useVerificationGuard();
  return (
    <TouchableOpacity testID="btn" onPress={() => requireVerification(onRun)}>
      <Text>go</Text>
    </TouchableOpacity>
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockEmit.mockClear();
});

describe('useVerificationGuard', () => {
  it("envoie vers la connexion quand l'utilisateur n'est pas connecté", () => {
    mockAuth = { user: null, isAuthenticated: false };
    const action = jest.fn();

    const { getByTestId } = render(<Probe onRun={action} />);
    fireEvent.press(getByTestId('btn'));

    // LE bug : on n'allait nulle part.
    expect(mockNavigate).toHaveBeenCalledWith('Login');
    expect(action).not.toHaveBeenCalled();
  });

  it("n'emet plus l'evenement mort `auth-required`", () => {
    mockAuth = { user: null, isAuthenticated: false };

    const { getByTestId } = render(<Probe onRun={jest.fn()} />);
    fireEvent.press(getByTestId('btn'));

    const emitted = mockEmit.mock.calls.map((c) => c[0]);
    expect(emitted).not.toContain('auth-required');
  });

  it('ouvre la vérification quand le compte existe mais n’est pas vérifié', () => {
    mockAuth = {
      user: { email: 'a@b.cm', email_verified: false, auth_provider: 'email' },
      isAuthenticated: true,
    };
    const action = jest.fn();

    const { getByTestId } = render(<Probe onRun={action} />);
    fireEvent.press(getByTestId('btn'));

    // Celui-ci a bien un abonné (VerificationGuardModal), on le garde.
    expect(mockEmit).toHaveBeenCalledWith(
      'verification-required', { email: 'a@b.cm' },
    );
    expect(action).not.toHaveBeenCalled();
  });

  it('exécute l’action quand tout est en règle', () => {
    mockAuth = {
      user: { email: 'a@b.cm', email_verified: true, auth_provider: 'email' },
      isAuthenticated: true,
    };
    const action = jest.fn();

    const { getByTestId } = render(<Probe onRun={action} />);
    fireEvent.press(getByTestId('btn'));

    expect(action).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('laisse passer un compte social même sans email vérifié', () => {
    // Google/Apple vérifient déjà l'adresse : redemander serait absurde.
    mockAuth = {
      user: { email: 'a@b.cm', email_verified: false, auth_provider: 'google' },
      isAuthenticated: true,
    };
    const action = jest.fn();

    const { getByTestId } = render(<Probe onRun={action} />);
    fireEvent.press(getByTestId('btn'));

    expect(action).toHaveBeenCalled();
  });
});
