/**
 * Constantes de commission paiement — valeurs par défaut (Cameroun / XAF).
 * Le hook useCommissionConfig() charge les valeurs dynamiques depuis le backend.
 */

import { CommissionConfigResponse } from '../types';

export const COMMISSION_RATE = 0.05; // 5%
export const FIXED_FEE = 100; // XAF
export const CURRENCY_CODE = 'XAF';

/** Calcule les frais de service pour un montant donné, avec config dynamique optionnelle */
export function calculateServiceFee(
  amount: number,
  config?: CommissionConfigResponse | null,
): number {
  if (amount <= 0) return 0;
  const rate = config ? Number(config.commission_rate) : COMMISSION_RATE;
  const fixed = config ? Number(config.fixed_fee) : FIXED_FEE;
  return Math.round(amount * rate) + fixed;
}

/** Label lisible pour les frais de service, avec config dynamique optionnelle */
export function getServiceFeeLabel(config?: CommissionConfigResponse | null): string {
  const rate = config ? Number(config.commission_rate) : COMMISSION_RATE;
  const fixed = config ? Number(config.fixed_fee) : FIXED_FEE;
  const currency = config?.currency || CURRENCY_CODE;
  return `${(rate * 100).toFixed(0)}% + ${fixed} ${currency}`;
}

/** Label statique par défaut (rétrocompatibilité) */
export const SERVICE_FEE_LABEL = `${COMMISSION_RATE * 100}% + ${FIXED_FEE} ${CURRENCY_CODE}`;

/**
 * Extrait un message d'erreur lisible depuis une réponse API.
 */
export function extractErrorMessage(data: any, fallback = 'Une erreur est survenue'): string {
  if (!data) return fallback;
  return data.detail || data.message || data.error || fallback;
}
