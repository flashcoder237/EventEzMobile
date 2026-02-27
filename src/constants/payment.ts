/**
 * Constantes de commission paiement — source unique de vérité pour le mobile.
 * Le backend reste l'autorité finale (ces valeurs sont indicatives pour l'affichage).
 */
export const COMMISSION_RATE = 0.05; // 5%
export const FIXED_FEE = 100; // XAF
export const CURRENCY_CODE = 'XAF';

/** Calcule les frais de service pour un montant donné */
export function calculateServiceFee(amount: number): number {
  if (amount <= 0) return 0;
  return Math.round(amount * COMMISSION_RATE) + FIXED_FEE;
}

/** Label lisible pour les frais de service */
export const SERVICE_FEE_LABEL = `${COMMISSION_RATE * 100}% + ${FIXED_FEE} ${CURRENCY_CODE}`;

/**
 * Extrait un message d'erreur lisible depuis une réponse API.
 * Ordre cohérent: detail → message → error → fallback.
 */
export function extractErrorMessage(data: any, fallback = 'Une erreur est survenue'): string {
  if (!data) return fallback;
  return data.detail || data.message || data.error || fallback;
}
