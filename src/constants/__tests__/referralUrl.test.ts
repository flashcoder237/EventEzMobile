/**
 * getReferralUrl — le `?ref=` est le déclencheur de TOUTE la chaîne de
 * parrainage (capture web → session → conversion → commission).
 *
 * Régression visée : l'écran de parrainage partageait le CODE SEUL. Le
 * destinataire ne savait pas où le saisir et aucune conversion n'était jamais
 * attribuée.
 */
import { getReferralUrl } from '../urls';

describe('getReferralUrl', () => {
  it('produit un lien contenant ?ref=', () => {
    const url = getReferralUrl('ABC12345');
    expect(url).toContain('?ref=ABC12345');
    expect(url).toMatch(/^https?:\/\//);
  });

  it("pointe vers l'événement quand il est fourni", () => {
    const url = getReferralUrl('ABC12345', 'mon-event');
    expect(url).toContain('/events/mon-event');
    expect(url).toContain('?ref=ABC12345');
  });

  it('encode les caractères spéciaux du code', () => {
    // Un code ne devrait pas en contenir, mais on ne construit jamais une URL
    // par concaténation brute.
    expect(getReferralUrl('A B&C')).toContain('?ref=A%20B%26C');
  });

  it('ne renvoie jamais le code nu', () => {
    const url = getReferralUrl('ABC12345');
    expect(url).not.toBe('ABC12345');
  });
});
