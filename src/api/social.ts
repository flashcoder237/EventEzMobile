// ============================================
// EventEz Mobile API — Social, Invitations, Referrals, Gamification & Recommendations
// ============================================

import api from './instance';

// ============================================
// SOCIAL / ACTIVITY FEED API
// ============================================

export const socialAPI = {
  getFeed: (params?: any) =>
    api.get('/social/feed/', { params }),

  getMyFeed: () =>
    api.get('/social/feed/my_feed/'),

  getEventFeed: (eventId: string) =>
    api.get('/social/feed/event_feed/', { params: { event_id: eventId } }),

  getConnections: (params?: any) =>
    api.get('/social/connections/', { params }),

  getMyConnections: () =>
    api.get('/social/connections/my_connections/'),

  getEventAttendees: (eventId: string) =>
    api.get('/social/connections/event_attendees/', { params: { event_id: eventId } }),

  sendConnectionRequest: (data: { receiver: string; event?: string; message?: string }) =>
    api.post('/social/connections/', data),

  acceptConnection: (id: string) =>
    api.post(`/social/connections/${id}/accept/`),

  declineConnection: (id: string) =>
    api.post(`/social/connections/${id}/decline/`),

  cancelConnection: (id: string) =>
    api.post(`/social/connections/${id}/cancel/`),
};

// ============================================
// INVITATIONS API
// ============================================

export const invitationsAPI = {
  getAll: (params?: any) =>
    api.get('/invitations/', { params }),

  getById: (id: string) =>
    api.get(`/invitations/${id}/`),

  create: (data: { event: string; invitee_email: string; invitee_name?: string; message?: string }) =>
    api.post('/invitations/', data),

  bulkInvite: (data: { event: string; invitees: Array<{ email: string; name?: string }>; message?: string }) =>
    api.post('/invitations/bulk_invite/', data),

  accept: (id: string) =>
    api.post(`/invitations/${id}/accept/`),

  decline: (id: string) =>
    api.post(`/invitations/${id}/decline/`),

  cancel: (id: string) =>
    api.post(`/invitations/${id}/cancel/`),

  getMyInvitations: () =>
    api.get('/invitations/my_invitations/'),

  respondByToken: (token: string, action: 'accept' | 'decline') =>
    api.post('/invitations/respond_by_token/', { token, action }),
};

// ============================================
// REFERRALS API
// ============================================

export const referralsAPI = {
  getCodes: (params?: any) =>
    api.get('/referrals/codes/', { params }),

  getCode: (id: string) =>
    api.get(`/referrals/codes/${id}/`),

  createCode: (data: { code_type?: string; event?: string; commission_percentage?: number; usage_limit?: number; valid_until?: string }) =>
    api.post('/referrals/codes/', data),

  updateCode: (id: string, data: any) =>
    api.patch(`/referrals/codes/${id}/`, data),

  deleteCode: (id: string) =>
    api.delete(`/referrals/codes/${id}/`),

  getStats: (id: string) =>
    api.get(`/referrals/codes/${id}/stats/`),

  trackClick: (code: string) =>
    api.post('/referrals/track/', { code }),
};

// ============================================
// GAMIFICATION API
// ============================================

export const gamificationAPI = {
  getBadges: () =>
    api.get('/gamification/badges/'),

  getMyBadges: () =>
    api.get('/gamification/user-badges/my_badges/'),

  getPointsBalance: () =>
    api.get('/gamification/points/balance/'),

  getPointsSummary: () =>
    api.get('/gamification/points/summary/'),

  getLeaderboard: (params?: { event?: string; period?: string }) =>
    api.get('/gamification/leaderboard/', { params }),

  getMyRank: (params?: { event?: string; period?: string }) =>
    api.get('/gamification/leaderboard/my_rank/', { params }),

  getPointsHistory: () =>
    api.get('/gamification/points/'),
};

// ============================================
// RECOMMENDATIONS API
// ============================================

export const recommendationsAPI = {
  getRecommendations: (params?: { limit?: number }) =>
    api.get('/recommendations/', { params }),

  recordInteraction: (data: { event?: string; category?: number; interaction_type: string }) =>
    api.post('/recommendations/record_interaction/', data),
};
