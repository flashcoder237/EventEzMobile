/**
 * Tests de useCommissionConfig + useOrganizerWallet — hooks "argent affiché".
 *
 * Ces hooks alimentent les frais montrés à l'organisateur et la devise héritée
 * (stratégie Event mono-devise). On couvre : succès (mapping/normalisation),
 * fallback sûr sur erreur, et passage des bons paramètres à l'API.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

const mockGetConfig = jest.fn();
const mockGetMyWallet = jest.fn();
jest.mock('../../api', () => ({
  commissionsAPI: { getConfig: (...a: any[]) => mockGetConfig(...a) },
  walletAPI: { getMyWallet: (...a: any[]) => mockGetMyWallet(...a) },
}));

import { useCommissionConfig } from '../useCommissionConfig';
import { useOrganizerWallet } from '../useOrganizerWallet';

beforeEach(() => {
  mockGetConfig.mockReset();
  mockGetMyWallet.mockReset();
});

describe('useCommissionConfig', () => {
  it('utilise la config backend quand elle répond', async () => {
    mockGetConfig.mockResolvedValue({
      data: { currency: 'EUR', commission_rate: '0.03', fixed_fee: '50' },
    });
    const { result } = renderHook(() => useCommissionConfig('FR', 'EUR'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currency).toBe('EUR');
    expect(result.current.commissionRate).toBe(0.03);
    expect(result.current.fixedFee).toBe(50);
    expect(result.current.isError).toBe(false);
  });

  it('transmet countryCode / targetCurrency / organizerId à l\'API', async () => {
    mockGetConfig.mockResolvedValue({ data: { currency: 'XAF', commission_rate: '0.05', fixed_fee: '100' } });
    renderHook(() => useCommissionConfig('CM', 'XAF', 42));
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalledWith('CM', 'XAF', 42));
  });

  it('retombe sur les défauts (5% / 100 / XAF) en cas d\'erreur', async () => {
    mockGetConfig.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useCommissionConfig('CM'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.commissionRate).toBe(0.05);
    expect(result.current.fixedFee).toBe(100);
    expect(result.current.currency).toBe('XAF');
    expect(result.current.config).toBeNull();
  });
});

describe('useOrganizerWallet', () => {
  it('mappe et normalise (devise/pays en majuscules, soldes numériques)', async () => {
    mockGetMyWallet.mockResolvedValue({
      data: { currency: 'eur', country: 'fr', available_balance: '1500.5', pending_balance: '200' },
    });
    const { result } = renderHook(() => useOrganizerWallet());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currency).toBe('EUR');
    expect(result.current.country).toBe('FR');
    expect(result.current.available_balance).toBe(1500.5);
    expect(result.current.pending_balance).toBe(200);
    expect(result.current.isError).toBe(false);
  });

  it('fallback XAF/CM + isError sur erreur API', async () => {
    mockGetMyWallet.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useOrganizerWallet());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.currency).toBe('XAF');
    expect(result.current.country).toBe('CM');
  });

  it('accepte une réponse sans enveloppe .data', async () => {
    // Le hook gère res.data ?? res.
    mockGetMyWallet.mockResolvedValue({ currency: 'usd', country: 'us' });
    const { result } = renderHook(() => useOrganizerWallet());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currency).toBe('USD');
    expect(result.current.country).toBe('US');
  });

  it('valeurs manquantes → soldes à 0', async () => {
    mockGetMyWallet.mockResolvedValue({ data: { currency: 'XAF', country: 'CM' } });
    const { result } = renderHook(() => useOrganizerWallet());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.available_balance).toBe(0);
    expect(result.current.pending_balance).toBe(0);
  });
});
