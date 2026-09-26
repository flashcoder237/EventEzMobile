/**
 * Rejeu des SUPPRESSIONS mises en file hors-ligne.
 *
 * Bug d'origine : hors-ligne, une suppression groupée affichait « supprimé »
 * puis les messages RÉAPPARAISSAIENT à la reconnexion. Trois causes :
 *   1. aucun chemin offline — l'appel HTTP échouait, un toast, et c'est tout ;
 *   2. la suppression optimiste ne vivait qu'en RAM (state React), jamais en
 *      SQLite — elle disparaissait au moindre remount ;
 *   3. le delta-sync réécrasait la ligne avec l'état serveur, qui n'avait
 *      jamais été prévenu.
 *
 * L'outbox était par ailleurs structurellement send-only : sa table n'avait
 * aucune colonne d'opération. Ces tests couvrent la branche de rejeu ajoutée.
 */
import { flushOutbox } from '../outboxSync';

jest.mock('../outboxRepository', () => ({
  getPendingOutbox: jest.fn(),
  markOutboxSending: jest.fn(),
  markOutboxFailed: jest.fn(),
  removeOutbox: jest.fn(),
  cleanupPersistedAttachments: jest.fn(() => Promise.resolve()),
}));
jest.mock('../messageRepository', () => ({
  reconcileSent: jest.fn(),
  clearPendingOp: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../api/messages', () => ({
  messagesAPI: {
    uploadAttachment: jest.fn(),
    uploadVoiceMessage: jest.fn(),
    sendMessage: jest.fn(),
    bulkDeleteMessages: jest.fn(),
  },
}));

import {
  getPendingOutbox, markOutboxFailed, removeOutbox,
} from '../outboxRepository';
import { clearPendingOp } from '../messageRepository';
import { messagesAPI } from '../../api/messages';

const mGet = getPendingOutbox as jest.Mock;
const mFailed = markOutboxFailed as jest.Mock;
const mRemove = removeOutbox as jest.Mock;
const mClear = clearPendingOp as jest.Mock;
const mBulkDelete = messagesAPI.bulkDeleteMessages as jest.Mock;
const mSend = messagesAPI.sendMessage as jest.Mock;

const deletionEntry = (over: any = {}) => ({
  temp_id: 'del-10-1_2',
  conversation_id: '10',
  content: null,
  reply_to: null,
  attachments: [],
  state: 'pending',
  retry_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  op: 'delete',
  target_ids: ['1', '2'],
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('flushOutbox — entrée de suppression', () => {
  it('rejoue la suppression auprès du serveur', async () => {
    mGet.mockResolvedValue([deletionEntry()]);
    mBulkDelete.mockResolvedValue({ data: {} });

    const n = await flushOutbox();

    expect(mBulkDelete).toHaveBeenCalledWith(['1', '2']);
    expect(n).toBe(1);
  });

  it('lève le tombstone local une fois le serveur confirmé', async () => {
    // Sans ça, `pending_op` resterait posé et la ligne serait figée hors du
    // delta-sync pour toujours.
    mGet.mockResolvedValue([deletionEntry()]);
    mBulkDelete.mockResolvedValue({ data: {} });

    await flushOutbox();

    expect(mClear).toHaveBeenCalledWith(['1', '2']);
  });

  it('retire l’entrée de la file après succès', async () => {
    mGet.mockResolvedValue([deletionEntry()]);
    mBulkDelete.mockResolvedValue({ data: {} });

    await flushOutbox();

    expect(mRemove).toHaveBeenCalledWith('del-10-1_2');
  });

  it('n’envoie JAMAIS de message pour une entrée de suppression', async () => {
    // Garde-fou : avant la colonne `op`, toute entrée était rejouée comme un
    // envoi. Une suppression aurait posté un message vide.
    mGet.mockResolvedValue([deletionEntry()]);
    mBulkDelete.mockResolvedValue({ data: {} });

    await flushOutbox();

    expect(mSend).not.toHaveBeenCalled();
  });

  it('marque l’entrée en échec si le serveur refuse — le tombstone tient', async () => {
    mGet.mockResolvedValue([deletionEntry()]);
    mBulkDelete.mockRejectedValue(new Error('boom'));

    await flushOutbox();

    expect(mFailed).toHaveBeenCalledWith('del-10-1_2');
    // Le tombstone n'est PAS levé : les messages restent masqués localement
    // et protégés du sync jusqu'au prochain rejeu.
    expect(mClear).not.toHaveBeenCalled();
  });

  it('ignore une entrée de suppression sans cible', async () => {
    mGet.mockResolvedValue([deletionEntry({ target_ids: [] })]);

    await flushOutbox();

    expect(mBulkDelete).not.toHaveBeenCalled();
    expect(mRemove).toHaveBeenCalledWith('del-10-1_2');
  });

  it('respecte le plafond de retry', async () => {
    mGet.mockResolvedValue([deletionEntry({ retry_count: 3 })]);

    await flushOutbox();

    expect(mBulkDelete).not.toHaveBeenCalled();
  });
});

describe('flushOutbox — compatibilité ascendante', () => {
  it('traite une entrée sans `op` comme un envoi (lignes d’avant le schéma v3)', async () => {
    mGet.mockResolvedValue([
      deletionEntry({ op: 'send', target_ids: [], content: 'hello' }),
    ]);
    mSend.mockResolvedValue({ data: { id: 5 } });

    await flushOutbox();

    expect(mSend).toHaveBeenCalled();
    expect(mBulkDelete).not.toHaveBeenCalled();
  });
});
