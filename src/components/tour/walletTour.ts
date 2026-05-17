/**
 * Wallet tour — fires on first visit to WalletScreen for organizers. Three
 * steps : balance display, withdraw button, transactions list. Educates on
 * the wallet → payout flow.
 *
 * Bump WALLET_TOUR_STORAGE_KEY when adding steps.
 */

import type { TFunction } from 'i18next';
import type { TourStep } from './FeatureTourContext';

export const WALLET_TOUR_STORAGE_KEY = 'eventez_tour_wallet_v1_seen';
export const WALLET_TOUR_DELAY_MS = 1500;

export function getWalletTourSteps(t: TFunction): TourStep[] {
  return [
    {
      id: 'wallet-balance',
      eyebrow: t('walletTour.balanceEyebrow'),
      title: t('walletTour.balanceTitle'),
      body: t('walletTour.balanceBody'),
      placement: 'bottom',
      shape: 'rect',
      padding: 8,
    },
    {
      id: 'wallet-withdraw',
      eyebrow: t('walletTour.withdrawEyebrow'),
      title: t('walletTour.withdrawTitle'),
      body: t('walletTour.withdrawBody'),
      placement: 'bottom',
      shape: 'rect',
      padding: 8,
    },
    {
      id: 'wallet-transactions',
      eyebrow: t('walletTour.transactionsEyebrow'),
      title: t('walletTour.transactionsTitle'),
      body: t('walletTour.transactionsBody'),
      placement: 'top',
      shape: 'rect',
      padding: 6,
    },
  ];
}
