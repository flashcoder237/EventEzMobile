import api from './instance';

/**
 * API module Exposants / Stands (côté mobile).
 *
 * Deux usages principaux mobile :
 *   1. Scan des badges exposant (check-in au montage / à l'entrée), online + offline
 *      via le duo manifest / sync (calqué sur les billets).
 *   2. Annuaire public des exposants d'un événement (visiteur).
 */
export const exhibitorsAPI = {
  // ── Check-in badge exposant (online) ──────────────────────────────
  // Accepte un QR /verify/b/{id} ou un UUID brut (le backend parse).
  verifyAndCheckInBadge: (code: string, autoCheckIn: boolean = true) =>
    api.post('/booth-badges/verify-check-in/', { code, auto_check_in: autoCheckIn }),

  // ── Check-in OFFLINE badges ───────────────────────────────────────
  // Manifeste : badges valides (stand payé) d'un event, téléchargé une fois.
  getBadgeManifest: (eventId: string) =>
    api.get('/booth-badges/checkin-manifest/', { params: { event_id: eventId } }),

  // Remonte les check-ins badges faits hors-ligne (batch, idempotent).
  syncBadgeCheckins: (
    eventId: string,
    checkins: Array<{ badge_id: string; checked_in_at?: string }>,
  ) => api.post('/booth-badges/checkin-sync/', { event_id: eventId, checkins }),

  // ── Annuaire public (visiteur, sans auth) ─────────────────────────
  getPublicDirectory: (eventSlugOrId: string) =>
    api.get(`/events/${eventSlugOrId}/exhibitor-directory/`),

  // ── ORGANISATEUR : gestion des stands ─────────────────────────────
  // Miroir des methodes web (exhibitorsAPI). Permet de gerer un salon depuis
  // le mobile : categories tarifaires, stands, candidatures d'exposants.

  // Categories (grille tarifaire des stands)
  getCategories: (params?: { event?: string }) =>
    api.get('/booth-categories/', { params }),
  createCategory: (data: {
    event: string; name: string; base_price: number | string;
    surface_sqm?: number | string; allow_installments?: boolean;
    deposit_percentage?: number; description?: string;
  }) => api.post('/booth-categories/', data),
  updateCategory: (id: string, data: any) => api.patch(`/booth-categories/${id}/`, data),
  deleteCategory: (id: string) => api.delete(`/booth-categories/${id}/`),

  // Stands (emplacements)
  getBooths: (params?: { event?: string; status?: string }) =>
    api.get('/booths/', { params }),
  createBooth: (data: {
    event: string; code: string; category: string; status?: string;
    price_override?: number | string;
  }) => api.post('/booths/', data),
  updateBooth: (id: string, data: any) => api.patch(`/booths/${id}/`, data),
  deleteBooth: (id: string) => api.delete(`/booths/${id}/`),

  // Candidatures d'exposants
  getApplications: (params?: { event?: string; status?: string }) =>
    api.get('/booth-applications/', { params }),
  acceptApplication: (id: string, data?: { booth?: string; review_notes?: string }) =>
    api.post(`/booth-applications/${id}/accept/`, data || {}),
  rejectApplication: (id: string, reviewNotes?: string) =>
    api.post(`/booth-applications/${id}/reject/`, { review_notes: reviewNotes || '' }),
  waitlistApplication: (id: string, reviewNotes?: string) =>
    api.post(`/booth-applications/${id}/waitlist/`, { review_notes: reviewNotes || '' }),

  // ── Vente déléguée (config salon par l'hôte) ─────────────────────────────
  getSalesConfig: (params: { event: string }) =>
    api.get('/exhibitor-sales-config/', { params }),
  createSalesConfig: (data: {
    event: string; enabled?: boolean;
    host_revenue_share_pct?: number; default_fee_bearer?: string;
  }) => api.post('/exhibitor-sales-config/', data),
  updateSalesConfig: (id: string, data: {
    enabled?: boolean; host_revenue_share_pct?: number; default_fee_bearer?: string;
  }) => api.patch(`/exhibitor-sales-config/${id}/`, data),
};
