/**
 * Constantes de commission paiement — valeurs par défaut (Cameroun / XAF).
 * Le hook useCommissionConfig() charge les valeurs dynamiques depuis le backend.
 */

import { CommissionConfigResponse } from '../types';

export const COMMISSION_RATE = 0.05; // 5%
export const FIXED_FEE = 100; // XAF
export const CURRENCY_CODE = 'XAF';

/**
 * Calcule les frais de service pour un montant donne.
 *
 * Formule : `(amount * commission_rate) + fixed_fee`
 *
 * `amount` ET `fixed_fee` doivent etre dans la MEME devise. Cette
 * coherence est garantie cote backend : `useCommissionConfig` appelle
 * `/commissions/config/?country_code=XX&target_currency=YYY` qui convertit
 * `fixed_fee` dans `target_currency` (= event.currency) avant retour.
 * Sans `target_currency`, le frontend doit lui-meme s'assurer que
 * config.currency == event.currency.
 *
 * @param amount        Montant base dans la devise de l'event
 * @param config        Config commission (charge depuis le backend,
 *                      ideallement avec target_currency=event.currency)
 * @param eventCurrency Devise de l'event (utilisee pour defense-in-depth :
 *                      log warn si config.currency divergent).
 */
export function calculateServiceFee(
  amount: number,
  config?: CommissionConfigResponse | null,
  eventCurrency?: string,
): number {
  if (amount <= 0) return 0;
  const rate = config ? Number(config.commission_rate) : COMMISSION_RATE;
  const fixed = config ? Number(config.fixed_fee) : FIXED_FEE;

  // Sanity check : si on detecte un mismatch de devise (le frontend a
  // oublie target_currency), on log un warning mais on calcule quand meme.
  // Le backend convertit normalement → mismatch indique un bug d'integration.
  if (eventCurrency && config?.currency) {
    const configCurr = config.currency.toUpperCase();
    const eventCurr = eventCurrency.toUpperCase();
    if (configCurr !== eventCurr && __DEV__) {
      console.warn(
        `[calculateServiceFee] Devise mismatch : config=${configCurr} vs event=${eventCurr}. `
        + `Verifier que useCommissionConfig est appele avec target_currency.`,
      );
    }
  }

  return Math.round(amount * rate) + fixed;
}

/**
 * Label lisible pour les frais de service.
 * Affiche commission_rate + fixed_fee dans la devise event.
 *
 * Suppose que `config.currency == eventCurrency` (garanti via backend
 * `target_currency` query param dans useCommissionConfig).
 */
export function getServiceFeeLabel(
  config?: CommissionConfigResponse | null,
  eventCurrency?: string,
): string {
  const rate = config ? Number(config.commission_rate) : COMMISSION_RATE;
  const fixed = config ? Number(config.fixed_fee) : FIXED_FEE;
  // Devise affichee : event.currency en priorite (source de verite),
  // fallback sur config.currency, fallback final XAF.
  const displayCurrencyCode = (
    eventCurrency || config?.currency || CURRENCY_CODE
  ).toUpperCase();
  const displayCurrency =
    displayCurrencyCode === 'XAF' || displayCurrencyCode === 'XOF'
      ? 'FCFA'
      : displayCurrencyCode;

  // Format : "5% + 200 FCFA" (cas normal) ou "5%" (si fixed=0).
  const ratePart = `${(rate * 100).toFixed(0)}%`;
  if (fixed <= 0) return ratePart;
  return `${ratePart} + ${fixed.toLocaleString('fr-FR')} ${displayCurrency}`;
}

/** Label statique par défaut (rétrocompatibilité) */
export const SERVICE_FEE_LABEL = `${COMMISSION_RATE * 100}% + ${FIXED_FEE} ${CURRENCY_CODE}`;

/**
 * Renvoie un CODE d'erreur neutre (jamais le message brut du backend) pour un
 * écran de PAIEMENT anxiogène. Les écrans traduisent ce code via i18n
 * (getApiErrorMessage) et affichent un message rassurant.
 *
 * ⚠️ Ne JAMAIS renvoyer `data.detail`/`data.message`/`data.error` bruts au
 * payeur : jargon PSP, fuite de config, message anglais non traduit. Ce helper
 * n'a pas accès à `t` — il retourne donc un code neutre, résolu côté écran.
 *
 * @param data     Réponse API (ignorée : on ne lit plus le brut).
 * @param fallback Code neutre à retourner. Défaut : code d'échec paiement.
 */
export function extractErrorMessage(
  _data: any,
  fallback = 'errors.codes.paymentFailed',
): string {
  return fallback;
}
