/**
 * Tests de usePaymentVerification — vérification de statut de paiement.
 *
 * Argent = zéro tolérance : on couvre le mapping des statuts des 3 gateways
 * (NotchPay, CinetPay v1 uppercase, CinetPay v2 legacy), le polling complet
 * (succès / échec / pending→retry / timeout), la gestion des erreurs
 * (temporaire → retry, échec définitif → onFailure, trop d'erreurs → stop) et
 * manualVerify. On injecte verifyFn pour ne pas toucher l'API réelle et on
 * pilote les timers avec les fake timers de Jest.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  usePaymentVerification,
  isPaymentSuccess,
  isPaymentFailed,
  PAYMENT_STATUS,
} from '../usePaymentVerification';

// ─── Parties pures : mapping des statuts des 3 gateways ─────────────────────
describe('PAYMENT_STATUS mapping', () => {
  it('NotchPay: complete = succès, failed/cancelled = échec', () => {
    expect(isPaymentSuccess('complete')).toBe(true);
    expect(isPaymentSuccess('completed')).toBe(true);
    expect(isPaymentFailed('failed')).toBe(true);
    expect(isPaymentFailed('cancelled')).toBe(true);
  });
  it('CinetPay v1 (uppercase normalisé): SUCCESS/FAILED', () => {
    expect(isPaymentSuccess('SUCCESS')).toBe(true);
    expect(isPaymentFailed('FAILED')).toBe(true);
  });
  it('CinetPay v2 legacy: accepted/refused', () => {
    expect(isPaymentSuccess('accepted')).toBe(true);
    expect(isPaymentFailed('refused')).toBe(true);
  });
  it('pending/processing ne sont ni succès ni échec', () => {
    expect(isPaymentSuccess('pending')).toBe(false);
    expect(isPaymentFailed('pending')).toBe(false);
    expect(isPaymentSuccess('processing')).toBe(false);
  });
  it('statut inconnu = ni succès ni échec', () => {
    expect(isPaymentSuccess('banana')).toBe(false);
    expect(isPaymentFailed('banana')).toBe(false);
  });
  it('les 3 ensembles sont disjoints', () => {
    const inter = (a: string[], b: string[]) => a.filter((x) => b.includes(x));
    expect(inter(PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FAILED)).toEqual([]);
    expect(inter(PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.PENDING)).toEqual([]);
    expect(inter(PAYMENT_STATUS.FAILED, PAYMENT_STATUS.PENDING)).toEqual([]);
  });
});

// ─── Polling ────────────────────────────────────────────────────────────────
describe('usePaymentVerification — polling', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('statut succès au 1er poll → completed + onSuccess', async () => {
    const onSuccess = jest.fn();
    const verifyFn = jest.fn().mockResolvedValue({ data: { status: 'completed' } });
    const { result } = renderHook(() =>
      usePaymentVerification({ verifyFn, onSuccess, pollInterval: 1000 }),
    );

    await act(async () => {
      result.current.startVerification('pay-1');
    });

    await waitFor(() => expect(result.current.status).toBe('completed'));
    expect(onSuccess).toHaveBeenCalledWith({ status: 'completed' });
    expect(verifyFn).toHaveBeenCalledTimes(1);
  });

  it('statut échec au 1er poll → failed + onFailure', async () => {
    const onFailure = jest.fn();
    const verifyFn = jest.fn().mockResolvedValue({ data: { status: 'failed', message: 'Fonds insuffisants' } });
    const { result } = renderHook(() =>
      usePaymentVerification({ verifyFn, onFailure, pollInterval: 1000 }),
    );

    await act(async () => { result.current.startVerification('pay-2'); });

    await waitFor(() => expect(result.current.status).toBe('failed'));
    // L'écran de paiement ne relaie JAMAIS le brut du PSP ("Fonds insuffisants") :
    // le hook renvoie un CODE i18n neutre, résolu en message rassurant par l'écran.
    expect(result.current.error).toBe('errors.codes.paymentVerifyFailed');
    expect(onFailure).toHaveBeenCalledWith('errors.codes.paymentVerifyFailed', expect.any(Object));
  });

  it('pending puis completed : re-poll après pollInterval', async () => {
    const verifyFn = jest.fn()
      .mockResolvedValueOnce({ data: { status: 'pending' } })
      .mockResolvedValueOnce({ data: { status: 'completed' } });
    const { result } = renderHook(() =>
      usePaymentVerification({ verifyFn, pollInterval: 5000 }),
    );

    await act(async () => { result.current.startVerification('pay-3'); });
    // 1er poll → pending
    await waitFor(() => expect(result.current.paymentStatus).toBe('pending'));
    expect(result.current.currentAttempt).toBe(1);

    // Avance le timer pour déclencher le 2e poll
    await act(async () => { jest.advanceTimersByTime(5000); });
    await waitFor(() => expect(result.current.status).toBe('completed'));
    expect(verifyFn).toHaveBeenCalledTimes(2);
  });

  it('timeout après maxAttempts pending → status timeout + onTimeout', async () => {
    const onTimeout = jest.fn();
    const verifyFn = jest.fn().mockResolvedValue({ data: { status: 'pending' } });
    const { result } = renderHook(() =>
      usePaymentVerification({ verifyFn, onTimeout, pollInterval: 1000, maxAttempts: 2 }),
    );

    await act(async () => { result.current.startVerification('pay-4'); });
    // poll1 pending (attempts→1), poll2 pending (attempts→2), poll3 pending → timeout
    await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    await waitFor(() => expect(result.current.status).toBe('timeout'));
    expect(onTimeout).toHaveBeenCalledWith('pending');
  });

  it('stopVerification arrête le polling → status stopped', async () => {
    const verifyFn = jest.fn().mockResolvedValue({ data: { status: 'pending' } });
    const { result } = renderHook(() =>
      usePaymentVerification({ verifyFn, pollInterval: 1000 }),
    );

    await act(async () => { result.current.startVerification('pay-5'); });
    await waitFor(() => expect(result.current.paymentStatus).toBe('pending'));

    act(() => { result.current.stopVerification(); });
    expect(result.current.status).toBe('stopped');

    const callsBefore = verifyFn.mock.calls.length;
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(verifyFn).toHaveBeenCalledTimes(callsBefore); // plus de nouveau poll
  });

  it('erreur définitive dans la réponse d\'erreur → failed', async () => {
    const onFailure = jest.fn();
    const verifyFn = jest.fn().mockRejectedValue({
      response: { data: { status: 'failed', message: 'Paiement refusé' } },
    });
    const { result } = renderHook(() =>
      usePaymentVerification({ verifyFn, onFailure, pollInterval: 1000 }),
    );

    await act(async () => { result.current.startVerification('pay-6'); });
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(onFailure).toHaveBeenCalled();
  });

  it('erreur réseau temporaire → retry (pas failed)', async () => {
    const verifyFn = jest.fn()
      .mockRejectedValueOnce({ code: 'ERR_NETWORK', message: 'Network Error' })
      .mockResolvedValueOnce({ data: { status: 'completed' } });
    const { result } = renderHook(() =>
      usePaymentVerification({ verifyFn, pollInterval: 1000 }),
    );

    await act(async () => { result.current.startVerification('pay-7'); });
    // 1re erreur temporaire → ne passe PAS en failed, reste en verifying
    await waitFor(() => expect(result.current.currentAttempt).toBe(1));
    expect(result.current.status).toBe('verifying');

    await act(async () => { jest.advanceTimersByTime(1000); });
    await waitFor(() => expect(result.current.status).toBe('completed'));
  });
});

// ─── manualVerify ─────────────────────────────────────────────────────────
describe('usePaymentVerification — manualVerify', () => {
  it('succès immédiat → { success: true }', async () => {
    const verifyFn = jest.fn().mockResolvedValue({ data: { status: 'completed' } });
    const { result } = renderHook(() => usePaymentVerification({ verifyFn }));

    let res: any;
    await act(async () => { res = await result.current.manualVerify('pay-8', 3, 0); });
    expect(res.success).toBe(true);
    expect(res.status).toBe('completed');
  });

  it('échec définitif → { success: false, error }', async () => {
    const verifyFn = jest.fn().mockResolvedValue({ data: { status: 'failed', message: 'Refusé' } });
    const { result } = renderHook(() => usePaymentVerification({ verifyFn }));

    let res: any;
    await act(async () => { res = await result.current.manualVerify('pay-9', 3, 0); });
    expect(res.success).toBe(false);
    expect(res.status).toBe('failed');
    // Code i18n neutre, pas le brut du PSP ("Refusé").
    expect(res.error).toBe('errors.codes.paymentVerifyFailed');
  });

  it('pending jusqu\'au bout → success false status pending', async () => {
    const verifyFn = jest.fn().mockResolvedValue({ data: { status: 'pending' } });
    const { result } = renderHook(() => usePaymentVerification({ verifyFn }));

    let res: any;
    await act(async () => { res = await result.current.manualVerify('pay-10', 2, 0); });
    expect(res.success).toBe(false);
    expect(res.status).toBe('pending');
    expect(verifyFn).toHaveBeenCalledTimes(2);
  });

  it('erreur au dernier essai → { success: false, status: error }', async () => {
    const verifyFn = jest.fn().mockRejectedValue({ response: { data: { detail: 'Serveur KO' } } });
    const { result } = renderHook(() => usePaymentVerification({ verifyFn }));

    let res: any;
    await act(async () => { res = await result.current.manualVerify('pay-11', 2, 0); });
    expect(res.success).toBe(false);
    expect(res.status).toBe('error');
    // Sur exception au dernier essai : code i18n neutre, jamais le detail DRF ("Serveur KO").
    expect(res.error).toBe('errors.codes.paymentVerifyFailed');
  });
});
