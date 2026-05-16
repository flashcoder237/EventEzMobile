/**
 * Scanner tour — fired on first visit to QRScannerScreen. Explains the
 * offline-resilient check-in behavior and the scan UX before the organizer
 * starts using the scanner for real.
 *
 * Bump SCANNER_TOUR_STORAGE_KEY when adding steps.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

export const SCANNER_TOUR_STORAGE_KEY = 'eventez_tour_scanner_v1_seen';
// 1.5s after permission granted. The CameraView itself takes a moment to
// initialize on Android; firing too early would race the scan-frame layout.
export const SCANNER_TOUR_DELAY_MS = 1500;

export function getScannerTourSteps(t: TFunction): TourStep[] {
  return [
    {
      id: 'scanner-frame',
      eyebrow: t('scannerTour.scanEyebrow'),
      title: t('scannerTour.scanTitle'),
      body: t('scannerTour.scanBody'),
      placement: 'bottom',
      shape: 'rect',
      padding: 12,
    },
  ];
}
