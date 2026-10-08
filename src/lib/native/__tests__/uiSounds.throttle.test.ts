/**
 * Plafonnement des sons d'interface.
 *
 * DEMANDE (2026-10-08) : « l'application n'a pas vraiment été cartographiée,
 * il y a tellement d'endroits subtils où un son subtil serait un plus ».
 *
 * La cartographie a mesuré les cadences RÉELLES, et ce sont elles qui dictent
 * ces tests :
 *   - conversation active : 20 à 40 messages par minute ;
 *   - scanner au portique : un scan toutes les 2,4 à 4 secondes, en continu ;
 *   - guichet : 6 à 10 taps par vente.
 *
 * Un son non plafonné sur un de ces chemins ne produit pas « un peu trop de
 * son » : il fait couper le réglage DÉFINITIVEMENT, et on perd alors aussi les
 * sons utiles. Le plafond protège la fonctionnalité, pas seulement l'oreille.
 *
 * ── MÉTHODE ────────────────────────────────────────────────────────────────
 * On teste la DÉCISION (jouer ou non), pas la lecture audio elle-même. La
 * lecture dépend d'`expo-audio` et de l'état de l'application ; la décision
 * est une fonction pure du temps et du réglage, et c'est elle qui portait le
 * défaut.
 */

/** Réimplémentation de la règle testée — voir `uiSounds.throttledUi`. */
function makeGate(enabled: () => boolean) {
  const last: Record<string, number> = {};
  return (minIntervalMs: number, key: string, now: number): boolean => {
    if (!enabled()) return false;
    if (now - (last[key] ?? 0) < minIntervalMs) return false;
    last[key] = now;
    return true;
  };
}

describe('plafonnement des sons d’interface', () => {
  it('ne laisse passer qu’UNE fois dans la fenêtre', () => {
    const gate = makeGate(() => true);
    // 10 messages reçus d'affilée — le cas de la conversation active.
    const passed = Array.from({ length: 10 }, (_, i) =>
      gate(3000, 'rafale', 1_000_000 + i * 50),
    ).filter(Boolean);

    expect(passed).toHaveLength(1);
  });

  it('laisse repasser une fois la fenêtre écoulée', () => {
    const gate = makeGate(() => true);

    expect(gate(3000, 'fenetre', 1_000_000)).toBe(true);
    expect(gate(3000, 'fenetre', 1_002_999)).toBe(false);
    expect(gate(3000, 'fenetre', 1_003_001)).toBe(true);
  });

  it('sépare les compteurs par clé', () => {
    // Deux sources différentes ne doivent pas se voler leur tour : un message
    // reçu ne doit pas « consommer » le son d'une confirmation de paiement.
    const gate = makeGate(() => true);

    expect(gate(3000, 'source-a', 1_000_000)).toBe(true);
    expect(gate(3000, 'source-b', 1_000_000)).toBe(true);
  });

  it('ne laisse RIEN passer quand le réglage est coupé', () => {
    // Les sons d'interface sont coupés PAR DÉFAUT : c'est le comportement le
    // plus important à préserver.
    const gate = makeGate(() => false);

    expect(gate(3000, 'coupe', 1_000_000)).toBe(false);
  });

  it('la règle du module correspond bien à celle testée ici', () => {
    // Garde-fou : si `throttledUi` change de logique, ce test doit tomber
    // plutôt que de laisser croire que le plafond est vérifié.
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'uiSounds.ts'), 'utf8',
    );

    expect(source).toContain('throttledUi');
    expect(source).toMatch(/now - \(lastPlayed\[key\] \?\? 0\) < minIntervalMs/);
    expect(source).toMatch(/if \(!getSensoryPref\('uiSounds'\)\) return;/);
  });
});
