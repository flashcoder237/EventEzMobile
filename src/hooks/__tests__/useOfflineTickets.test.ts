/**
 * Tests de useOfflineTickets — cache hors-ligne des billets/QR.
 *
 * Fiabilité offline le jour de l'event : on couvre la mise en cache (QR base64
 * direct ET téléchargement), le skip si déjà caché, l'expiration 7 jours, le
 * get / getAll (tri par date), remove, clear, cacheMultiple séquentiel et
 * isTicketCached. AsyncStorage + NetInfo sont mockés globalement (jest.setup) ;
 * on mocke expo-file-system/legacy ici.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockDownloadAsync = jest.fn();
const mockReadAsStringAsync = jest.fn();
const mockDeleteAsync = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  downloadAsync: (...a: any[]) => mockDownloadAsync(...a),
  readAsStringAsync: (...a: any[]) => mockReadAsStringAsync(...a),
  deleteAsync: (...a: any[]) => mockDeleteAsync(...a),
}));

import { useOfflineTickets } from '../useOfflineTickets';

// Clés SCOPÉES par utilisateur (cf. useOfflineTickets). Hors AuthProvider,
// l'utilisateur est undefined → segment vide ('').
const INDEX_KEY = 'eventez_cached_tickets_index_';
const PREFIX = 'eventez_ticket__';

function makeTicket(id: string, overrides: any = {}) {
  return {
    id,
    registration: {
      id: `reg-${id}`,
      reference_code: `REF-${id}`,
      event: {
        id: `evt-${id}`,
        title: `Event ${id}`,
        start_date: '2026-08-01T10:00:00Z',
      },
    },
    ticket_type_name: 'VIP',
    quantity: 2,
    qr_code: 'data:image/png;base64,AAAA', // base64 direct → pas de download
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockDownloadAsync.mockReset();
  mockReadAsStringAsync.mockReset();
  mockDeleteAsync.mockReset();
});

async function mountReady() {
  const hook = renderHook(() => useOfflineTickets());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('cacheTicket', () => {
  it('met en cache un QR base64 direct (sans téléchargement)', async () => {
    const { result } = await mountReady();
    let ok: boolean = false;
    await act(async () => { ok = await result.current.cacheTicket(makeTicket('t1')); });

    expect(ok).toBe(true);
    expect(mockDownloadAsync).not.toHaveBeenCalled();
    const stored = JSON.parse((await AsyncStorage.getItem(`${PREFIX}t1`))!);
    expect(stored.qrCodeBase64).toBe('data:image/png;base64,AAAA');
    expect(stored.referenceCode).toBe('REF-t1');
    expect(stored.quantity).toBe(2);
    await waitFor(() => expect(result.current.cachedTicketCount).toBe(1));
  });

  it('télécharge et convertit le QR quand c\'est une URL', async () => {
    mockDownloadAsync.mockResolvedValue({ status: 200, uri: 'file:///cache/qr_t2.png' });
    mockReadAsStringAsync.mockResolvedValue('ZZZZ');
    mockDeleteAsync.mockResolvedValue(undefined);

    const { result } = await mountReady();
    let ok: boolean = false;
    await act(async () => {
      ok = await result.current.cacheTicket(makeTicket('t2', { qr_code: 'https://cdn/qr.png' }));
    });

    expect(ok).toBe(true);
    expect(mockDownloadAsync).toHaveBeenCalled();
    const stored = JSON.parse((await AsyncStorage.getItem(`${PREFIX}t2`))!);
    expect(stored.qrCodeBase64).toBe('data:image/png;base64,ZZZZ');
    expect(mockDeleteAsync).toHaveBeenCalled(); // fichier temp nettoyé
  });

  it('retourne false si le ticket n\'a pas de QR code', async () => {
    const { result } = await mountReady();
    let ok: boolean = true;
    await act(async () => {
      ok = await result.current.cacheTicket(makeTicket('t3', { qr_code: undefined }));
    });
    expect(ok).toBe(false);
  });

  it('skip le re-téléchargement si déjà caché (sans force)', async () => {
    mockDownloadAsync.mockResolvedValue({ status: 200, uri: 'file:///cache/qr.png' });
    mockReadAsStringAsync.mockResolvedValue('YY');
    const { result } = await mountReady();
    const url = makeTicket('t4', { qr_code: 'https://cdn/qr.png' });

    await act(async () => { await result.current.cacheTicket(url); });
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);

    // 2e appel → skip (déjà dans l'index)
    await act(async () => { await result.current.cacheTicket(url); });
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
  });

  it('utilise le slug de l\'event comme eventId s\'il existe', async () => {
    const { result } = await mountReady();
    const t = makeTicket('t5');
    t.registration.event = { ...t.registration.event, slug: 'mon-event' } as any;
    await act(async () => { await result.current.cacheTicket(t); });
    const stored = JSON.parse((await AsyncStorage.getItem(`${PREFIX}t5`))!);
    expect(stored.eventId).toBe('mon-event');
  });
});

describe('getCachedTicket / getAllCachedTickets', () => {
  it('récupère un ticket caché', async () => {
    const { result } = await mountReady();
    await act(async () => { await result.current.cacheTicket(makeTicket('g1')); });
    let t: any;
    await act(async () => { t = await result.current.getCachedTicket('g1'); });
    expect(t?.ticketId).toBe('g1');
  });

  it('retourne null pour un ticket absent', async () => {
    const { result } = await mountReady();
    let t: any = 'x';
    await act(async () => { t = await result.current.getCachedTicket('nope'); });
    expect(t).toBeNull();
  });

  it('getAll trie par date d\'événement croissante', async () => {
    const { result } = await mountReady();
    const early = makeTicket('early'); early.registration.event.start_date = '2026-07-01T10:00:00Z';
    const late = makeTicket('late'); late.registration.event.start_date = '2026-09-01T10:00:00Z';
    await act(async () => {
      await result.current.cacheTicket(late);
      await result.current.cacheTicket(early);
    });
    let all: any[] = [];
    await act(async () => { all = await result.current.getAllCachedTickets(); });
    expect(all.map((t) => t.ticketId)).toEqual(['early', 'late']);
  });
});

describe('remove / clear / cacheMultiple / isTicketCached', () => {
  it('removeCachedTicket supprime le ticket + l\'entrée d\'index', async () => {
    const { result } = await mountReady();
    await act(async () => { await result.current.cacheTicket(makeTicket('r1')); });
    await act(async () => { await result.current.removeCachedTicket('r1'); });

    expect(await AsyncStorage.getItem(`${PREFIX}r1`)).toBeNull();
    const idx = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || '{}');
    expect('r1' in idx).toBe(false);
    await waitFor(() => expect(result.current.cachedTicketCount).toBe(0));
  });

  it('clearCache vide tout', async () => {
    const { result } = await mountReady();
    await act(async () => {
      await result.current.cacheTicket(makeTicket('c1'));
      await result.current.cacheTicket(makeTicket('c2'));
    });
    await act(async () => { await result.current.clearCache(); });
    expect(await AsyncStorage.getItem(INDEX_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(`${PREFIX}c1`)).toBeNull();
    await waitFor(() => expect(result.current.cachedTicketCount).toBe(0));
  });

  it('cacheMultipleTickets met tout en cache et retourne le compte', async () => {
    const { result } = await mountReady();
    let synced = 0;
    await act(async () => {
      synced = await result.current.cacheMultipleTickets([
        makeTicket('m1'), makeTicket('m2'), makeTicket('m3'),
      ]);
    });
    expect(synced).toBe(3);
    await waitFor(() => expect(result.current.cachedTicketCount).toBe(3));
  });

  it('isTicketCached reflète l\'état du cache', async () => {
    const { result } = await mountReady();
    await act(async () => { await result.current.cacheTicket(makeTicket('i1')); });
    await waitFor(() => expect(result.current.isTicketCached('i1')).toBe(true));
    expect(result.current.isTicketCached('absent')).toBe(false);
  });
});

describe('expiration 7 jours', () => {
  it('purge les tickets expirés au chargement de l\'index', async () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const freshNow = Date.now();
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify({
      old: { registrationId: 'r', eventTitle: 'Old', eventDate: '2020-01-01', cachedAt: eightDaysAgo },
      fresh: { registrationId: 'r', eventTitle: 'Fresh', eventDate: '2026-08-01', cachedAt: freshNow },
    }));
    await AsyncStorage.setItem(`${PREFIX}old`, JSON.stringify({ ticketId: 'old' }));

    const { result } = await mountReady();

    await waitFor(() => expect(result.current.isTicketCached('fresh')).toBe(true));
    expect(result.current.isTicketCached('old')).toBe(false);
    // Le ticket expiré a été retiré du storage.
    expect(await AsyncStorage.getItem(`${PREFIX}old`)).toBeNull();
  });
});

describe('clearAllOfflineTickets (sécurité logout)', () => {
  it('purge TOUS les billets offline de TOUS les comptes', async () => {
    const { clearAllOfflineTickets } = require('../useOfflineTickets');
    // Simule des billets de 2 comptes différents + l'index de chacun.
    await AsyncStorage.setItem('eventez_ticket_42_t1', JSON.stringify({ ticketId: 't1' }));
    await AsyncStorage.setItem('eventez_ticket_99_t2', JSON.stringify({ ticketId: 't2' }));
    await AsyncStorage.setItem('eventez_cached_tickets_index_42', '{}');
    await AsyncStorage.setItem('eventez_cached_tickets_index_99', '{}');
    // Une clé non liée aux billets ne doit PAS être touchée.
    await AsyncStorage.setItem('autre_cle', 'garde-moi');

    await clearAllOfflineTickets();

    expect(await AsyncStorage.getItem('eventez_ticket_42_t1')).toBeNull();
    expect(await AsyncStorage.getItem('eventez_ticket_99_t2')).toBeNull();
    expect(await AsyncStorage.getItem('eventez_cached_tickets_index_42')).toBeNull();
    expect(await AsyncStorage.getItem('eventez_cached_tickets_index_99')).toBeNull();
    expect(await AsyncStorage.getItem('autre_cle')).toBe('garde-moi');
  });
});
