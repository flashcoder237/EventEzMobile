/**
 * Tests du rejeu d'outbox (flushOutbox) — logique d'orchestration.
 * Repository + API mockés : on vérifie upload → send → réconciliation, la
 * garde de retry, et le marquage d'échec.
 */
import { flushOutbox } from '../outboxSync';

jest.mock('../outboxRepository', () => ({
  getPendingOutbox: jest.fn(),
  markOutboxSending: jest.fn(),
  markOutboxFailed: jest.fn(),
  removeOutbox: jest.fn(),
}));
jest.mock('../messageRepository', () => ({ reconcileSent: jest.fn() }));
jest.mock('../../api/messages', () => ({
  messagesAPI: {
    uploadAttachment: jest.fn(),
    uploadVoiceMessage: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

import {
  getPendingOutbox, markOutboxSending, markOutboxFailed, removeOutbox,
} from '../outboxRepository';
import { reconcileSent } from '../messageRepository';
import { messagesAPI } from '../../api/messages';

const mGet = getPendingOutbox as jest.Mock;
const mSending = markOutboxSending as jest.Mock;
const mFailed = markOutboxFailed as jest.Mock;
const mRemove = removeOutbox as jest.Mock;
const mReconcile = reconcileSent as jest.Mock;
const mUpload = messagesAPI.uploadAttachment as jest.Mock;
const mSend = messagesAPI.sendMessage as jest.Mock;

const entry = (over: any = {}) => ({
  temp_id: 'temp-1', conversation_id: '10', content: 'hi', reply_to: null,
  attachments: [], state: 'pending', retry_count: 0, created_at: '2026-01-01T00:00:00Z',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mSending.mockResolvedValue(undefined);
  mFailed.mockResolvedValue(undefined);
  mRemove.mockResolvedValue(undefined);
  mReconcile.mockResolvedValue(undefined);
});

describe('flushOutbox', () => {
  it('envoie un message texte et le retire de la file', async () => {
    mGet.mockResolvedValue([entry()]);
    mSend.mockResolvedValue({ data: { id: 99, content: 'hi' } });
    const sent = await flushOutbox();
    expect(sent).toBe(1);
    expect(mSend).toHaveBeenCalledWith(expect.objectContaining({ content: 'hi', conversation: '10' }));
    expect(mReconcile).toHaveBeenCalledWith('10', 'temp-1', expect.objectContaining({ id: 99 }));
    expect(mRemove).toHaveBeenCalledWith('temp-1');
  });

  it('uploade les attachments avant l\'envoi', async () => {
    mGet.mockResolvedValue([entry({
      attachments: [{ uri: 'file://a.jpg', name: 'a.jpg', type: 'image' }],
    })]);
    mUpload.mockResolvedValue({ data: { id: 7 } });
    mSend.mockResolvedValue({ data: { id: 100 } });
    await flushOutbox();
    expect(mUpload).toHaveBeenCalledTimes(1);
    expect(mSend).toHaveBeenCalledWith(expect.objectContaining({ attachment_ids: ['7'] }));
  });

  it('marque en échec si l\'envoi jette', async () => {
    mGet.mockResolvedValue([entry()]);
    mSend.mockRejectedValue(new Error('network'));
    const sent = await flushOutbox();
    expect(sent).toBe(0);
    expect(mFailed).toHaveBeenCalledWith('temp-1');
    expect(mRemove).not.toHaveBeenCalled();
  });

  it('marque en échec si un upload échoue', async () => {
    mGet.mockResolvedValue([entry({
      attachments: [{ uri: 'file://a.jpg', name: 'a.jpg', type: 'image' }],
    })]);
    mUpload.mockResolvedValue({ data: {} }); // pas d'id → échec
    const sent = await flushOutbox();
    expect(sent).toBe(0);
    expect(mSend).not.toHaveBeenCalled();
    expect(mFailed).toHaveBeenCalledWith('temp-1');
  });

  it('saute les entrées ayant dépassé MAX_RETRY', async () => {
    mGet.mockResolvedValue([entry({ retry_count: 3 })]);
    const sent = await flushOutbox();
    expect(sent).toBe(0);
    expect(mSend).not.toHaveBeenCalled();
  });
});
