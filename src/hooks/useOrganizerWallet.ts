/**
 * Hook pour recuperer le OrganizerWallet de l'utilisateur courant.
 *
 * Utilise notamment a la creation d'evenement pour afficher la devise
 * heritee (strategie "Event mono-devise", docs/CURRENCY_STRATEGY.md).
 */

import { useEffect, useState } from 'react';
import { walletAPI } from '../api';

interface OrganizerWalletState {
  currency: string;
  country: string;
  available_balance?: number;
  pending_balance?: number;
  isLoading: boolean;
  isError: boolean;
}

const DEFAULT: OrganizerWalletState = {
  currency: 'XAF',
  country: 'CM',
  isLoading: true,
  isError: false,
};

export function useOrganizerWallet(): OrganizerWalletState {
  const [state, setState] = useState<OrganizerWalletState>(DEFAULT);

  useEffect(() => {
    let cancelled = false;

    const fetchWallet = async () => {
      try {
        const res: any = await walletAPI.getMyWallet();
        const data = res?.data ?? res;
        if (cancelled) return;
        setState({
          currency: (data?.currency || 'XAF').toUpperCase(),
          country: (data?.country || 'CM').toUpperCase(),
          available_balance: Number(data?.available_balance ?? 0),
          pending_balance: Number(data?.pending_balance ?? 0),
          isLoading: false,
          isError: false,
        });
      } catch {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isLoading: false, isError: true }));
        }
      }
    };

    fetchWallet();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
