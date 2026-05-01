/**
 * Main tabs tour — definition partagée entre MainTabNavigator (auto-start au
 * 1er lancement) et ProfileScreen (relance manuelle via "Revoir le guide").
 *
 * Bumpe MAIN_TABS_TOUR_STORAGE_KEY si tu modifies les steps — les users
 * existants re-verront le tour automatiquement.
 */

import type { TourStep } from './FeatureTourContext';

export const MAIN_TABS_TOUR_STORAGE_KEY = 'eventez_tour_main_v1_seen';
export const MAIN_TABS_TOUR_DELAY_MS = 1200;

export const MAIN_TABS_TOUR_STEPS: TourStep[] = [
  {
    id: 'tab-discover',
    eyebrow: '01 · DÉCOUVRIR',
    title: 'Tout commence ici.',
    body: 'Trouve les événements qui te bougent — concerts, ateliers, conférences, près de chez toi.',
    placement: 'top',
    shape: 'rect',
    padding: 6,
  },
  {
    id: 'tab-saved',
    eyebrow: '02 · FAVORIS',
    title: 'Garde un œil dessus.',
    body: 'Sauvegarde les événements à ne pas rater. On te prévient quand la date approche.',
    placement: 'top',
    shape: 'rect',
    padding: 6,
  },
  {
    id: 'tab-mytickets',
    eyebrow: '03 · BILLETS',
    title: 'Tes accès, dans ta poche.',
    body: 'Tous tes billets et inscriptions, scannables hors-ligne. Plus besoin de papier.',
    placement: 'top',
    shape: 'rect',
    padding: 6,
  },
  {
    id: 'tab-profile',
    eyebrow: '04 · PROFIL',
    title: 'Ton espace personnel.',
    body: 'Réglages, paiements, notifications. Tu peux aussi devenir organisateur·ice depuis ici.',
    placement: 'top',
    shape: 'rect',
    padding: 6,
  },
];
