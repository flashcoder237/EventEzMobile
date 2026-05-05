// ============================================
// EventEz Mobile API — Messages & Conversations
// ============================================

import api from './instance';
import { fetchUpload } from './config';

// ============================================
// MESSAGES API
// ============================================

export const messagesAPI = {
  getConversations: (params?: any) =>
    api.get('/conversations/', { params }),

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

  sendMessage: (data: {
    content: string;
    conversation?: string;
    reply_to?: string;
    // attachment_ids : ids des MessageAttachment uploadés via
    // upload_attachment / upload_voice_message (encore "orphelins"). Le
    // serializer backend les rattache au message créé. Sans ce champ en
    // mode REST (WS indispo), un message avec image seule est rejeté car
    // content="" + 0 attachment lié.
    attachment_ids?: (string | number)[];
  }) =>
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

  updateUserMessagingSettings: (
    settingsId: string,
    data: {
      messaging_enabled?: boolean;
      blocked_users?: string[];
      muted_conversations?: (string | number)[];
      read_receipts_enabled?: boolean;
      presence_visible?: boolean;
    },
  ) =>
    api.patch(`/user-messaging-settings/${settingsId}/`, data),

  blockUser: (userId: string) =>
    api.post('/user-messaging-settings/block_user/', { user_id: userId }),

  unblockUser: (userId: string) =>
    api.post('/user-messaging-settings/unblock_user/', { user_id: userId }),

  getBlockedUsers: () =>
    api.get('/user-messaging-settings/blocked_list/'),

  /** Mute serveur d'une conversation — remplace l'ancien stockage AsyncStorage local. */
  muteConversation: (conversationId: string | number) =>
    api.post('/user-messaging-settings/mute_conversation/', {
      conversation_id: conversationId,
    }),

  /** Retire le mute serveur d'une conversation. */
  unmuteConversation: (conversationId: string | number) =>
    api.post('/user-messaging-settings/unmute_conversation/', {
      conversation_id: conversationId,
    }),

  /**
   * Signale un message à la modération.
   * reason : spam | harassment | hate_speech | inappropriate | scam | other
   */
  reportMessage: (
    messageId: string | number,
    data: {
      reason: 'spam' | 'harassment' | 'hate_speech' | 'inappropriate' | 'scam' | 'other';
      description?: string;
    },
  ) =>
    api.post('/message-reports/', {
      message: messageId,
      reason: data.reason,
      description: data.description,
    }),

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
