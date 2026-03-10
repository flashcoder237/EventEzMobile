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

export function useCommissionConfig(countryCode?: string): CommissionConfig {
  const [config, setConfig] = useState<CommissionConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchConfig = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const res = await commissionsAPI.getConfig(countryCode);
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
  }, [countryCode]);

  return {
    config,
    currency: config?.currency ?? DEFAULT_CURRENCY,
    commissionRate: config ? Number(config.commission_rate) : DEFAULT_RATE,
    fixedFee: config ? Number(config.fixed_fee) : DEFAULT_FEE,
    isLoading,
    isError,
  };
}
