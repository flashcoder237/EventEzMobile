/**
 * Payment tour — fires on first visit to PaymentScreen. Two steps : payment
 * method selector and the total + pay CTA. Helps users understand the dual-
 * gateway routing (Mobile Money local vs Stripe international cards).
 *
 * Bump PAYMENT_TOUR_STORAGE_KEY when adding steps.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

export const PAYMENT_TOUR_STORAGE_KEY = 'eventez_tour_payment_v1_seen';
export const PAYMENT_TOUR_DELAY_MS = 1500;

export function getPaymentTourSteps(t: TFunction): TourStep[] {
  return [
    {
      id: 'payment-methods',
      eyebrow: t('paymentTour.methodsEyebrow'),
      title: t('paymentTour.methodsTitle'),
      body: t('paymentTour.methodsBody'),
      placement: 'bottom',
      shape: 'rect',
      padding: 8,
    },
    {
      id: 'payment-cta',
      eyebrow: t('paymentTour.ctaEyebrow'),
      title: t('paymentTour.ctaTitle'),
      body: t('paymentTour.ctaBody'),
      placement: 'top',
      shape: 'rect',
      padding: 8,
    },
  ];
}
