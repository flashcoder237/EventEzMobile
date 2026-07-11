// ============================================
// EventEz Mobile API — Registrations
// ============================================

import api from './instance';

// ============================================
// REGISTRATIONS API
// ============================================

export const registrationsAPI = {
  // CRUD de base
  getRegistrations: (params?: any) =>
    api.get('/registrations/', { params }),

  getRegistration: (id: string) =>
    api.get(`/registrations/${id}/`),

  createRegistration: (data: any) =>
    api.post('/registrations/', data),

  updateRegistration: (id: string, data: any) =>
    api.put(`/registrations/${id}/`, data),

  patchRegistration: (id: string, data: any) =>
    api.patch(`/registrations/${id}/`, data),

  deleteRegistration: (id: string) =>
    api.delete(`/registrations/${id}/`),

  // Mes inscriptions
  getMyRegistrations: () =>
    api.get('/registrations/my_registrations/'),

  // Recherche et filtres
  searchRegistrations: (params?: any) =>
    api.get('/registrations/search/', { params }),

  getByUser: (params?: { user_id?: string }) =>
    api.get('/registrations/by_user/', { params }),

  // QR Codes et billets
  generateQrCodes: (id: string) =>
    api.post(`/registrations/${id}/generate_qr_codes/`),

  // Sessions accessibles avec les billets de l'inscription
  // (union des included_sessions, ou toutes les sessions si all-access)
  getAccessibleSessions: (id: string) =>
    api.get(`/registrations/${id}/accessible-sessions/`),

  bulkGenerateTickets: (registrationIds: string[]) =>
    api.post('/registrations/bulk_generate_tickets/', { registration_ids: registrationIds }),

  // Annulation. La "validation" d'une registration côté organizer passe par
  // les actions `approveRegistration` / `rejectRegistration` plus bas — il n'y
  // a pas d'endpoint `validate` dédié sur RegistrationViewSet (le `validate`
  // backend existant est sur DiscountViewSet pour les codes promo).
  cancelRegistration: (id: string) =>
    api.post(`/registrations/${id}/cancel/`),

  // Modifier les billets d'une inscription en attente
  updateTickets: (id: string, tickets: Array<{ ticket_type: number; quantity: number }>) =>
    api.post(`/registrations/${id}/update_tickets/`, { tickets }),

  // Ajouter des billets supplémentaires à une inscription confirmée
  addTickets: (
    id: string,
    tickets: Array<{ ticket_type: number; quantity: number; discount_code?: string }>
  ) => api.post(`/registrations/${id}/add_tickets/`, { tickets }),

  // Check-in
  checkIn: (id: string) =>
    api.post(`/registrations/${id}/check_in/`),

  verifyTicket: (code: string) =>
    api.post('/registrations/verify_ticket/', { code }),

  verifyAndCheckIn: (code: string, autoCheckIn: boolean = true) =>
    api.post('/registrations/verify_and_check_in/', { code, auto_check_in: autoCheckIn }),

  // Check-in ticket-level (granulaire par billet) — accepte les QR /verify/t/{id}
  // ainsi qu'un UUID brut interprété comme ticket_purchase_id
  verifyAndCheckInTicket: (code: string, autoCheckIn: boolean = true) =>
    api.post('/registrations/verify_and_check_in_ticket/', { code, auto_check_in: autoCheckIn }),

  bulkCheckIn: (registrationIds: string[]) =>
    api.post('/registrations/bulk_check_in/', { registration_ids: registrationIds }),

  // ── Check-in OFFLINE ────────────────────────────────────────────────
  // Manifeste : liste des billets valides d'un event, téléchargée une fois
  // (connecté) pour permettre au scanner de VÉRIFIER les QR localement, sans
  // réseau. Un ticket_id présent = billet authentique de cet event.
  getCheckinManifest: (eventId: string) =>
    api.get('/ticket-purchases/checkin-manifest/', { params: { event_id: eventId } }),

  // Remonte les check-ins effectués hors-ligne (batch, idempotent).
  syncCheckins: (
    eventId: string,
    checkins: Array<{ ticket_id: string; checked_in_at?: string }>,
  ) => api.post('/ticket-purchases/checkin-sync/', { event_id: eventId, checkins }),

  // Statistiques
  getRegistrationStats: (eventId: string) =>
    api.get('/registrations/stats/', { params: { event_id: eventId } }),

  // Tableau de bord TEMPS RÉEL (mode live organisateur pendant l'event).
  // Stats ticket-level + cadence + activité récente + timeline. Poller ~15-20s.
  getLiveOps: (eventId: string) =>
    api.get('/registrations/live-ops/', { params: { event_id: eventId } }),

  // Mur de souvenirs : events auxquels l'utilisateur a assisté (check-in),
  // chacun avec son numéro de série (le Nᵉ participant arrivé).
  getAttendanceProofs: () =>
    api.get('/ticket-purchases/attendance-proofs/'),

  // Networking « qui est là » : annuaire des participants opt-in d'un event
  // (réservé aux participants confirmés). + toggle de sa propre visibilité.
  getEventDirectory: (eventId: string) =>
    api.get('/registrations/event-directory/', { params: { event_id: eventId } }),

  setNetworkingOptIn: (registrationId: string, optIn: boolean) =>
    api.post(`/registrations/${registrationId}/networking/`, { opt_in: optIn }),

  // Communication
  resendConfirmation: (registrationId: string) =>
    api.post(`/registrations/${registrationId}/resend_confirmation/`),

  sendEmail: (data: { registration_ids: string[]; subject: string; message: string }) =>
    api.post('/registrations/send_email/', data),

  // Export — use `useExport()` hook instead (needs arraybuffer + file write + share)
  // Endpoint path kept for reference:
  //   GET /registrations/export/?event_id=&export_format=csv|xlsx|pdf      → inscriptions
  //   GET /ticket-purchases/export/?event_id=&export_format=csv|xlsx|pdf  → achats de billets

  // Approbation par l'organisateur
  getPendingApproval: (params?: any) =>
    api.get('/registrations/pending_approval/', { params }),

  approveRegistration: (id: string, note?: string) =>
    api.post(`/registrations/${id}/approve/`, { note: note || '' }),

  rejectRegistration: (id: string, reason: string) =>
    api.post(`/registrations/${id}/reject/`, { reason }),

  bulkApprove: (registrationIds: string[], note?: string) =>
    api.post('/registrations/bulk_approve/', { registration_ids: registrationIds, note: note || '' }),

  bulkReject: (registrationIds: string[], reason: string) =>
    api.post('/registrations/bulk_reject/', { registration_ids: registrationIds, reason }),
};
