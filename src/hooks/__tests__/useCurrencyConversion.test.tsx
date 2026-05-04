/**
 * Tests du hook useCurrencyConversion (mobile).
 *
 * Regression test : "≈ 0 EUR" ne doit plus apparaitre pour un montant valide.
 * Le bug venait d'utiliser `converted_amount` (quantize 2 decimales par le backend)
 * au lieu de `rate` (precision complete). Pour XAF->EUR (rate=0.00152), le
 * converted_amount de 1 XAF s'arrondit a 0.00, ce qui casse les multiplications.
 */
import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';

jest.mock('../../api', () => ({
  currencyAPI: {
    convert: jest.fn(),
  },
}));

import { currencyAPI } from '../../api';
import { useCurrencyConversion } from '../useCurrencyConversion';

const mockConvert = currencyAPI.convert as jest.MockedFunction<
  typeof currencyAPI.convert
>;

function setLocale(locale: string) {
  const original = Intl.DateTimeFormat.prototype.resolvedOptions;
  Intl.DateTimeFormat.prototype.resolvedOptions = function () {
    return { ...original.call(this), locale } as any;
  };
  return () => {
    Intl.DateTimeFormat.prototype.resolvedOptions = original;
  };
}

describe('useCurrencyConversion (mobile)', () => {
  let restoreLocale: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (restoreLocale) {
      restoreLocale();
      restoreLocale = null;
    }
  });

  it('skips conversion when event currency matches detected user currency', async () => {
    restoreLocale = setLocale('fr-FR'); // EUR

    const { result } = renderHook(() => useCurrencyConversion('EUR'));

    expect(result.current.userCurrency).toBeNull();
    expect(result.current.convertedPrice(1000)).toBeNull();
    expect(mockConvert).not.toHaveBeenCalled();
  });

  it('converts XAF -> EUR with full-precision rate (regression "≈ 0 EUR")', async () => {
    restoreLocale = setLocale('fr-FR');
    mockConvert.mockResolvedValueOnce({
      data: {
        converted_amount: 0.0, // backend quantize a 0 pour 1 XAF
        rate: 0.00152, // taux reel non quantize
        from_currency: 'XAF',
        to_currency: 'EUR',
      },
    } as any);

    const { result } = renderHook(() => useCurrencyConversion('XAF'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.userCurrency).toBe('EUR');
    // 5000 XAF * 0.00152 = 7.6 EUR (pas 0)
    const out = result.current.convertedPrice(5000);
    expect(out).not.toBeNull();
    expect(out).toMatch(/EUR/);
    expect(out).not.toMatch(/≈ 0 EUR/);
  });

  it('returns null when converted amount is below 0.01 (avoid "≈ 0 EUR")', async () => {
    restoreLocale = setLocale('fr-FR');
    mockConvert.mockResolvedValueOnce({
      data: { converted_amount: 0, rate: 0.00152, from_currency: 'XAF', to_currency: 'EUR' },
    } as any);

    const { result } = renderHook(() => useCurrencyConversion('XAF'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // 1 * 0.00152 = 0.00152 < 0.01 -> null
    expect(result.current.convertedPrice(1)).toBeNull();
  });

  it('returns null for zero or negative amount', async () => {
    restoreLocale = setLocale('fr-FR');
    mockConvert.mockResolvedValueOnce({
      data: { converted_amount: 1.52, rate: 0.00152, from_currency: 'XAF', to_currency: 'EUR' },
    } as any);

    const { result } = renderHook(() => useCurrencyConversion('XAF'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.convertedPrice(0)).toBeNull();
    expect(result.current.convertedPrice(-100)).toBeNull();
  });

  it('silently fails when API rejects (returns null convertedPrice)', async () => {
    restoreLocale = setLocale('fr-FR');
    mockConvert.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCurrencyConversion('XAF'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.convertedPrice(5000)).toBeNull();
  });

  it('handles rate=0 from API (bad data) without crashing', async () => {
    restoreLocale = setLocale('fr-FR');
    mockConvert.mockResolvedValueOnce({
      data: { converted_amount: 0, rate: 0, from_currency: 'XAF', to_currency: 'EUR' },
    } as any);

    const { result } = renderHook(() => useCurrencyConversion('XAF'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.convertedPrice(10000)).toBeNull();
  });

  it('detects fr-CM locale -> XAF (exact match, no conversion needed for XAF event)', async () => {
    restoreLocale = setLocale('fr-CM');

    const { result } = renderHook(() => useCurrencyConversion('XAF'));

    expect(result.current.userCurrency).toBeNull();
    expect(mockConvert).not.toHaveBeenCalled();
  });

  it('falls back to EUR for unknown French locale (fr-XX)', async () => {
    restoreLocale = setLocale('fr-XX');
    mockConvert.mockResolvedValueOnce({
      data: { converted_amount: 1.52, rate: 0.00152, from_currency: 'XAF', to_currency: 'EUR' },
    } as any);

    const { result } = renderHook(() => useCurrencyConversion('XAF'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.userCurrency).toBe('EUR');
  });

  it('returns null user currency when locale detection fails', async () => {
    restoreLocale = setLocale('xx-YY'); // langue non repertoriee

    const { result } = renderHook(() => useCurrencyConversion('EUR'));

    expect(result.current.userCurrency).toBeNull();
  });

  it('infers EUR from country code for mixed locale en-FR (regression fr/en in France)', async () => {
    restoreLocale = setLocale('en-FR'); // anglophone vivant en France
    mockConvert.mockResolvedValueOnce({
      data: { converted_amount: 1.52, rate: 0.00152, from_currency: 'XAF', to_currency: 'EUR' },
    } as any);

    const { result } = renderHook(() => useCurrencyConversion('XAF'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Sans le fallback pays, ce locale tombait sur lang=en → USD, ce qui est faux.
    // Maintenant la pays FR prend le pas → EUR.
    expect(result.current.userCurrency).toBe('EUR');
    expect(result.current.convertedPrice(5000)).toMatch(/EUR/);
  });

  it('infers KES from country code for mixed locale fr-KE', async () => {
    restoreLocale = setLocale('fr-KE'); // francophone au Kenya
    mockConvert.mockResolvedValueOnce({
      data: { converted_amount: 0.5, rate: 0.001, from_currency: 'XAF', to_currency: 'KES' },
    } as any);

    const { result } = renderHook(() => useCurrencyConversion('XAF'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.userCurrency).toBe('KES');
  });
});
