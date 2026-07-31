/**
 * Tests de la fenetre d'annulation d'envoi.
 *
 * Invariant central : quand l'utilisateur tape "Annuler", la promesse resout
 * `false` et l'appelant ne declenche AUCUN envoi reseau. L'ancien comportement
 * (envoyer puis supprimer) laissait le message arriver chez le destinataire.
 */
import { UndoGate } from '../undoGate';

const DELAY = 5000;

describe('UndoGate', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('commits once the delay elapses', async () => {
    const gate = new UndoGate(DELAY);
    const pending = gate.arm();
    jest.advanceTimersByTime(DELAY);
    await expect(pending).resolves.toBe(true);
  });

  it('does not commit before the delay elapses', async () => {
    const gate = new UndoGate(DELAY);
    const settled = jest.fn();
    gate.arm().then(settled);

    jest.advanceTimersByTime(DELAY - 1);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(settled).toHaveBeenCalledWith(true);
  });

  it('resolves false on cancel — the caller must never send', async () => {
    const gate = new UndoGate(DELAY);
    const pending = gate.arm();
    gate.cancel();
    await expect(pending).resolves.toBe(false);
  });

  it('never commits after a cancel, even once the delay passes', async () => {
    const gate = new UndoGate(DELAY);
    const settled = jest.fn();
    gate.arm().then(settled);

    gate.cancel();
    await Promise.resolve();
    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(false);

    // Le timer d'origine ne doit pas re-resoudre la promesse a `true`.
    jest.advanceTimersByTime(DELAY * 2);
    await Promise.resolve();
    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(false);
  });

  it('commits the previous window when a new send is armed', async () => {
    const gate = new UndoGate(DELAY);
    const first = gate.arm();
    const second = gate.arm();

    // Le 1er message part : on ne le retient pas derriere le 2e.
    await expect(first).resolves.toBe(true);

    // ...et annuler le 2e n'affecte pas le 1er, deja commite.
    gate.cancel();
    await expect(second).resolves.toBe(false);
  });

  it('commits a pending send on explicit commit (unmount)', async () => {
    const gate = new UndoGate(DELAY);
    const pending = gate.arm();
    // Quitter l'ecran ne doit pas perdre silencieusement le message : l'user a
    // tape "envoyer" et n'a pas annule.
    gate.commit();
    await expect(pending).resolves.toBe(true);
  });

  it('tracks whether a window is open', async () => {
    const gate = new UndoGate(DELAY);
    expect(gate.isPending).toBe(false);

    const pending = gate.arm();
    expect(gate.isPending).toBe(true);

    jest.advanceTimersByTime(DELAY);
    await pending;
    expect(gate.isPending).toBe(false);
  });

  it('is a no-op to cancel or commit with no pending window', () => {
    const gate = new UndoGate(DELAY);
    expect(() => gate.cancel()).not.toThrow();
    expect(() => gate.commit()).not.toThrow();
  });
});
