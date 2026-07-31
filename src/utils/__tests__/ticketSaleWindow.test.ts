/**
 * Tests de la fenetre de vente d'un type de billet (`getSaleState`).
 *
 * Le backend refuse tout achat hors de [sales_start, sales_end]
 * (registrations/views.py + registrations/serializers.py). Avant ce helper,
 * l'UI mobile ne regardait que le stock : un billet dont la date de fin de
 * vente etait passee restait selectionnable, et l'utilisateur ne decouvrait le
 * refus qu'apres avoir tente de payer. Le web filtrait deja sur `sales_end`
 * (app/[locale]/events/[slug]/register/page.tsx) — ces tests verrouillent la
 * parite mobile.
 */
import { getSaleState } from '../ticketSaleWindow';

const NOW = Date.parse('2026-07-31T12:00:00Z');
const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

const HOUR = 3_600_000;

describe('getSaleState', () => {
  it('returns "open" inside the sales window', () => {
    expect(
      getSaleState({ sales_start: iso(-HOUR), sales_end: iso(HOUR) }, NOW),
    ).toBe('open');
  });

  it('returns "ended" once sales_end has passed', () => {
    expect(
      getSaleState({ sales_start: iso(-2 * HOUR), sales_end: iso(-HOUR) }, NOW),
    ).toBe('ended');
  });

  it('returns "not_started" before sales_start', () => {
    expect(
      getSaleState({ sales_start: iso(HOUR), sales_end: iso(2 * HOUR) }, NOW),
    ).toBe('not_started');
  });

  it('treats the exact boundaries as still open', () => {
    // Le backend compare avec `<` / `>` stricts : a l'instant pile de la borne
    // l'achat passe encore. L'UI ne doit pas fermer une seconde trop tot.
    expect(
      getSaleState({ sales_start: iso(0), sales_end: iso(HOUR) }, NOW),
    ).toBe('open');
    expect(
      getSaleState({ sales_start: iso(-HOUR), sales_end: iso(0) }, NOW),
    ).toBe('open');
  });

  it('does not close the sale when dates are missing or unparsable', () => {
    // Une borne absente n'est pas contraignante cote backend : l'UI ne doit pas
    // inventer une fermeture qui bloquerait un billet pourtant achetable.
    expect(
      getSaleState({ sales_start: undefined as any, sales_end: undefined as any }, NOW),
    ).toBe('open');
    expect(
      getSaleState({ sales_start: 'not-a-date', sales_end: 'not-a-date' }, NOW),
    ).toBe('open');
    // Fin de vente valide + debut absent => la fin fait toujours foi.
    expect(
      getSaleState({ sales_start: undefined as any, sales_end: iso(-HOUR) }, NOW),
    ).toBe('ended');
  });

  it('re-evaluates as time passes (ticket closing while the screen is open)', () => {
    const ticket = { sales_start: iso(-HOUR), sales_end: iso(HOUR) };
    expect(getSaleState(ticket, NOW)).toBe('open');
    // 2h plus tard, sans rechargement des donnees, le billet doit basculer.
    expect(getSaleState(ticket, NOW + 2 * HOUR)).toBe('ended');
  });
});
