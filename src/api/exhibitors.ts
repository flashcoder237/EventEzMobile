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
};
