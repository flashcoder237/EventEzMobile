// ============================================
// EventEz Mobile API — Waitlist, Seating, Volunteers, Currency, Comparison, Export, AI & UTM
// ============================================

import api from './instance';

// ============================================
// LANGUAGES API (référentiel ISO 639-1, public)
// ============================================

export const languagesAPI = {
  list: () => api.get<Array<{ code: string; label: string }>>('/languages/'),
};

// ============================================
// WAITLIST API
// ============================================

export const waitlistAPI = {
  // CRUD de base
  getWaitlist: (params?: any) =>
    api.get('/waitlist/', { params }),

  getWaitlistEntry: (id: string) =>
    api.get(`/waitlist/${id}/`),

  // Rejoindre/Quitter la liste d'attente
  joinWaitlist: (data: { event: string; ticket_type?: string }) =>
    api.post('/waitlist/join/', data),

  cancelWaitlist: (id: string) =>
    api.post(`/waitlist/${id}/cancel/`),

  // Ma liste d'attente
  getMyWaitlist: () =>
    api.get('/waitlist/my_waitlist/'),

  // Notifications (organisateur)
  notifyEntry: (id: string) =>
    api.post(`/waitlist/${id}/notify/`),

  notifyBatch: (data: { event: string; count?: number }) =>
    api.post('/waitlist/notify_batch/', data),

  // Statistiques
  getStatistics: (eventId: string) =>
    api.get('/waitlist/statistics/', { params: { event: eventId } }),
};

// ============================================
// WAITLIST SETTINGS API
// ============================================

export const waitlistSettingsAPI = {
  getWaitlistSettings: (params?: any) =>
    api.get('/waitlist-settings/', { params }),

  getWaitlistSetting: (id: string) =>
    api.get(`/waitlist-settings/${id}/`),

  createWaitlistSetting: (data: any) =>
    api.post('/waitlist-settings/', data),

  updateWaitlistSetting: (id: string, data: any) =>
    api.put(`/waitlist-settings/${id}/`, data),

  deleteWaitlistSetting: (id: string) =>
    api.delete(`/waitlist-settings/${id}/`),
};

// ============================================
// SEATING API
// ============================================

export const seatingAPI = {
  // ---- Plans ----
  getPlans: (params?: { event?: string }) =>
    api.get('/seating-plans/', { params }),

  getPlan: (id: string) =>
    api.get(`/seating-plans/${id}/`),

  /**
   * Crée un plan de placement attaché à un event. layout_data est libre côté
   * backend ; le mobile stocke la grille de chaque zone sous la forme
   * { zones: { <zone_id>: { rows, cols, label_prefix } } }.
   */
  createPlan: (data: {
    event: string;
    name: string;
    description?: string;
    layout_data?: Record<string, any>;
    total_seats?: number;
    is_active?: boolean;
  }) => api.post('/seating-plans/', data),

  updatePlan: (id: string, data: any) =>
    api.patch(`/seating-plans/${id}/`, data),

  deletePlan: (id: string) =>
    api.delete(`/seating-plans/${id}/`),

  getAvailableSeats: (id: string) =>
    api.get(`/seating-plans/${id}/available_seats/`),

  // ---- Zones ----
  getZones: (params?: { seating_plan?: string }) =>
    api.get('/seating-zones/', { params }),

  createZone: (data: {
    seating_plan: string;
    name: string;
    color?: string;
    price_modifier?: number;
    capacity?: number;
    order?: number;
  }) => api.post('/seating-zones/', data),

  updateZone: (id: string, data: any) =>
    api.patch(`/seating-zones/${id}/`, data),

  deleteZone: (id: string) =>
    api.delete(`/seating-zones/${id}/`),

  // ---- Reservations (côté spectateur) ----
  createReservation: (data: { seating_plan: string; zone: string; seat_label: string }) =>
    api.post('/seat-reservations/', data),

  confirmReservation: (id: string) =>
    api.post(`/seat-reservations/${id}/confirm/`),

  cancelReservation: (id: string) =>
    api.post(`/seat-reservations/${id}/cancel/`),

  getMyReservations: () =>
    api.get('/seat-reservations/my_reservations/'),
};

// ============================================
// FLOOR PLANS API
// ============================================

export const floorPlansAPI = {
  getByEvent: (eventId: string) =>
    api.get('/floor-plans/by_event/', { params: { event_id: eventId } }),

  getById: (id: string) =>
    api.get(`/floor-plans/${id}/`),
};

// ============================================
// VOLUNTEERS API
// ============================================

