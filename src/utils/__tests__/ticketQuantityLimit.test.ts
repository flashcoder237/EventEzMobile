/**
 * Limite reelle de quantite achetable.
 *
 * L'ecran d'achat mobile plafonnait a un `10` code en dur, ignorant a la
 * fois `max_per_order`, le stock et la jauge de l'evenement. Selon le
 * reglage de l'organisateur, l'acheteur etait donc soit refuse au paiement
 * apres avoir saisi ses coordonnees, soit bloque sans raison.
 */
import {
  getQuantityLimit,
  DEFAULT_MAX_PER_ORDER,
} from '../ticketQuantityLimit';

const ticket = (over: Record<string, any> = {}) => ({
  max_per_order: 10,
  min_per_order: 1,
  quantity_total: 100,
  quantity_sold: 0,
  quantity_available: 100,
  ...over,
}) as any;

describe('getQuantityLimit', () => {
  it('respecte le max_per_order de l organisateur', () => {
    const { max, reason } = getQuantityLimit(ticket({ max_per_order: 4 }));
    expect(max).toBe(4);
    expect(reason).toBe('per_order');
  });

  it('ne bride plus a 10 quand l organisateur autorise davantage', () => {
    // Cas ou l'ancien code bloquait sans raison, en proposant meme de
    // « contacter l'organisateur » pour une limite qui n'existait pas.
    const { max } = getQuantityLimit(ticket({ max_per_order: 50 }));
    expect(max).toBe(50);
  });

  it('retombe sur le defaut quand aucun plafond n est fixe', () => {
    const { max } = getQuantityLimit(ticket({ max_per_order: 0 }));
    expect(max).toBe(DEFAULT_MAX_PER_ORDER);
  });

  it('borne au stock restant, meme si le plafond est plus large', () => {
    // 3 places restantes : l'acheteur ne doit pas pouvoir monter a 10.
    const { max, reason } = getQuantityLimit(
      ticket({ max_per_order: 10, quantity_available: 3 }),
    );
    expect(max).toBe(3);
    expect(reason).toBe('stock');
  });

  it('calcule le stock localement si le serveur ne le donne pas', () => {
    const { max } = getQuantityLimit(
      ticket({ quantity_available: null, quantity_total: 20, quantity_sold: 18 }),
    );
    expect(max).toBe(2);
  });

  it('borne a la jauge GLOBALE de l evenement', () => {
    // LE scenario : le tarif annonce 102 places, l'evenement n'en a plus
    // que 2. Sans cette borne, l'acheteur remplit son panier puis est
    // refuse au paiement.
    const { max, reason } = getQuantityLimit(
      ticket({ max_per_order: 10, quantity_available: 102 }),
      { attendanceRemaining: 2 },
    );
    expect(max).toBe(2);
    expect(reason).toBe('event_capacity');
  });

  it('ignore la jauge quand elle est illimitee', () => {
    const { max } = getQuantityLimit(
      ticket({ max_per_order: 6 }), { attendanceRemaining: null },
    );
    expect(max).toBe(6);
  });

  it('retient TOUJOURS la contrainte la plus serree', () => {
    const { max } = getQuantityLimit(
      ticket({ max_per_order: 8, quantity_available: 5 }),
      { attendanceRemaining: 3 },
    );
    expect(max).toBe(3);
  });

  it('rend 0 quand l evenement est complet', () => {
    const { max } = getQuantityLimit(ticket(), { attendanceRemaining: 0 });
    expect(max).toBe(0);
  });

  it('expose le minimum par commande', () => {
    // Un min_per_order = 2 (billet couple) garantissait un refus au
    // premier achat de tout utilisateur naif.
    expect(getQuantityLimit(ticket({ min_per_order: 2 })).min).toBe(2);
    expect(getQuantityLimit(ticket({ min_per_order: 0 })).min).toBe(1);
  });

  it('ne renvoie jamais de valeur negative', () => {
    const { max } = getQuantityLimit(
      ticket({ quantity_available: null, quantity_total: 5, quantity_sold: 12 }),
    );
    expect(max).toBe(0);
  });
});
