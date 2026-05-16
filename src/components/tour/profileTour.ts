/**
 * Profile tour — fires on first focus of ProfileScreen (after main tabs tour).
 * Three steps walking through the three highest-leverage entry points users
 * miss : "Devenir organisateur" CTA, the help center menu, and settings.
 *
 * The "Become Organizer" step is only meaningful for users with role==='user'.
 * The hook check is done at the screen level — if isOrganizer, this tour is
 * skipped entirely (organizers don't need this guidance and would see a
 * spotlight on an element that isn't even rendered for them).
 *
 * Bump PROFILE_TOUR_STORAGE_KEY when adding steps.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

export const PROFILE_TOUR_STORAGE_KEY = 'eventez_tour_profile_v1_seen';
export const PROFILE_TOUR_DELAY_MS = 3000;

export function getProfileTourSteps(t: TFunction): TourStep[] {
  return [
    {
      id: 'profile-become-organizer',
      eyebrow: t('profileTour.becomeOrganizerEyebrow'),
      title: t('profileTour.becomeOrganizerTitle'),
      body: t('profileTour.becomeOrganizerBody'),
      placement: 'bottom',
      shape: 'rect',
      padding: 8,
    },
    {
      id: 'profile-help',
      eyebrow: t('profileTour.helpEyebrow'),
      title: t('profileTour.helpTitle'),
      body: t('profileTour.helpBody'),
      placement: 'top',
      shape: 'rect',
      padding: 6,
    },
    {
      id: 'profile-settings',
      eyebrow: t('profileTour.settingsEyebrow'),
      title: t('profileTour.settingsTitle'),
      body: t('profileTour.settingsBody'),
      placement: 'top',
      shape: 'rect',
      padding: 6,
    },
  ];
}