export const volunteersAPI = {
  getRoles: (params?: { event?: string }) =>
    api.get('/volunteer-roles/', { params }),

  // CRUD organizer-side : créer / éditer / supprimer un rôle bénévole.
  // Le backend vérifie déjà que request.user == event.organizer.
  createRole: (data: {
    event: string;
    title: string;
    description?: string;
    requirements?: string;
    quantity_needed?: number;
  }) => api.post('/volunteer-roles/', data),

  updateRole: (id: string, data: any) =>
    api.patch(`/volunteer-roles/${id}/`, data),

  deleteRole: (id: string) =>
    api.delete(`/volunteer-roles/${id}/`),

  apply: (data: { role: string; motivation?: string; availability?: string; experience?: string }) =>
    api.post('/volunteer-applications/', data),

  getMyApplications: () =>
    api.get('/volunteer-applications/my_applications/'),

  // Candidatures recues sur mes events (vue organizer).
  // Filtres : ?event=<id>, ?status=pending|accepted|rejected
  // Sans event : renvoie pending de tous mes events.
  getReceivedApplications: (params?: { event?: string; status?: string }) =>
    api.get('/volunteer-applications/received/', { params }),

  withdrawApplication: (id: string) =>
    api.post(`/volunteer-applications/${id}/withdraw/`),

  // Approbation des candidatures (organizer-side).
  acceptApplication: (id: string) =>
    api.post(`/volunteer-applications/${id}/accept/`),

  rejectApplication: (id: string, reason?: string) =>
    api.post(`/volunteer-applications/${id}/reject/`, { reason: reason || '' }),

  getMyTasks: () =>
    api.get('/volunteer-tasks/my_tasks/'),

  completeTask: (id: string) =>
    api.post(`/volunteer-tasks/${id}/complete/`),
};

// ============================================
// EVENT TEAM API
// ============================================
// Equipe d'evenement : organisateur invite des co-organisateurs, moderateurs,
// scanners, analystes. Cf. apps/event_team backend.
//
// Difference avec volunteers : un staff agit AU NOM de l'organisateur avec ses
// droits (scan, moderation chat, analytics). Un volontaire = aide bras-fort.

export type EventStaffRole = 'co_organizer' | 'moderator' | 'scanner' | 'analyst';

export interface EventStaffMember {
  id: string;
  event: string;
  event_title: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string | null;
  } | null;
  invited_email?: string;
  invited_phone?: string;
  invited_by: {
    id: string;
    email: string;
    full_name?: string;
  } | null;
  role: EventStaffRole;
  role_display: string;
  permissions: string[];
  invitation_status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  status_display: string;
  invitation_message?: string;
  invitation_expires_at: string;
  // Token expose en lecture seulement (organizer-only). Permet de generer
  // l'URL publique partagee. invitation_url est pre-construit cote backend
  // a partir de FRONTEND_URL.
  invitation_token?: string;
  invitation_url?: string | null;
  invited_at: string;
  accepted_at?: string | null;
  declined_at?: string | null;
  revoked_at?: string | null;
  last_activity_at?: string | null;
  is_expired: boolean;
}

export interface EventStaffInvitationLookup extends Omit<EventStaffMember, 'event'> {
  event: {
    id: string;
    title: string;
    start_date: string | null;
    end_date: string | null;
    banner_url: string | null;
    organizer_name: string;
  };
  can_accept: boolean;
}

export const eventTeamAPI = {
  // GET /event-team/ ?event=<id> (organizer view) | ?mine=true (defaut, mes invitations)
  list: (params?: { event?: string; mine?: boolean; status?: string }) =>
    api.get('/event-team/', { params }),

  // GET catalog des roles + permissions atomiques (alimente l'UI selecteur)
  getRolesCatalog: () =>
    api.get('/event-team/roles-catalog/'),

  // GET les events ou je suis staff actif (avec mon role)
  getMyTeamEvents: () =>
    api.get('/event-team/my_events/'),

  // POST inviter un membre (organizer)
  invite: (data: {
    event: string;
    role: EventStaffRole;
    invited_email?: string;
    invited_phone?: string;
    invitation_message?: string;
  }) => api.post('/event-team/', data),

  // POST renvoyer l'invitation (reset expiration + email/SMS)
  resend: (id: string) =>
    api.post(`/event-team/${id}/resend/`),

  // POST revoquer un acces (organizer). DELETE est aussi accepte.
  revoke: (id: string) =>
    api.post(`/event-team/${id}/revoke/`),

  // POST accepter l'invitation (invite)
  accept: (id: string) =>
    api.post(`/event-team/${id}/accept/`),

  // POST decliner l'invitation (invite)
  decline: (id: string) =>
    api.post(`/event-team/${id}/decline/`),

  // GET preview public d'une invitation par token (avant acceptation)
  // Pas d'auth requise cote API ; resolu depuis le deep link
  // eventez://team-invitation/{token} (cf. App.tsx linking config).
  lookupByToken: (token: string) =>
    api.get(`/event-team/invitation/${token}/`),
};

