/**
 * Organizer tour — fired on first visit to MyEventsScreen for users with
 * role === 'organizer'. Two-step tour pointing at the FAB (event creation)
 * and the Wallet entry point.
 *
 * Bump ORGANIZER_TOUR_STORAGE_KEY when adding steps so existing organizers
 * re-see the tour.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

export const ORGANIZER_TOUR_STORAGE_KEY = 'eventez_tour_organizer_v1_seen';
export const ORGANIZER_TOUR_DELAY_MS = 800;

export function getOrganizerTourSteps(t: TFunction): TourStep[] {
  return [
    {
      id: 'organizer-create-btn',
      eyebrow: t('organizerTour.myeventsCreateEyebrow'),
      title: t('organizerTour.myeventsCreateTitle'),
      body: t('organizerTour.myeventsCreateBody'),
      placement: 'bottom',
      shape: 'circle',
      padding: 8,
    },
    {
      id: 'organizer-drafts-btn',
      eyebrow: t('organizerTour.myeventsDraftsEyebrow'),
      title: t('organizerTour.myeventsDraftsTitle'),
      body: t('organizerTour.myeventsDraftsBody'),
      placement: 'bottom',
      shape: 'circle',
      padding: 8,
    },
  ];
}
