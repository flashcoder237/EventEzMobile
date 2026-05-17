/**
 * Event creation tour — fires on first visit to EventCreateScreen. Two steps
 * pointing at the template grid (fast start) and the manual-skip option.
 * The multi-step wizard itself isn't toured step-by-step (would be tour
 * fatigue) — the first step here gives users enough to navigate the wizard
 * confidently.
 *
 * Bump EVENT_CREATE_TOUR_STORAGE_KEY when adding steps.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

export const EVENT_CREATE_TOUR_STORAGE_KEY = 'eventez_tour_event_create_v1_seen';
export const EVENT_CREATE_TOUR_DELAY_MS = 1500;

export function getEventCreateTourSteps(t: TFunction): TourStep[] {
  return [
    {
      id: 'event-create-progress',
      eyebrow: t('eventCreateTour.progressEyebrow'),
      title: t('eventCreateTour.progressTitle'),
      body: t('eventCreateTour.progressBody'),
      placement: 'bottom',
      shape: 'rect',
      padding: 6,
    },
  ];
}
