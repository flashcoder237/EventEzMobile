/**
 * Main tabs tour — definition partagée entre MainTabNavigator (auto-start au
 * 1er lancement) et ProfileScreen (relance manuelle via "Revoir le guide").
 *
 * Bumpe MAIN_TABS_TOUR_STORAGE_KEY si tu modifies les steps — les users
 * existants re-verront le tour automatiquement.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

// Bumpé v1 → v2 lors de l'ajout du tab Messages : les users existants re-verront le tour.
export const MAIN_TABS_TOUR_STORAGE_KEY = 'eventez_tour_main_v2_seen';
export const MAIN_TABS_TOUR_DELAY_MS = 1200;

/**
 * Static fallback (français) — si tu as besoin des steps hors d'un composant
 * React. Préfère `getMainTabsTourSteps(t)` dans les composants pour bénéficier
 * de l'i18n sur les eyebrows.
 */
export const MAIN_TABS_TOUR_STEPS: TourStep[] = [
  {
    id: 'tab-discover',
    eyebrow: '01 · DÉCOUVRIR',
    title: 'Tout commence ici.',
    body: 'Trouvez les événements qui vous bougent — concerts, ateliers, conférences, près de chez vous.',
    placement: 'top',
    shape: 'rect',
    padding: 6,
  },
  {
    id: 'tab-saved',
    eyebrow: '02 · FAVORIS',
    title: 'Gardez un œil dessus.',
    body: 'Sauvegardez les événements à ne pas rater. On vous prévient quand la date approche.',
    placement: 'top',
    shape: 'rect',
    padding: 6,
  },
  {
    id: 'tab-messagestab',
    eyebrow: '03 · MESSAGES',
    title: 'Discutez en direct.',
    body: 'Vos conversations avec les organisateurs et les participants. WhatsApp-like, dans l\'app.',
    placement: 'top',
    shape: 'rect',
    padding: 6,
  },
  {
    id: 'tab-mytickets',
    eyebrow: '04 · BILLETS',
    title: 'Vos accès, dans votre poche.',
    body: 'Tous vos billets et inscriptions, scannables hors-ligne. Plus besoin de papier.',
    placement: 'top',
    shape: 'rect',
    padding: 6,
  },
  {
    id: 'tab-profile',
    eyebrow: '05 · PROFIL',
    title: 'Votre espace personnel.',
    body: 'Réglages, paiements, notifications. Vous pouvez aussi devenir organisateur·ice depuis ici.',
    placement: 'top',
    shape: 'rect',
    padding: 6,
  },
];

/**
 * Localized version of MAIN_TABS_TOUR_STEPS. Use this from React components
 * with `useTranslation()` so the editorial eyebrows, titles, and bodies
 * are translated.
 */
export function getMainTabsTourSteps(t: TFunction): TourStep[] {
  const eyebrowKeys = [
    'eyebrow.tabDiscover',
    'eyebrow.tabSaved',
    'eyebrow.tabMessages',
    'eyebrow.tabTickets',
    'eyebrow.tabProfile',
  ];
  const titleKeys = [
    'componentsTour.mainDiscoverTitle',
    'componentsTour.mainSavedTitle',
    'componentsTour.mainMessagesTitle',
    'componentsTour.mainTicketsTitle',
    'componentsTour.mainProfileTitle',
  ];
  const bodyKeys = [
    'componentsTour.mainDiscoverBody',
    'componentsTour.mainSavedBody',
    'componentsTour.mainMessagesBody',
    'componentsTour.mainTicketsBody',
    'componentsTour.mainProfileBody',
  ];
  return MAIN_TABS_TOUR_STEPS.map((step, index) => ({
    ...step,
    eyebrow: t(eyebrowKeys[index]),
    title: t(titleKeys[index]),
    body: t(bodyKeys[index]),
  }));
}
