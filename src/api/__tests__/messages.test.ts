jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

jest.mock('../config', () => ({
  __esModule: true,
  ...jest.requireActual('../config'),
  fetchUpload: jest.fn((method: string, url: string, _formData: FormData) => {
    const fullUrl = `http://test.local/api${url}`;
    return (global.fetch as jest.Mock)(fullUrl, { method }).then(async (res: Response) => {
      const data = await res.json().catch(() => ({}));
      return { data, status: res.status, ok: res.ok };
    });
  }),
}));

import { messagesAPI } from '../messages';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('messagesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  // ---- Conversations ----

  it('getConversations(params) → GET /conversations/', async () => {
    await messagesAPI.getConversations({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/conversations/', { params: { page: 1 } });
  });

  it('getConversation(id) → GET /conversations/:id/', async () => {
    await messagesAPI.getConversation('c-1');
    expect(api.get).toHaveBeenCalledWith('/conversations/c-1/');
  });

  it('createConversation(data) → POST /conversations/', async () => {
    const data = { participant_ids: [1, 2] };
    await messagesAPI.createConversation(data);
    expect(api.post).toHaveBeenCalledWith('/conversations/', data);
  });

  it('updateConversation(id, data) → PATCH /conversations/:id/', async () => {
    const data = { is_archived: true };
    await messagesAPI.updateConversation('c-1', data);
    expect(api.patch).toHaveBeenCalledWith('/conversations/c-1/', data);
  });

  it('deleteConversation(id) → DELETE /conversations/:id/', async () => {
    await messagesAPI.deleteConversation('c-1');
    expect(api.delete).toHaveBeenCalledWith('/conversations/c-1/');
  });

  it('archiveConversation(id) → POST /conversations/:id/archive/', async () => {
    await messagesAPI.archiveConversation('c-1');
    expect(api.post).toHaveBeenCalledWith('/conversations/c-1/archive/');
  });

  it('starConversation(id) → POST /conversations/:id/star/', async () => {
    await messagesAPI.starConversation('c-1');
    expect(api.post).toHaveBeenCalledWith('/conversations/c-1/star/');
  });

  it('addParticipant(convId, userId) → POST /conversations/:id/add_participant/', async () => {
    await messagesAPI.addParticipant('c-1', 'u-2');
    expect(api.post).toHaveBeenCalledWith('/conversations/c-1/add_participant/', { user_id: 'u-2' });
  });

  // ---- Messages ----

  it('getMessages(params) → GET /messages/', async () => {
    await messagesAPI.getMessages({ conversation: 'c-1' });
    expect(api.get).toHaveBeenCalledWith('/messages/', { params: { conversation: 'c-1' } });
  });

  it('sendMessage(data) → POST /messages/', async () => {
    const data = { content: 'Hello', conversation: 'c-1' };
    await messagesAPI.sendMessage(data);
    expect(api.post).toHaveBeenCalledWith('/messages/', data);
  });

  it('updateMessage(id, data) → PATCH /messages/:id/', async () => {
    const data = { content: 'Edited' };
    await messagesAPI.updateMessage('m-1', data);
    expect(api.patch).toHaveBeenCalledWith('/messages/m-1/', data);
  });

  it('deleteMessage(id) → DELETE /messages/:id/', async () => {
    await messagesAPI.deleteMessage('m-1');
    expect(api.delete).toHaveBeenCalledWith('/messages/m-1/');
  });

  it('markMessageAsRead(id) → POST /messages/:id/mark_as_read/', async () => {
    await messagesAPI.markMessageAsRead('m-1');
    expect(api.post).toHaveBeenCalledWith('/messages/m-1/mark_as_read/');
  });

  it('markConversationAsRead(convId) → POST /conversations/:id/mark_as_read/', async () => {
    await messagesAPI.markConversationAsRead('c-1');
    expect(api.post).toHaveBeenCalledWith('/conversations/c-1/mark_as_read/');
  });

  it('starMessage(id) → POST /messages/:id/star/', async () => {
    await messagesAPI.starMessage('m-1');
    expect(api.post).toHaveBeenCalledWith('/messages/m-1/star/');
  });

  // ---- Uploads (multipart via fetch) — check URL only ----

  it('uploadAttachment(formData) → fetch POST /messages/upload_attachment/', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    );
    await messagesAPI.uploadAttachment(new FormData());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = (fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl).toContain('/messages/upload_attachment/');
    fetchSpy.mockRestore();
  });

  it('uploadVoiceMessage(formData) → fetch POST /messages/upload_voice_message/', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    );
    await messagesAPI.uploadVoiceMessage(new FormData());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = (fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl).toContain('/messages/upload_voice_message/');
    fetchSpy.mockRestore();
  });

  // ---- Reactions / Forward ----

  it('addReaction(msgId, emoji) → POST /messages/:id/add_reaction/', async () => {
    await messagesAPI.addReaction('m-1', '👍');
    expect(api.post).toHaveBeenCalledWith('/messages/m-1/add_reaction/', { emoji: '👍' });
  });

  it('removeReaction(msgId, emoji) → POST /messages/:id/remove_reaction/', async () => {
    await messagesAPI.removeReaction('m-1', '👍');
    expect(api.post).toHaveBeenCalledWith('/messages/m-1/remove_reaction/', { emoji: '👍' });
  });

  it('forwardMessage(data) → POST /messages/forward_message/', async () => {
    const data = { message_id: 'm-1', target_user_id: 'u-3' };
    await messagesAPI.forwardMessage(data);
    expect(api.post).toHaveBeenCalledWith('/messages/forward_message/', data);
  });

  // ---- Settings & blocking ----

  it('getUserMessagingSettings() → GET /user-messaging-settings/', async () => {
    await messagesAPI.getUserMessagingSettings();
    expect(api.get).toHaveBeenCalledWith('/user-messaging-settings/');
  });

  it('updateUserMessagingSettings(id, data) → PATCH /user-messaging-settings/:id/', async () => {
    const data = { messaging_enabled: false };
    await messagesAPI.updateUserMessagingSettings('s-1', data);
    expect(api.patch).toHaveBeenCalledWith('/user-messaging-settings/s-1/', data);
  });

  it('blockUser(userId) → POST /user-messaging-settings/block_user/', async () => {
    await messagesAPI.blockUser('u-2');
    expect(api.post).toHaveBeenCalledWith('/user-messaging-settings/block_user/', { user_id: 'u-2' });
  });

  it('unblockUser(userId) → POST /user-messaging-settings/unblock_user/', async () => {
    await messagesAPI.unblockUser('u-2');
    expect(api.post).toHaveBeenCalledWith('/user-messaging-settings/unblock_user/', { user_id: 'u-2' });
  });

  it('getBlockedUsers() → GET /user-messaging-settings/blocked_list/', async () => {
    await messagesAPI.getBlockedUsers();
    expect(api.get).toHaveBeenCalledWith('/user-messaging-settings/blocked_list/');
  });

  it('muteConversation(convId) → POST /user-messaging-settings/mute-conversation/', async () => {
    await messagesAPI.muteConversation('c-1');
    expect(api.post).toHaveBeenCalledWith('/user-messaging-settings/mute-conversation/', { conversation_id: 'c-1' });
  });

  it('unmuteConversation(convId) → POST /user-messaging-settings/unmute-conversation/', async () => {
    await messagesAPI.unmuteConversation('c-1');
    expect(api.post).toHaveBeenCalledWith('/user-messaging-settings/unmute-conversation/', { conversation_id: 'c-1' });
  });

  // ---- Reports / search ----

  it('reportMessage(msgId, data) → POST /message-reports/', async () => {
    await messagesAPI.reportMessage('m-1', { reason: 'spam', description: 'junk' });
    expect(api.post).toHaveBeenCalledWith('/message-reports/', {
      message: 'm-1',
      reason: 'spam',
      description: 'junk',
    });
  });

  it('searchMessages(query, convId) → GET /messages/search/ with params', async () => {
    await messagesAPI.searchMessages('hello', 'c-1');
    expect(api.get).toHaveBeenCalledWith('/messages/search/', { params: { q: 'hello', conversation: 'c-1' } });
  });

  // ---- Participants / presence / quota ----

  it('removeParticipant(convId, userId) → POST /conversations/:id/remove_participant/', async () => {
    await messagesAPI.removeParticipant('c-1', 'u-2');
    expect(api.post).toHaveBeenCalledWith('/conversations/c-1/remove_participant/', { user_id: 'u-2' });
  });

  it('getPresence() → GET /conversations/presence/', async () => {
    await messagesAPI.getPresence();
    expect(api.get).toHaveBeenCalledWith('/conversations/presence/');
  });

  it('getConversationQuota(convId) → GET /conversations/:id/quota/', async () => {
    await messagesAPI.getConversationQuota('c-1');
    expect(api.get).toHaveBeenCalledWith('/conversations/c-1/quota/');
  });

  it('exportConversation(convId) → GET /conversations/:id/export/', async () => {
    await messagesAPI.exportConversation('c-1');
    expect(api.get).toHaveBeenCalledWith('/conversations/c-1/export/');
  });

  it('setPostingMode(convId, mode) → PATCH /conversations/:id/posting-mode/', async () => {
    await messagesAPI.setPostingMode('c-1', 'organizer_only');
    expect(api.patch).toHaveBeenCalledWith('/conversations/c-1/posting-mode/', { posting_mode: 'organizer_only' });
  });

  it('muteParticipant(convId, userId) → POST /conversations/:id/mute/', async () => {
    await messagesAPI.muteParticipant('c-1', 'u-2');
    expect(api.post).toHaveBeenCalledWith('/conversations/c-1/mute/', { user_id: 'u-2' });
  });

  it('unmuteParticipant(convId, userId) → POST /conversations/:id/unmute/', async () => {
    await messagesAPI.unmuteParticipant('c-1', 'u-2');
    expect(api.post).toHaveBeenCalledWith('/conversations/c-1/unmute/', { user_id: 'u-2' });
  });

  it('getMutedList(convId) → GET /conversations/:id/muted-list/', async () => {
    await messagesAPI.getMutedList('c-1');
    expect(api.get).toHaveBeenCalledWith('/conversations/c-1/muted-list/');
  });
});
