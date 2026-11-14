/**
 * composeAnnouncement — mise en phrase du résultat de check-in.
 *
 * Deux propriétés comptent ici, et elles ne sont pas cosmétiques :
 *  1. Le VERDICT passe toujours en premier. Le staff doit savoir « je laisse
 *     entrer ou pas » sans écouter la phrase jusqu'au bout.
 *  2. Aucune identité n'est annoncée sur un billet REFUSÉ : annoncer un nom à
 *     voix haute l'expose à l'entourage, et sur un refus le billet peut ne pas
 *     appartenir à la personne présente.
 */
import { composeAnnouncement } from '../useCheckinVoice';

// `t` renvoie la clé : on teste la COMPOSITION, pas les traductions.
const t = (key: string) => key;

describe('composeAnnouncement', () => {
  it('annonce le verdict avant le nom', () => {
    const phrase = composeAnnouncement(
      { success: true, holderName: 'Marie Dupont' },
      t,
    );
    expect(phrase.indexOf('voice.valid')).toBeLessThan(phrase.indexOf('Marie Dupont'));
  });

  it('inclut le nom et le type de billet sur un billet valide', () => {
    expect(
      composeAnnouncement(
        { success: true, holderName: 'Marie Dupont', ticketLabel: 'VIP' },
        t,
      ),
    ).toBe('organizer.qrScanner.voice.valid. Marie Dupont. VIP');
  });

  it("n'annonce AUCUNE identité sur un billet refusé", () => {
    const phrase = composeAnnouncement(
      { success: false, holderName: 'Marie Dupont', ticketLabel: 'VIP' },
      t,
    );
    expect(phrase).toBe('organizer.qrScanner.voice.refused');
    expect(phrase).not.toContain('Marie Dupont');
    expect(phrase).not.toContain('VIP');
  });

  it("distingue un billet déjà scanné d'un billet valide", () => {
    expect(
      composeAnnouncement({ success: true, alreadyCheckedIn: true }, t),
    ).toBe('organizer.qrScanner.voice.alreadyCheckedIn');
  });

  it('signale un billet valide mais à surveiller', () => {
    expect(composeAnnouncement({ success: true, warning: true }, t)).toBe(
      'organizer.qrScanner.voice.validWarning',
    );
  });

  it('priorise « déjà entré » sur « à surveiller »', () => {
    // Les deux drapeaux peuvent arriver ensemble : « déjà entré » est
    // l'information qui change la décision du staff.
    expect(
      composeAnnouncement({ success: true, alreadyCheckedIn: true, warning: true }, t),
    ).toBe('organizer.qrScanner.voice.alreadyCheckedIn');
  });

  it('tolère un nom et un type absents', () => {
    expect(
      composeAnnouncement({ success: true, holderName: null, ticketLabel: null }, t),
    ).toBe('organizer.qrScanner.voice.valid');
  });

  it("ignore un nom vide plutôt que d'annoncer un blanc", () => {
    expect(
      composeAnnouncement({ success: true, holderName: '', ticketLabel: '' }, t),
    ).toBe('organizer.qrScanner.voice.valid');
  });
});
