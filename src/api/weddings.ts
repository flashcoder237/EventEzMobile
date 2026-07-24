// ============================================
// WEDDING API — RSVP par token + liste de cadeaux / cagnotte
// ============================================
//
// Endpoints PUBLICS (pas d'auth requise) : un invité répond à son invitation ou
// contribue à la cagnotte sans compte. L'Authorization header est injecté par
// l'intercepteur uniquement si un token de session existe — sinon appel anonyme.
//
// Deep links associés (cf. App.tsx linking config) :
//   eventez://invitations/accept/{token}          → écran WeddingRsvp
//   eventez://events/{slug}/gift-registry         → écran GiftRegistry

import api from './instance';

export interface RSVPPayload {
  party_size?: number;
  dietary_requirements?: string;
  rsvp_note?: string;
}

export const weddingsAPI = {
  // ── RSVP ────────────────────────────────────────────────────────────────
  // Détail public d'une invitation par token (date, lieu, inviteur…).
  invitationByToken: (token: string) =>
    api.get('/invitations/by_token/', { params: { token } }),

  // Répondre à l'invitation (public). response = 'accept' | 'decline'.
  respondByToken: (
    token: string,
    response: 'accept' | 'decline',
    rsvp?: RSVPPayload,
  ) => api.post('/invitations/respond-by-token/', { token, response, ...(rsvp || {}) }),

  // ── Liste de cadeaux / cagnotte ───────────────────────────────────────────
  // Récupère la liste publique d'un événement (par slug ou uuid).
  getRegistryByEvent: (eventSlugOrId: string) =>
    api.get('/gift-registries/', { params: { event: eventSlugOrId } }),

  // Mur public des contributions complétées.
  getContributions: (registryId: string) =>
    api.get(`/gift-registries/${registryId}/contributions/`),

  // Initie une contribution (réservation d'objet ou don). Retourne payment_url.
  contribute: (
    registryId: string,
    data: {
      amount: number | string;
      payment_method: string;
      item?: string;
      contributor_name?: string;
      contributor_email?: string;
      contributor_phone?: string;
      message?: string;
      idempotency_key?: string;
    },
  ) => api.post(`/gift-registries/${registryId}/contribute/`, data),
};
