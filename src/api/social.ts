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

  /**
   * Le backend `EventInvitationViewSet.create()` accepte directement une liste
   * d'invitees via `BulkInvitationCreateSerializer` — pas d'action `bulk_invite/`
   * dédiée. On post donc sur l'endpoint racine.
   */
  bulkInvite: (data: { event: string; invitees: Array<{ email: string; name?: string }>; message?: string }) =>
    api.post('/invitations/', data),

  /**
   * Relances. Le backend impose un délai minimum entre deux rappels et un
   * plafond de 3 : un invité harcelé signale l'e-mail en spam, ce qui pénalise
   * la délivrabilité de TOUS les envois de la plateforme. Un refus revient en
   * 400 avec `code: 'reminder_not_allowed'`.
   */
  remind: (id: string) =>
    api.post(`/invitations/${id}/remind/`),

  /** Relance tous les invités sans réponse d'un événement. */
  remindPending: (eventId: string) =>
    api.post<{ sent: number; skipped: number }>('/invitations/remind-pending/', { event: eventId }),

  accept: (id: string) =>
    api.post(`/invitations/${id}/accept/`),

  decline: (id: string) =>
    api.post(`/invitations/${id}/decline/`),

  /**
   * Annule une invitation pending (inviter only). Le backend implémente
   * l'annulation via `DELETE /invitations/{id}/` (cf `EventInvitationViewSet.destroy`).
   */
  cancel: (id: string) =>
    api.delete(`/invitations/${id}/`),

  getMyInvitations: () =>
    api.get('/invitations/my_invitations/'),

  /**
   * Récupère une invitation via son token public puis répond via accept/decline.
   * Pas d'endpoint single-shot côté backend — on chaîne `by_token` puis l'action.
   */
  respondByToken: async (token: string, actionType: 'accept' | 'decline') => {
    const inv = await api.get('/invitations/by_token/', { params: { token } });
    const id = (inv.data as { id?: string })?.id;
    if (!id) throw new Error('Invitation introuvable.');
    if (actionType === 'accept') {
      return api.post(`/invitations/${id}/accept/`);
    }
    return api.post(`/invitations/${id}/decline/`);
  },
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
  getRecommendations: (params?: { limit?: number; page?: number; page_size?: number }) =>
    api.get('/recommendations/', { params }),

  recordInteraction: (data: { event?: string; category?: number; interaction_type: string }) =>
    api.post('/recommendations/record_interaction/', data),

  /** Events similaires à un event donné — utilisé en bas de EventDetails.
   *  Le backend utilise `@action(detail=True)` qui génère l'URL DRF standard
   *  `/recommendations/{pk}/similar/` (pk AVANT le nom de l'action). */
  getSimilar: (eventId: string, params?: { limit?: number }) =>
    api.get(`/recommendations/${eventId}/similar/`, { params }),
};

// ============================================
// ADVERTISEMENTS API
// ============================================

export interface AdvertisementPublic {
  id: string;
  title: string;
  subtitle: string;
  image_url: string | null;
  cta_label: string;
  target_event_id: string | null;
  link_url: string;
  placement: 'feed_top' | 'feed_inline' | 'feed_bottom';
  priority: number;
}

export interface AdvertisementAdmin extends AdvertisementPublic {
  image: string;
  target_event: string | null;
  target_event_title: string | null;
  country: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  view_count: number;
  click_count: number;
  is_currently_active: boolean;
  created_by: number | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export const advertisementsAPI = {
  /**
   * Liste publique géo-filtrée. Tous les params sont optionnels — sans aucun
   * param, on récupère les pubs sans contrainte géo. Avec country/city/lat/lng,
   * on récupère seulement celles qui matchent.
   */
  getNearby: (params?: { country?: string; city?: string; lat?: number; lng?: number }) =>
    api.get<{ results: AdvertisementPublic[]; count: number }>(
      '/advertisements/nearby/',
      { params },
    ),

  /** Tracking — fire and forget. */
  recordView: (id: string) => api.post(`/advertisements/${id}/view/`),
  recordClick: (id: string) => api.post(`/advertisements/${id}/click/`),

  // === Admin CRUD ===
  list: (params?: any) => api.get('/advertisements/', { params }),
  get: (id: string) => api.get(`/advertisements/${id}/`),
  create: (data: FormData | Record<string, any>) =>
    api.post('/advertisements/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
  update: (id: string, data: FormData | Record<string, any>) =>
    api.patch(`/advertisements/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
  delete: (id: string) => api.delete(`/advertisements/${id}/`),
};
