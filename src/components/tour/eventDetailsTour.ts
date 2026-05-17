/**
 * Event details tour — fires on first visit to any EventDetailsScreen. Two
 * steps highlighting the Follow button (often-missed bookmark feature) and
 * the sticky bottom CTA (where the conversion happens).
 *
 * Single tour shared across all events — first event the user opens triggers
 * it, subsequent events don't.
 *
 * Bump EVENT_DETAILS_TOUR_STORAGE_KEY when adding steps.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

export const EVENT_DETAILS_TOUR_STORAGE_KEY = 'eventez_tour_event_details_v1_seen';
export const EVENT_DETAILS_TOUR_DELAY_MS = 2000;

export function getEventDetailsTourSteps(t: TFunction): TourStep[] {
  return [
    {
      id: 'event-details-follow',
      eyebrow: t('eventDetailsTour.followEyebrow'),
      title: t('eventDetailsTour.followTitle'),
      body: t('eventDetailsTour.followBody'),
      placement: 'bottom',
      shape: 'circle',
      padding: 8,
    },
    {
      id: 'event-details-cta',
      eyebrow: t('eventDetailsTour.ctaEyebrow'),
      title: t('eventDetailsTour.ctaTitle'),
      body: t('eventDetailsTour.ctaBody'),
      placement: 'top',
      shape: 'rect',
      padding: 8,
    },
  ];
}
