// ============================================
// EventEz Mobile API — Messages & Conversations
// ============================================

import api from './instance';
import { fetchUpload } from './config';

// ============================================
// MESSAGES API
// ============================================

export const messagesAPI = {
  getConversations: () =>
    api.get('/conversations/'),

  getConversation: (id: string) =>
    api.get(`/conversations/${id}/`),

  createConversation: (data: { participants?: number[]; participant_ids?: number[] }) =>
    api.post('/conversations/', data),

  updateConversation: (id: string, data: { is_archived?: boolean; is_starred?: boolean }) =>
    api.patch(`/conversations/${id}/`, data),

  deleteConversation: (id: string) =>
    api.delete(`/conversations/${id}/`),

  archiveConversation: (id: string) =>
    api.post(`/conversations/${id}/archive/`),

  starConversation: (id: string) =>
    api.post(`/conversations/${id}/star/`),

  addParticipant: (conversationId: string, userId: string) =>
    api.post(`/conversations/${conversationId}/add_participant/`, { user_id: userId }),

  getMessages: (params?: { conversation?: string; page?: string }) =>
    api.get('/messages/', { params }),

  sendMessage: (data: { content: string; conversation?: string; reply_to?: string }) =>
    api.post('/messages/', data),

  updateMessage: (id: string, data: { content?: string; is_starred?: boolean }) =>
    api.patch(`/messages/${id}/`, data),

  deleteMessage: (id: string) =>
    api.delete(`/messages/${id}/`),

  markMessageAsRead: (id: string) =>
    api.post(`/messages/${id}/mark_as_read/`),

  markConversationAsRead: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/mark_as_read/`),

  starMessage: (id: string) =>
    api.post(`/messages/${id}/star/`),

  uploadAttachment: (formData: FormData) =>
    fetchUpload('POST', '/messages/upload_attachment/', formData),

  uploadVoiceMessage: (formData: FormData) =>
    fetchUpload('POST', '/messages/upload_voice_message/', formData),

  addReaction: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/add_reaction/`, { emoji }),

  removeReaction: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/remove_reaction/`, { emoji }),

  forwardMessage: (data: { message_id: string; target_user_id: string }) =>
    api.post('/messages/forward_message/', data),

  // Messaging settings
  getUserMessagingSettings: () =>
    api.get('/user-messaging-settings/'),

  updateUserMessagingSettings: (settingsId: string, data: { messaging_enabled?: boolean; blocked_users?: string[] }) =>
    api.patch(`/user-messaging-settings/${settingsId}/`, data),

  blockUser: (userId: string) =>
    api.post('/user-messaging-settings/block_user/', { user_id: userId }),

  unblockUser: (userId: string) =>
    api.post('/user-messaging-settings/unblock_user/', { user_id: userId }),

  getBlockedUsers: () =>
    api.get('/user-messaging-settings/blocked_list/'),

  searchMessages: (query: string, conversationId?: string) => {
    const params: any = { q: query };
    if (conversationId) params.conversation = conversationId;
    return api.get('/messages/search/', { params });
  },

  removeParticipant: (conversationId: string, userId: string) =>
    api.post(`/conversations/${conversationId}/remove_participant/`, { user_id: userId }),

  getPresence: () =>
    api.get('/conversations/presence/'),

  /** Statut quota + cycle de vie d'une conversation (groupes / événement). */
  getConversationQuota: (conversationId: string | number) =>
    api.get(`/conversations/${conversationId}/quota/`),

  /** Manifest JSON complet d'une conversation pour sauvegarde locale. */
  exportConversation: (conversationId: string | number) =>
    api.get(`/conversations/${conversationId}/export/`),

  /** Définit qui peut écrire (organizer uniquement). */
  setPostingMode: (
    conversationId: string | number,
    mode: 'all' | 'organizer_only' | 'admins_only',
  ) => api.patch(`/conversations/${conversationId}/posting-mode/`, { posting_mode: mode }),

  /** Mute un participant (organizer uniquement). */
  muteParticipant: (conversationId: string | number, userId: string | number) =>
    api.post(`/conversations/${conversationId}/mute/`, { user_id: userId }),

  /** Retire le mute d'un participant. */
  unmuteParticipant: (conversationId: string | number, userId: string | number) =>
    api.post(`/conversations/${conversationId}/unmute/`, { user_id: userId }),

  /** Liste des utilisateurs mutés dans la conversation. */
  getMutedList: (conversationId: string | number) =>
    api.get(`/conversations/${conversationId}/muted-list/`),
};
