/**
 * Tests de useCheckinQueue — file offline des scans de check-in.
 *
 * Le jour de l'event, hors réseau, on enfile les scans puis on flush au retour.
 * On couvre : enqueue + persistance, routage par `kind` vers la bonne API
 * (registration / ticket_purchase / booth_badge / session_attendance), drop
 * définitif sur 404/400, conservation en queue sur erreur réseau/5xx, clear,
 * et l'anti-réentrance du flush.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockVerifyAndCheckIn = jest.fn();
const mockVerifyAndCheckInTicket = jest.fn();
const mockVerifyAndCheckInBadge = jest.fn();
const mockScanAttendance = jest.fn();

jest.mock('../../api', () => ({
  registrationsAPI: {
    verifyAndCheckIn: (...a: any[]) => mockVerifyAndCheckIn(...a),
    verifyAndCheckInTicket: (...a: any[]) => mockVerifyAndCheckInTicket(...a),
  },
  sessionsAPI: {
    scanAttendance: (...a: any[]) => mockScanAttendance(...a),
  },
  exhibitorsAPI: {
    verifyAndCheckInBadge: (...a: any[]) => mockVerifyAndCheckInBadge(...a),
  },
}));

import { useCheckinQueue } from '../useCheckinQueue';

const QUEUE_KEY = 'eventez:checkin_queue:v1';

async function readQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockVerifyAndCheckIn.mockReset().mockResolvedValue({ data: {} });
  mockVerifyAndCheckInTicket.mockReset().mockResolvedValue({ data: {} });
  mockVerifyAndCheckInBadge.mockReset().mockResolvedValue({ data: {} });
  mockScanAttendance.mockReset().mockResolvedValue({ data: {} });
});

describe('enqueue', () => {
  it('persiste une entrée et incrémente pendingCount', async () => {
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => { await result.current.enqueue('reg-1', true, 'evt-1'); });

    await waitFor(() => expect(result.current.pendingCount).toBe(1));
    const q = await readQueue();
    expect(q[0]).toMatchObject({ registrationId: 'reg-1', autoCheckIn: true, eventId: 'evt-1', attempts: 0 });
    expect(q[0].localId).toBeTruthy();
    expect(q[0].scannedAt).toBeTruthy();
  });

  it('stocke kind + sessionId pour un scan de session', async () => {
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => {
      await result.current.enqueue('qr-code', false, 'evt-1', { kind: 'session_attendance', sessionId: 'ses-9' });
    });
    const q = await readQueue();
    expect(q[0]).toMatchObject({ kind: 'session_attendance', sessionId: 'ses-9' });
  });
});

describe('flush — routage par kind', () => {
  it('registration (défaut) → verifyAndCheckIn', async () => {
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => { await result.current.enqueue('reg-1', true); });
    let res: any;
    await act(async () => { res = await result.current.flush(); });

    expect(mockVerifyAndCheckIn).toHaveBeenCalledWith('reg-1', true);
    expect(res).toEqual({ synced: 1, failed: 0 });
    expect(await readQueue()).toEqual([]);
    await waitFor(() => expect(result.current.pendingCount).toBe(0));
  });

  it('ticket_purchase → verifyAndCheckInTicket', async () => {
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => { await result.current.enqueue('QR', true, 'e', { kind: 'ticket_purchase' }); });
    await act(async () => { await result.current.flush(); });
    expect(mockVerifyAndCheckInTicket).toHaveBeenCalledWith('QR', true);
  });

  it('booth_badge → verifyAndCheckInBadge', async () => {
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => { await result.current.enqueue('BADGE', true, 'e', { kind: 'booth_badge' }); });
    await act(async () => { await result.current.flush(); });
    expect(mockVerifyAndCheckInBadge).toHaveBeenCalledWith('BADGE', true);
  });

  it('session_attendance → scanAttendance(sessionId, code)', async () => {
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => {
      await result.current.enqueue('QR', true, 'e', { kind: 'session_attendance', sessionId: 'ses-1' });
    });
    await act(async () => { await result.current.flush(); });
    expect(mockScanAttendance).toHaveBeenCalledWith('ses-1', 'QR');
  });
});

describe('flush — gestion des erreurs', () => {
  it('404 → drop définitif (failed++, retiré de la queue)', async () => {
    mockVerifyAndCheckIn.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => { await result.current.enqueue('reg-x', true); });
    let res: any;
    await act(async () => { res = await result.current.flush(); });

    expect(res).toEqual({ synced: 0, failed: 1 });
    expect(await readQueue()).toEqual([]); // droppé
  });

  it('400 → drop définitif', async () => {
    mockVerifyAndCheckIn.mockRejectedValue({ response: { status: 400 } });
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => { await result.current.enqueue('reg-y', true); });
    let res: any;
    await act(async () => { res = await result.current.flush(); });
    expect(res.failed).toBe(1);
    expect(await readQueue()).toEqual([]);
  });

  it('erreur réseau/5xx → gardée en queue avec attempts+1', async () => {
    mockVerifyAndCheckIn.mockRejectedValue({ response: { status: 503 } });
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => { await result.current.enqueue('reg-z', true); });
    let res: any;
    await act(async () => { res = await result.current.flush(); });

    expect(res).toEqual({ synced: 0, failed: 0 });
    const q = await readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].attempts).toBe(1);
    await waitFor(() => expect(result.current.pendingCount).toBe(1));
  });

  it('flush partiel : synced pour l\'un, gardé pour l\'autre', async () => {
    mockVerifyAndCheckIn
      .mockResolvedValueOnce({ data: {} })                       // reg-ok
      .mockRejectedValueOnce({ response: { status: 500 } });      // reg-net
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => {
      await result.current.enqueue('reg-ok', true);
      await result.current.enqueue('reg-net', true);
    });
    let res: any;
    await act(async () => { res = await result.current.flush(); });

    expect(res.synced).toBe(1);
    const q = await readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].registrationId).toBe('reg-net');
  });

  it('flush sur queue vide → { synced: 0, failed: 0 }', async () => {
    const { result } = renderHook(() => useCheckinQueue());
    let res: any;
    await act(async () => { res = await result.current.flush(); });
    expect(res).toEqual({ synced: 0, failed: 0 });
  });
});

describe('clear', () => {
  it('vide la queue et remet pendingCount à 0', async () => {
    const { result } = renderHook(() => useCheckinQueue());
    await act(async () => {
      await result.current.enqueue('a', true);
      await result.current.enqueue('b', true);
    });
    await waitFor(() => expect(result.current.pendingCount).toBe(2));
    await act(async () => { await result.current.clear(); });
    expect(await readQueue()).toEqual([]);
    await waitFor(() => expect(result.current.pendingCount).toBe(0));
  });
});
