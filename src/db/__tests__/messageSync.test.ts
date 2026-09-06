/**
 * Tests du moteur de synchro delta (messageSync).
 *
 * On mocke le repository (SQLite) et l'API : on teste la LOGIQUE d'orchestration
 * — curseur lu/écrit, delta appliqué, bouclage sur has_more, idempotence.
 */
import { syncConversation } from '../messageSync';

// Mocks
jest.mock('../messageRepository', () => ({
  getSyncCursor: jest.fn(),
  setSyncCursor: jest.fn(),
  upsertMessages: jest.fn(),
  pruneConversationHistory: jest.fn(() => Promise.resolve(0)),
}));
jest.mock('../../api/messages', () => ({
  messagesAPI: { syncMessages: jest.fn() },
}));

import { getSyncCursor, setSyncCursor, upsertMessages } from '../messageRepository';
import { messagesAPI } from '../../api/messages';

const mockCursor = getSyncCursor as jest.Mock;
const mockSetCursor = setSyncCursor as jest.Mock;
const mockUpsert = upsertMessages as jest.Mock;
const mockSync = messagesAPI.syncMessages as jest.Mock;

const msg = (id: number, updated: string) => ({
  id, conversation: 1, sender: 2, sender_name: 'B', content: `m${id}`,
  message_type: 'text', read_by: [], is_starred: false, is_edited: false,
  is_deleted: false, created_at: updated, updated_at: updated,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCursor.mockResolvedValue(null);
  mockSetCursor.mockResolvedValue(undefined);
  mockUpsert.mockResolvedValue(undefined);
});

describe('syncConversation', () => {
  it('applique le delta et avance le curseur', async () => {
    mockSync.mockResolvedValueOnce({
      data: { results: [msg(1, '2026-01-01T00:00:00Z'), msg(2, '2026-01-01T00:01:00Z')],
              next_since: '2026-01-01T00:01:00Z', has_more: false },
    });
    const res = await syncConversation(1);
    expect(res.applied).toBe(2);
    expect(mockUpsert).toHaveBeenCalledWith(1, expect.arrayContaining([expect.objectContaining({ id: 2 })]));
    expect(mockSetCursor).toHaveBeenCalledWith(1, '2026-01-01T00:01:00Z', expect.any(String));
  });

  it('envoie le curseur existant en param since', async () => {
    mockCursor.mockResolvedValue('2026-01-01T00:00:00Z');
    mockSync.mockResolvedValueOnce({ data: { results: [], next_since: '2026-01-01T00:00:00Z', has_more: false } });
    await syncConversation(1);
    expect(mockSync).toHaveBeenCalledWith({ conversation: 1, since: '2026-01-01T00:00:00Z' });
  });

  it('boucle tant que has_more est vrai', async () => {
    mockCursor.mockResolvedValue('c0');
    mockSync
      .mockResolvedValueOnce({ data: { results: [msg(1, 'c1')], next_since: 'c1', has_more: true } })
      .mockResolvedValueOnce({ data: { results: [msg(2, 'c2')], next_since: 'c2', has_more: false } });
    const res = await syncConversation(1);
    expect(mockSync).toHaveBeenCalledTimes(2);
    expect(res.applied).toBe(2);
    expect(res.cursor).toBe('c2');
  });

  it('ne fait pas d\'upsert quand le delta est vide', async () => {
    mockCursor.mockResolvedValue('c0');
    mockSync.mockResolvedValueOnce({ data: { results: [], next_since: 'c0', has_more: false } });
    const res = await syncConversation(1);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(res.applied).toBe(0);
  });

  it('respecte la garde anti-boucle (MAX_PAGES)', async () => {
    mockCursor.mockResolvedValue('c0');
    // has_more toujours vrai → doit s'arrêter à MAX_PAGES (20), pas boucler à l'infini.
    mockSync.mockResolvedValue({ data: { results: [msg(1, 'c1')], next_since: 'c1', has_more: true } });
    await syncConversation(1);
    expect(mockSync).toHaveBeenCalledTimes(20);
  });
});
