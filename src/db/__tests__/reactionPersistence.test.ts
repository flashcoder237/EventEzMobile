/**
 * Régression « je réagis avec un emoji, je sors, je reviens : la réaction a
 * disparu ».
 *
 * Cause mobile : la réaction ne vivait que dans le state React (reducer
 * ADD_REACTION) ; SQLite — source de vérité relue à l'ouverture — gardait le
 * payload sans réaction. (Cause serveur symétrique : le delta-sync ne
 * renvoyait jamais le message car une réaction ne bumpait pas updated_at —
 * couverte côté backend par test_sync_delta.py.)
 *
 * On simule ici la table `messages` en mémoire : réagir → relire via
 * getMessages (= réouverture de la conversation) doit rendre la réaction.
 */
type Row = {
  id: string; conversation_id: string; server_id: number | null; payload: string;
  created_at: string; updated_at: string | null; is_deleted: number; send_state: string;
};

const mockRows = new Map<string, Row>();

const mockDb = {
  getFirstAsync: jest.fn(async (_sql: string, id: string) => mockRows.get(id) ?? null),
  getAllAsync: jest.fn(async (_sql: string, cid: string) =>
    [...mockRows.values()].filter((r) => r.conversation_id === cid)),
  runAsync: jest.fn(async (sql: string, payload: string, id: string) => {
    if (/^UPDATE messages SET payload = \? WHERE id = \?$/.test(sql.trim())) {
      const r = mockRows.get(id);
      if (r) r.payload = payload;
    }
    return { changes: 1 };
  }),
};

jest.mock('../database', () => ({
  getDatabase: jest.fn(async () => mockDb),
  runExclusive: jest.fn((task: () => Promise<unknown>) => task()),
}));

import { applyLocalReaction, applyReactionToList, getMessages } from '../messageRepository';

const seed = (id: string, extra: Record<string, unknown> = {}) => {
  mockRows.set(id, {
    id, conversation_id: '7', server_id: Number(id),
    payload: JSON.stringify({ id: Number(id), content: 'salut', created_at: '2026-01-01T00:00:00Z', ...extra }),
    created_at: '2026-01-01T00:00:00Z', updated_at: null, is_deleted: 0, send_state: 'sent',
  });
};

beforeEach(() => {
  mockRows.clear();
  jest.clearAllMocks();
});

describe('applyLocalReaction — persistance SQLite des réactions', () => {
  it('la réaction survit à la réouverture de la conversation', async () => {
    seed('42');
    await applyLocalReaction('42', 'add', '👍', '5');
    const [msg] = await getMessages(7);
    expect(msg.reactions).toHaveLength(1);
    expect(msg.reactions![0]).toMatchObject({ emoji: '👍', user: 5 });
  });

  it('est idempotente (écho WS de ma propre réaction = pas de doublon)', async () => {
    seed('42');
    await applyLocalReaction('42', 'add', '👍', 5);
    await applyLocalReaction(42, 'add', '👍', '5');
    const [msg] = await getMessages(7);
    expect(msg.reactions).toHaveLength(1);
  });

  it('le retrait est persisté et ne touche pas les réactions des autres', async () => {
    seed('42', {
      reactions: [
        { id: 1, emoji: '❤️', user: 5, user_name: 'moi', created_at: 'x' },
        { id: 2, emoji: '❤️', user: 9, user_name: 'autre', created_at: 'x' },
      ],
    });
    await applyLocalReaction('42', 'remove', '❤️', 5);
    const [msg] = await getMessages(7);
    expect(msg.reactions).toEqual([
      { id: 2, emoji: '❤️', user: 9, user_name: 'autre', created_at: 'x' },
    ]);
  });

  it('no-op si le message est absent de la base locale', async () => {
    await expect(applyLocalReaction('999', 'add', '👍', 5)).resolves.toBeUndefined();
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });
});

describe('applyReactionToList (pure)', () => {
  it('normalise user string/number', () => {
    const list = [{ id: 1, emoji: '😂', user: 3, user_name: '', created_at: '' }];
    expect(applyReactionToList(list, 'add', '😂', 3)).toBe(list);
    expect(applyReactionToList(list, 'remove', '😂', 3)).toEqual([]);
  });

  it('tolère reactions undefined', () => {
    expect(applyReactionToList(undefined, 'remove', '😂', 3)).toEqual([]);
    expect(applyReactionToList(undefined, 'add', '😂', 3)).toHaveLength(1);
  });
});
