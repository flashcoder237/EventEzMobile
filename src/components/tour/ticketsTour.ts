/**
 * Tickets tour — fires on first focus of MyTicketsScreen (after main tabs
 * tour). Single step pointing at the "Pending Transfers" icon — a feature
 * users routinely miss because it's a small icon in the header. The QR /
 * offline behavior is covered in the help center FAQ since the QR isn't
 * visible until a ticket is tapped open.
 *
 * Bump TICKETS_TOUR_STORAGE_KEY when adding steps.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

export const TICKETS_TOUR_STORAGE_KEY = 'eventez_tour_tickets_v1_seen';
export const TICKETS_TOUR_DELAY_MS = 3000;

export function getTicketsTourSteps(t: TFunction): TourStep[] {
  return [
    {
      id: 'tickets-transfers-btn',
      eyebrow: t('ticketsTour.transfersEyebrow'),
      title: t('ticketsTour.transfersTitle'),
      body: t('ticketsTour.transfersBody'),
      placement: 'bottom',
      shape: 'circle',
      padding: 8,
    },
  ];
}
