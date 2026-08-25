// ============================================
// EventEz Mobile API — Newsletters, Sponsors, Live, CFP, Virtual Rooms & Recordings
// ============================================

import api from './instance';

// ============================================
// NEWSLETTERS API
// ============================================

export const newslettersAPI = {
  getAll: (params?: any) =>
    api.get('/newsletters/', { params }),

  getById: (id: string) =>
    api.get(`/newsletters/${id}/`),

  create: (data: any) =>
    api.post('/newsletters/', data),

  update: (id: string, data: any) =>
    api.patch(`/newsletters/${id}/`, data),

  delete: (id: string) =>
    api.delete(`/newsletters/${id}/`),

  sendNow: (id: string) =>
    api.post(`/newsletters/${id}/send_now/`),

  schedule: (id: string, scheduledAt: string) =>
    api.post(`/newsletters/${id}/schedule/`, { scheduled_at: scheduledAt }),

  getSubscribers: (params?: any) =>
    api.get('/subscribers/', { params }),

  subscribe: (data: { email: string; name?: string }) =>
    api.post('/subscribers/subscribe/', data),

  unsubscribe: (token: string) =>
    api.post('/subscribers/unsubscribe/', { token }),
};

// ============================================
// SPONSORS API
// ============================================

export const sponsorsAPI = {
  getPackages: (params?: any) =>
    api.get('/sponsor-packages/', { params }),

  getSponsors: (params?: any) =>
    api.get('/event-sponsors/', { params }),

  getSponsor: (id: string) =>
    api.get(`/event-sponsors/${id}/`),

  getByEvent: (eventId: string) =>
    api.get('/event-sponsors/by-event/', { params: { event_id: eventId } }),

  trackClick: (id: string) =>
    api.post(`/event-sponsors/${id}/track-click/`),

  /**
   * Confirme un sponsor (admin / organizer du contrat). Bascule
   * is_confirmed=true côté backend pour le faire apparaître publiquement
   * dans SponsorsTab. Les sponsors non confirmés sont filtrés du listing public.
   */
  confirm: (id: string) =>
    api.post(`/event-sponsors/${id}/confirm/`),
};

// ============================================
// LIVE Q&A / POLLS API
// ============================================

export const liveAPI = {
  getQuestionsByEvent: (eventId: string) =>
    api.get('/live-questions/by_event/', { params: { event_id: eventId } }),

  createQuestion: (data: { event: string; content: string; is_anonymous?: boolean }) =>
    api.post('/live-questions/', data),

  upvoteQuestion: (id: string) =>
    api.post(`/live-questions/${id}/upvote/`),

  getPollsByEvent: (eventId: string) =>
    api.get('/live-polls/by_event/', { params: { event_id: eventId } }),

  getPollResults: (id: string) =>
    api.get(`/live-polls/${id}/results/`),

  vote: (data: { poll: string; option: string }) =>
    api.post('/poll-votes/', data),
};

// ============================================
// CALL FOR PAPERS API
// ============================================

export const cfpAPI = {
  getAll: (params?: any) =>
    api.get('/call-for-papers/', { params }),

  getById: (id: string) =>
    api.get(`/call-for-papers/${id}/`),

  submitProposal: (data: any) =>
    api.post('/talk-proposals/', data),

  getMyProposals: () =>
    api.get('/talk-proposals/my_proposals/'),

  getProposal: (id: string) =>
    api.get(`/talk-proposals/${id}/`),
};

// ============================================
// VIRTUAL ROOMS API
// ============================================

export const virtualRoomsAPI = {
  getByEvent: (eventId: string) =>
    api.get('/virtual-rooms/by_event/', { params: { event_id: eventId } }),

  getById: (id: string) =>
    api.get(`/virtual-rooms/${id}/`),

  join: (id: string) =>
    api.post(`/virtual-rooms/${id}/join/`),

  leave: (id: string) =>
    api.post(`/virtual-rooms/${id}/leave/`),

  getParticipants: (id: string) =>
    api.get(`/virtual-rooms/${id}/participants/`),

  /** Rejoindre via le provider configuré — retourne token JWT ou URL+password selon le plan */
  eventJoin: (eventId: string) =>
    api.get(`/virtual-rooms/event/${eventId}/join/`),

  /** Capacités vidéo du plan pour un événement donné */
  eventPlanInfo: (eventId: string) =>
    api.get(`/virtual-rooms/event/${eventId}/plan-info/`),

  /** Statut « en direct » PUBLIC et léger (polling). Accepte UUID ou slug.
   *  → { is_live, is_online, has_started, has_ended, starts_in_minutes, participants } */
  liveStatus: (eventIdOrSlug: string) =>
    api.get(`/virtual-rooms/event/${eventIdOrSlug}/live-status/`),
};

// ============================================
// RECORDINGS API
// ============================================

export const recordingsAPI = {
  getByEvent: (eventId: string) =>
    api.get('/recordings/by_event/', { params: { event_id: eventId } }),

  getById: (id: string) =>
    api.get(`/recordings/${id}/`),

  incrementView: (id: string) =>
    api.post(`/recordings/${id}/increment_view/`),
};
