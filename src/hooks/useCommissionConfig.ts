/**
 * Hook pour récupérer la configuration de commission dynamique par pays.
 * Remplace les valeurs hardcodées de constants/payment.ts quand le backend répond.
 */

import { useState, useEffect } from 'react';
import { commissionsAPI } from '../api';
import { CommissionConfigResponse } from '../types';
import {
  COMMISSION_RATE as DEFAULT_RATE,
  FIXED_FEE as DEFAULT_FEE,
  CURRENCY_CODE as DEFAULT_CURRENCY,
} from '../constants/payment';

interface CommissionConfig {
  config: CommissionConfigResponse | null;
  currency: string;
  commissionRate: number;
  fixedFee: number;
  isLoading: boolean;
  isError: boolean;
}

/**
 * @param countryCode    Code ISO du pays event (CM, FR, etc.). Defaut = pays backend.
 * @param targetCurrency Devise cible (typiquement event.currency). Si fournie ET
 *                       differente de la devise de la commission du pays, le
 *                       backend convertit `fixed_fee` dans la devise cible.
 *                       Sans ça, on aurait un fixed_fee en XAF affiche dans un
 *                       event EUR (cas du fallback backend quand le pays event
 *                       n'a pas de CommissionConfig dediee).
 */
export function useCommissionConfig(
  countryCode?: string,
  targetCurrency?: string,
): CommissionConfig {
  const [config, setConfig] = useState<CommissionConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchConfig = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const res = await commissionsAPI.getConfig(countryCode, targetCurrency);
        if (!cancelled) {
          setConfig(res.data);
        }
      } catch {
        if (!cancelled) {
          setIsError(true);
          setConfig(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchConfig();
    return () => { cancelled = true; };
  }, [countryCode, targetCurrency]);

  return {
    config,
    currency: config?.currency ?? DEFAULT_CURRENCY,
    commissionRate: config ? Number(config.commission_rate) : DEFAULT_RATE,
    fixedFee: config ? Number(config.fixed_fee) : DEFAULT_FEE,
    isLoading,
    isError,
  };
}
