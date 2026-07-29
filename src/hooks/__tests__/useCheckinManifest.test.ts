/**
 * Tests de useCheckinManifest — validation check-in offline via manifeste local.
 *
 * On télécharge une fois la liste des billets valides, puis on vérifie chaque
 * QR LOCALEMENT (vrai vert/rouge à la porte, sans réseau). Couverture :
 * download + persistance, verifyTicket (valid / already / unknown), recordCheckin
 * (marque local + reflète "déjà validé" au re-scan), hydratation depuis le cache,
 * et syncNow (push serveur + purge local, conservation si échec).
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGetCheckinManifest = jest.fn();
const mockSyncCheckins = jest.fn();
jest.mock('../../api', () => ({
  registrationsAPI: {
    getCheckinManifest: (...a: any[]) => mockGetCheckinManifest(...a),
    syncCheckins: (...a: any[]) => mockSyncCheckins(...a),
  },
}));

import { useCheckinManifest } from '../useCheckinManifest';

const manifestKey = (e: string) => `eventez:manifest:${e}:v1`;
const localKey = (e: string) => `eventez:manifest_local:${e}:v1`;

const SAMPLE = {
  generated_at: '2026-08-01T09:00:00Z',
  tickets: [
    { ticket_id: 'TK1', holder_name: 'Alice', ticket_type: 'VIP', reference: 'R1', is_checked_in: false },
    { ticket_id: 'TK2', holder_name: 'Bob', ticket_type: 'Std', reference: 'R2', is_checked_in: true },
  ],
};

beforeEach(async () => {
  await AsyncStorage.clear();
  mockGetCheckinManifest.mockReset().mockResolvedValue({ data: SAMPLE });
  mockSyncCheckins.mockReset().mockResolvedValue({ data: { applied: 1 } });
});

describe('download', () => {
  it('télécharge, indexe et persiste le manifeste', async () => {
    const { result } = renderHook(() => useCheckinManifest('evt-1'));
    await act(async () => { await result.current.download(); });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.count).toBe(2);
    expect(result.current.downloadedAt).toBe('2026-08-01T09:00:00Z');
    const stored = JSON.parse((await AsyncStorage.getItem(manifestKey('evt-1')))!);
    expect(Object.keys(stored.tickets)).toEqual(['TK1', 'TK2']);
  });
});

describe('verifyTicket', () => {
  it('billet présent non validé → valid + infos porteur', async () => {
    const { result } = renderHook(() => useCheckinManifest('evt-1'));
    await act(async () => { await result.current.download(); });
    const r = result.current.verifyTicket('TK1');
    expect(r.status).toBe('valid');
    expect(r.holderName).toBe('Alice');
    expect(r.ticketType).toBe('VIP');
  });

  it('billet déjà validé côté manifeste → already', async () => {
    const { result } = renderHook(() => useCheckinManifest('evt-1'));
    await act(async () => { await result.current.download(); });
    expect(result.current.verifyTicket('TK2').status).toBe('already');
  });

  it('billet absent → unknown (forgé/invalide)', async () => {
    const { result } = renderHook(() => useCheckinManifest('evt-1'));
    await act(async () => { await result.current.download(); });
    expect(result.current.verifyTicket('FAKE').status).toBe('unknown');
  });
});

describe('recordCheckin', () => {
  it('marque un billet localement + reflète "déjà validé" au re-scan', async () => {
    const { result } = renderHook(() => useCheckinManifest('evt-1'));
    await act(async () => { await result.current.download(); });

    // Avant : valide
    expect(result.current.verifyTicket('TK1').status).toBe('valid');

    await act(async () => { await result.current.recordCheckin('TK1'); });

    // Après : déjà validé sur ce device + compteur de sync
    expect(result.current.verifyTicket('TK1').status).toBe('already');
    await waitFor(() => expect(result.current.pendingSyncCount).toBe(1));
    const local = JSON.parse((await AsyncStorage.getItem(localKey('evt-1')))!);
    expect('TK1' in local).toBe(true);
  });
});

describe('hydratation depuis le cache', () => {
  it('recharge manifeste + check-ins locaux au mount (offline resilient)', async () => {
    await AsyncStorage.setItem(manifestKey('evt-2'), JSON.stringify({
      generated_at: '2026-08-01T08:00:00Z',
      tickets: { TKA: { holder_name: 'Zoe', is_checked_in: false } },
    }));
    await AsyncStorage.setItem(localKey('evt-2'), JSON.stringify({ TKB: '2026-08-01T10:00:00Z' }));

    const { result } = renderHook(() => useCheckinManifest('evt-2'));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.count).toBe(1);
    expect(result.current.verifyTicket('TKA').holderName).toBe('Zoe');
    expect(result.current.pendingSyncCount).toBe(1);
  });
});

describe('syncNow', () => {
  it('pousse les check-ins locaux puis purge le local', async () => {
    const { result } = renderHook(() => useCheckinManifest('evt-1'));
    await act(async () => { await result.current.download(); });
    await act(async () => { await result.current.recordCheckin('TK1'); });

    await act(async () => { await result.current.syncNow(); });

    expect(mockSyncCheckins).toHaveBeenCalledWith('evt-1', [
      expect.objectContaining({ ticket_id: 'TK1' }),
    ]);
    await waitFor(() => expect(result.current.pendingSyncCount).toBe(0));
    const local = JSON.parse((await AsyncStorage.getItem(localKey('evt-1')))!);
    expect(local).toEqual({});
  });

  it('conserve les entrées si la sync échoue', async () => {
    mockSyncCheckins.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useCheckinManifest('evt-1'));
    await act(async () => { await result.current.download(); });
    await act(async () => { await result.current.recordCheckin('TK1'); });

    await act(async () => { await result.current.syncNow(); });

    // Toujours en attente pour la prochaine tentative.
    await waitFor(() => expect(result.current.pendingSyncCount).toBe(1));
  });

  it('syncNow ne fait rien si aucun check-in local', async () => {
    const { result } = renderHook(() => useCheckinManifest('evt-1'));
    await act(async () => { await result.current.download(); });
    await act(async () => { await result.current.syncNow(); });
    expect(mockSyncCheckins).not.toHaveBeenCalled();
  });
});
