/**
 * Ticket purchase tour — fires on first visit to TicketPurchaseScreen. Two
 * steps highlighting the ticket type selector and the promo code field.
 *
 * Bump TICKET_PURCHASE_TOUR_STORAGE_KEY when adding steps.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

export const TICKET_PURCHASE_TOUR_STORAGE_KEY = 'eventez_tour_ticket_purchase_v1_seen';
export const TICKET_PURCHASE_TOUR_DELAY_MS = 1500;

export function getTicketPurchaseTourSteps(t: TFunction): TourStep[] {
  return [
    {
      id: 'ticket-purchase-types',
      eyebrow: t('ticketPurchaseTour.typesEyebrow'),
      title: t('ticketPurchaseTour.typesTitle'),
      body: t('ticketPurchaseTour.typesBody'),
      placement: 'bottom',
      shape: 'rect',
      padding: 8,
    },
    {
      id: 'ticket-purchase-promo',
      eyebrow: t('ticketPurchaseTour.promoEyebrow'),
      title: t('ticketPurchaseTour.promoTitle'),
      body: t('ticketPurchaseTour.promoBody'),
      placement: 'top',
      shape: 'rect',
      padding: 6,
    },
  ];
}
