/**
 * Discover tour — fires on first focus of DiscoverScreen, AFTER the main tabs
 * tour has been dismissed. Two steps highlighting the search trigger and the
 * category chips, which are the two daily-driver interactions on this screen
 * but easy to overlook in the editorial layout.
 *
 * Bump DISCOVER_TOUR_STORAGE_KEY when adding steps.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

export const DISCOVER_TOUR_STORAGE_KEY = 'eventez_tour_discover_v1_seen';
export const DISCOVER_TOUR_DELAY_MS = 3000;

export function getDiscoverTourSteps(t: TFunction): TourStep[] {
  return [
    {
      id: 'discover-search',
      eyebrow: t('discoverTour.searchEyebrow'),
      title: t('discoverTour.searchTitle'),
      body: t('discoverTour.searchBody'),
      placement: 'bottom',
      shape: 'rect',
      padding: 8,
    },
    {
      id: 'discover-categories',
      eyebrow: t('discoverTour.categoriesEyebrow'),
      title: t('discoverTour.categoriesTitle'),
      body: t('discoverTour.categoriesBody'),
      placement: 'bottom',
      shape: 'rect',
      padding: 6,
    },
  ];
}
