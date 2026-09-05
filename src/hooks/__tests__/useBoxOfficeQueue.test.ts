/**
 * Tests de useBoxOfficeQueue — file offline des VENTES au guichet.
 *
 * La regle centrale, et ce qui distingue cette file de celle des scans :
 * UNE VENTE N'EST JAMAIS SUPPRIMEE. La caissiere a physiquement les
 * billets de banque dans sa sacoche ; si l'entree disparait du telephone,
 * l'argent existe toujours mais plus la trace — le soir le compte ne
 * tombe pas juste, et c'est elle qu'on regarde.
 *
 * On couvre : mise en file + persistance, idempotence locale (double-tap),
 * reutilisation de la cle au flush, deplacement vers le bac « a regler »
 * plutot que suppression, conservation en file sur erreur reseau, et
 * cloisonnement entre deux evenements le meme jour.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockSell = jest.fn();

jest.mock('../../api/boxOffice', () => ({
  boxOfficeAPI: {
    sell: (...a: any[]) => mockSell(...a),
  },
}));

let netListener: ((s: any) => void) | null = null;
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: (cb: (s: any) => void) => {
    netListener = cb;
    return () => { netListener = null; };
  },
}));

import { useBoxOfficeQueue } from '../useBoxOfficeQueue';

const QUEUE_KEY = 'eventez:box_office_queue:v1';
const FAILED_KEY = 'eventez:box_office_failed:v1';

const sale = (overrides: any = {}) => ({
  clientSaleId: 'sale-1',
  drawerId: 'drawer-1',
  eventId: 'event-1',
  items: [{ ticket_type: 'tt-1', quantity: 1 }],
  paymentMethod: 'cash' as const,
  amount: 2000,
  ...overrides,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('useBoxOfficeQueue', () => {
  it('met une vente en file et la persiste', async () => {
    const { result } = renderHook(() => useBoxOfficeQueue('event-1'));
    await act(async () => { await result.current.enqueue(sale()); });

    await waitFor(() => expect(result.current.pendingCount).toBe(1));
    expect(result.current.pendingAmount).toBe(2000);

    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    expect(JSON.parse(raw!)).toHaveLength(1);
  });

  it('ignore un double-tap sur la meme vente', async () => {
    const { result } = renderHook(() => useBoxOfficeQueue('event-1'));
    await act(async () => {
      await result.current.enqueue(sale());
      await result.current.enqueue(sale());
    });

    await waitFor(() => expect(result.current.pendingCount).toBe(1));
  });

  it('reutilise la cle d idempotence au flush', async () => {
    mockSell.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useBoxOfficeQueue('event-1'));
    await act(async () => { await result.current.enqueue(sale()); });
    await act(async () => { await result.current.flush(); });

    expect(mockSell).toHaveBeenCalledWith(
      expect.objectContaining({ clientSaleId: 'sale-1' })
    );
    await waitFor(() => expect(result.current.pendingCount).toBe(0));
  });

  it('NE SUPPRIME PAS une vente en echec definitif : elle passe « a regler »', async () => {
    // C'est LE test qui distingue cette file de celle des scans.
    mockSell.mockRejectedValue({
      response: { status: 400, data: { detail: 'Stock epuise' } },
    });
    const { result } = renderHook(() => useBoxOfficeQueue('event-1'));
    await act(async () => { await result.current.enqueue(sale()); });
    await act(async () => { await result.current.flush(); });

    await waitFor(() => expect(result.current.failedCount).toBe(1));
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.failed[0].failureReason).toContain('Stock');

    // Et surtout : la trace existe toujours en stockage.
    const raw = await AsyncStorage.getItem(FAILED_KEY);
    expect(JSON.parse(raw!)).toHaveLength(1);
  });

  it('garde la vente en file sur erreur reseau', async () => {
    mockSell.mockRejectedValue({ message: 'Network Error' });
    const { result } = renderHook(() => useBoxOfficeQueue('event-1'));
    await act(async () => { await result.current.enqueue(sale()); });
    await act(async () => { await result.current.flush(); });

    await waitFor(() => expect(result.current.pendingCount).toBe(1));
    expect(result.current.failedCount).toBe(0);
    expect(result.current.pending[0].attempts).toBe(1);
  });

  it('ne melange pas deux evenements du meme jour', async () => {
    const { result } = renderHook(() => useBoxOfficeQueue('event-1'));
    await act(async () => {
      await result.current.enqueue(sale({ clientSaleId: 'a' }));
      await result.current.enqueue(
        sale({ clientSaleId: 'b', eventId: 'event-2' })
      );
    });

    // La caisse de l'event-1 ne doit compter que SES ventes.
    await waitFor(() => expect(result.current.pendingCount).toBe(1));
    expect(result.current.pendingAmount).toBe(2000);
  });

  it('flush automatiquement au retour du reseau', async () => {
    mockSell.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useBoxOfficeQueue('event-1'));
    await act(async () => { await result.current.enqueue(sale()); });

    await act(async () => { netListener?.({ isConnected: true }); });

    await waitFor(() => expect(mockSell).toHaveBeenCalled());
  });
});
