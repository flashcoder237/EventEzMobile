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

  bulkGenerateTickets: (registrationIds: string[]) =>
    api.post('/registrations/bulk_generate_tickets/', { registration_ids: registrationIds }),

  // Validation et annulation
  validateRegistration: (id: string) =>
    api.post(`/registrations/${id}/validate/`),

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

  // Statistiques
  getRegistrationStats: (eventId: string) =>
    api.get('/registrations/stats/', { params: { event_id: eventId } }),

  // Communication
  resendConfirmation: (registrationId: string) =>
    api.post(`/registrations/${registrationId}/resend_confirmation/`),

  sendEmail: (data: { registration_ids: string[]; subject: string; message: string }) =>
    api.post('/registrations/send_email/', data),

  // Export — use `useExport()` hook instead (needs arraybuffer + file write + share)
  // Endpoint path kept for reference: GET /registrations/export/?event_id=&format=csv|xlsx|pdf

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
