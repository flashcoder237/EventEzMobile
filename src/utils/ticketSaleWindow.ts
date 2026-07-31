import type { TicketType } from '../types';

export type SaleState = 'open' | 'not_started' | 'ended';

/**
 * Etat de la fenetre de vente d'un type de billet a l'instant `nowTs`.
 *
 * Le backend refuse tout achat hors de [sales_start, sales_end] (cf.
 * registrations/views.py et registrations/serializers.py). L'UI doit donc
 * griser ces billets AVANT le paiement, sinon l'utilisateur selectionne, paie,
 * et ne recoit l'erreur qu'au submit.
 *
 * Une date absente ou non parsable => borne non contraignante : on n'invente
 * pas une fermeture que le backend n'appliquerait pas.
 */
export function getSaleState(
  ticketType: Pick<TicketType, 'sales_start' | 'sales_end'>,
  nowTs: number,
): SaleState {
  const start = Date.parse(ticketType.sales_start ?? '');
  if (!Number.isNaN(start) && nowTs < start) return 'not_started';
  const end = Date.parse(ticketType.sales_end ?? '');
  if (!Number.isNaN(end) && nowTs > end) return 'ended';
  return 'open';
}
