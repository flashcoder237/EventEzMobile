// ============================================
// EventEz Mobile API — Guichet (vente sur place)
// ============================================

import api from './instance';

export interface CashDrawerState {
  id: string;
  event: string;
  status: 'open' | 'closed';
  currency: string;
  opening_float: string;
  expected_amount: string;
  counted_amount: string | null;
  variance: string | null;
  variance_reason: string;
  sales_count: number;
  opened_at: string | null;
  closed_at: string | null;
}

export interface BoxOfficeSaleItem {
  ticket_type: string;
  quantity: number;
}

export interface BoxOfficeSale {
  payment: string;
  amount: string;
  currency: string;
  status: string;
  tickets: Array<{ id: string; ticket_type: string; quantity: number }>;
}

export const boxOfficeAPI = {
  /** Ouvre la caisse. `openingFloat` = monnaie de départ remise par
   *  l'organisateur — sans elle, le comptage du soir est faux de ce
   *  montant, et l'écart retombe sur la personne qui tient la caisse. */
  openDrawer: (eventId: string, openingFloat: string) =>
    api.post<CashDrawerState>('/box-office/open-drawer/', {
      event: eventId,
      opening_float: openingFloat,
    }),

  /** État de la caisse ouverte : alimente le compteur permanent. */
  getDrawer: (eventId: string) =>
    api.get<{ open: boolean } & Partial<CashDrawerState>>('/box-office/drawer/', {
      params: { event: eventId },
    }),

  /**
   * Encaisse une vente.
   *
   * `clientSaleId` DOIT être généré UNE SEULE FOIS par vente, côté client,
   * et réutilisé tel quel en cas de renvoi. Le caissier est debout sous la
   * pression d'une file : le double-tap est certain. Sans cette clé, la
   * même vente serait encaissée deux fois et le stock décrémenté deux fois.
   */
  sell: (params: {
    drawer: string;
    items: BoxOfficeSaleItem[];
    paymentMethod: 'cash' | 'mtn_money' | 'orange_money';
    clientSaleId: string;
    attendeeName?: string;
  }) =>
    api.post<BoxOfficeSale>('/box-office/sell/', {
      drawer: params.drawer,
      items: params.items,
      payment_method: params.paymentMethod,
      client_sale_id: params.clientSaleId,
      attendee_name: params.attendeeName,
    }),

  /** Clôture. Ne échoue JAMAIS sur un écart : un écart est un fait à
   *  tracer, pas une erreur à interdire. */
  closeDrawer: (params: {
    drawer: string;
    countedAmount: string;
    varianceReason?: string;
  }) =>
    api.post<CashDrawerState>('/box-office/close-drawer/', {
      drawer: params.drawer,
      counted_amount: params.countedAmount,
      variance_reason: params.varianceReason,
    }),
};