// ============================================
// CURRENCY API
// ============================================
//
// `getAll()` ciblait /currencies/ (CurrencyViewSet existe mais n'est pas
// enregistré côté router → 404). N'a jamais été consommée par un écran ;
// retirée pour ne pas exposer d'API morte. La conversion indicative passe
// par /commissions/convert/ qui est déjà disponible via commissionsAPI.

export const currencyAPI = {
  /** @deprecated utilise commissionsAPI.convert — endpoint cible identique */
  convert: (amount: number, from: string, to: string) =>
    api.get('/commissions/convert/', { params: { amount, from, to } }),
};

// ============================================
// EVENT COMPARISON API
// ============================================

export const comparisonAPI = {
  compare: (eventIds: string[]) =>
    api.get('/events/compare/', { params: { ids: eventIds.join(',') } }),
};

// ============================================
// EXPORT API (déprécié)
// ============================================
//
// L'ancien `exportAPI.download` utilisait `responseType: 'arraybuffer'` via
// axios — instable en RN/Hermes (renvoie parfois une string, ce qui corrompt
// le binaire). Le hook `useExport` télécharge désormais directement via
// `File.downloadFileAsync` (expo-file-system, natif). Cet objet est conservé
// uniquement pour ne pas casser un éventuel import externe ; il déclenche un
// warning en dev pour signaler aux nouveaux callers de passer par useExport.

export const exportAPI = {
  download: (endpoint: string, params: Record<string, string> = {}) => {
    if (__DEV__) {
      console.warn(
        '[exportAPI.download] DEPRECATED — utilisez le hook useExport ' +
        '(téléchargement natif via expo-file-system, gère les binaires correctement).'
      );
    }
    return api.get(endpoint, { params, responseType: 'arraybuffer' });
  },
};

// ============================================
// AI ASSIST API
// ============================================

export const aiAssistAPI = {
  generate: (prompt: string, sessionId: string) =>
    api.post('/ai-assist/generate/', { prompt, session_id: sessionId }),

  description: (title: string, keywords: string, eventType: string, category: string, sessionId: string) =>
    api.post('/ai-assist/description/', { title, keywords, event_type: eventType, category, session_id: sessionId }),

  suggestCategory: (title: string, description: string, categories: any[], tags: any[], sessionId: string) =>
    api.post('/ai-assist/suggest-category/', { title, description, categories, tags, session_id: sessionId }),

  optimizeTitle: (title: string, eventType: string, category: string, sessionId: string) =>
    api.post('/ai-assist/optimize-title/', { title, event_type: eventType, category, session_id: sessionId }),

  seo: (title: string, description: string, category: string, location: string, sessionId: string) =>
    api.post('/ai-assist/seo/', { title, description, category, location, session_id: sessionId }),

  pricing: (eventType: string, category: string, city: string, capacity: string, description: string, sessionId: string) =>
    api.post('/ai-assist/pricing/', { event_type: eventType, category, city, capacity, description, session_id: sessionId }),

  usage: (sessionId: string) =>
    api.get('/ai-assist/usage/', { params: { session_id: sessionId } }),
};

// ============================================
// WEBHOOKS API (intégrations Zapier-style)
// ============================================
//
// Permet à un organisateur de pousser ses events EventEz vers un endpoint
// externe (Zapier, Make, propre back-office). Une signature HMAC est calculée
// côté backend avec le `secret` enregistré ici, headers `X-EventEz-Signature`.

export const webhooksAPI = {
  getAll: (params?: any) =>
    api.get('/webhooks/', { params }),

  getById: (id: string) =>
    api.get(`/webhooks/${id}/`),

  create: (data: {
    url: string;
    secret: string;
    event_types: string[];
    event?: string | null;
    is_active?: boolean;
  }) => api.post('/webhooks/', data),

  update: (id: string, data: any) =>
    api.patch(`/webhooks/${id}/`, data),

  delete: (id: string) =>
    api.delete(`/webhooks/${id}/`),

  /** Liste des dernières livraisons pour debug. */
  deliveries: (id: string) =>
    api.get(`/webhooks/${id}/deliveries/`),

  /** Envoie un payload de test sur l'endpoint configuré. */
  test: (id: string) =>
    api.post(`/webhooks/${id}/test/`),

  toggleActive: (id: string) =>
    api.post(`/webhooks/${id}/toggle_active/`),

  retry: (deliveryId: string) =>
    api.post(`/webhook-deliveries/${deliveryId}/retry/`),

  stats: () =>
    api.get('/webhooks/stats/'),
};

// ============================================
// UTM TRACKING API
// ============================================

export const utmAPI = {
  getAll: (params?: { event?: string }) =>
    api.get('/utm/', { params }),

  create: (data: {
    event: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    referrer_url?: string;
    landing_page?: string;
  }) =>
    api.post('/utm/', data),

  getStats: (eventId: string) =>
    api.get('/utm/stats/', { params: { event_id: eventId } }),
};
