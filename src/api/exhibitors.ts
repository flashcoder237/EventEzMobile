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

  // ── PARCOURS EXPOSANT : fiche société + candidature ───────────────────────
  // Fiche(s) exposant de l'utilisateur (mine=true → seulement les siennes).
  getExhibitors: (params?: { mine?: string }) =>
    api.get('/exhibitors/', { params }),
  createExhibitor: (data: {
    company_name: string; category?: string; website?: string;
    description?: string; contact_name?: string; contact_email?: string;
    contact_phone?: string;
  }) => api.post('/exhibitors/', data),
  // Mise à jour par SLUG (lookup_field côté backend).
  updateExhibitor: (slug: string, data: {
    company_name?: string; category?: string; website?: string;
    description?: string; contact_name?: string; contact_email?: string;
    contact_phone?: string;
  }) => api.patch(`/exhibitors/${slug}/`, data),
  // Candidature à un stand d'un salon (requested_booth optionnel).
  createApplication: (data: {
    event: string; exhibitor: string; requested_booth?: string; pitch?: string;
  }) => api.post('/booth-applications/', data),

  // ── ESPACE EXPOSANT : mes réservations de stand ──────────────────────────
  getMyBookings: () => api.get('/booth-bookings/'),
  // Options de paiement recommandées (intégral / acompte / solde) pour un stand.
  getBookingPaymentOptions: (bookingId: string) =>
    api.get(`/booth-bookings/${bookingId}/payment-options/`),
  // Initie un paiement de stand ; retourne une payment_url à ouvrir en WebView.
  payBooking: (bookingId: string, data: {
    payment_method: string; kind?: 'full' | 'deposit' | 'balance';
    idempotency_key?: string; billing?: Record<string, any>;
  }) => api.post(`/booth-bookings/${bookingId}/pay/`, data),

  // ── Vente déléguée : contrats de l'exposant ──────────────────────────────
  getSalesContracts: (params?: { event?: string }) =>
    api.get('/exhibitor-sales-contracts/', { params }),
  acceptSalesContract: (id: string, data?: { fee_bearer?: string }) =>
    api.post(`/exhibitor-sales-contracts/${id}/accept/`, data || {}),

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

  // ── Capture de contacts (lead retrieval) ─────────────────────────────────
  // Le scan renvoie 403 avec code 'consent_required' si le visiteur n'a pas
  // accepté d'être contacté par les exposants. Ce refus doit être affiché tel
  // quel : capturer en silence serait une collecte illicite.
  scanLead: (data: {
    event: string; code: string; rating?: 'hot' | 'warm' | 'cold'; notes?: string;
  }) => api.post('/exhibitor-leads/scan/', data),
  // Qualification APRÈS le scan : le visiteur est déjà reparti, on ne peut
  // pas lui redemander son badge pour ajouter une note.
  qualifyLead: (data: {
    event: string; lead: string; rating?: 'hot' | 'warm' | 'cold'; notes?: string;
  }) => api.post('/exhibitor-leads/qualify/', data),
  getMyLeads: (params: { event?: string }) =>
    api.get('/exhibitor-leads/mine/', { params }),
  // L'export CSV passe par `useExport` (téléchargement natif + partage
  // système), pas par axios : responseType binaire est peu fiable en RN.
  // Endpoint : /exhibitor-leads/export/
};
