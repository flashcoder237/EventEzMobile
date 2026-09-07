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

// ── Types organisateur ──────────────────────────────────────────────────────
export interface GiftRegistryInput {
  event?: string;        // uuid — requis à la création
  title?: string;
  description?: string;
  is_active?: boolean;
}

export interface GiftItemInput {
  registry?: string;     // uuid — requis à la création
  kind?: 'gift' | 'cash_fund';  // cf. backend GiftItem.KIND_* (gift = objet, cash_fund = cagnotte)
  name?: string;         // le champ backend est `name` (PAS `title`)
  description?: string;
  target_amount?: number | string;
  image?: string;
  external_url?: string;
  order?: number;
}

export interface GuestTableInput {
  event?: string;        // uuid — requis à la création
  name?: string;
  capacity?: number;
  order?: number;
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

// ============================================
// WEDDING ORGANIZER API — gestion (auth organisateur REQUISE)
// ============================================
//
// Ces méthodes sont réservées à l'organisateur de l'événement (le backend
// vérifie event.organizer). Elles alimentent les écrans de GESTION mobile
// (invités/RSVP, cagnotte, plan de table) — à NE PAS confondre avec les écrans
// invité `WeddingRsvpScreen`/`WeddingGiftRegistryScreen` (deep-link, public).
//
// ⚠️ Mono-devise : la devise d'un GiftRegistry est verrouillée sur celle de
// l'événement côté backend. Ne JAMAIS exposer de sélecteur de devise ni de
// montant en devise tierce dans les écrans qui consomment ces méthodes.
// ⚠️ Toujours passer event.id (UUID), jamais le slug, sur ces endpoints.
export const weddingOrganizerAPI = {
  // ── Invités & RSVP ────────────────────────────────────────────────────────
  // Liste des invités d'un événement + stats RSVP (couverts, non placés…).
  getGuestList: (eventId: string) =>
    api.get('/invitations/guest-list/', { params: { event: eventId } }),

  // Édition du RSVP d'un invité PAR l'organisateur (party_size/régime/note).
  // Un invité pending est basculé accepted. Garde de capacité si déjà placé.
  setGuestRsvp: (invitationId: string, rsvp: RSVPPayload) =>
    api.post(`/invitations/${invitationId}/organizer-rsvp/`, rsvp),

  // Relance UNE invitation restée sans réponse.
  remindOne: (invitationId: string) =>
    api.post(`/invitations/${invitationId}/remind/`),

  // Relance TOUS les invités pending d'un événement.
  remindPending: (eventId: string) =>
    api.post('/invitations/remind-pending/', { event: eventId }),

  // Annule (supprime) une invitation en attente.
  cancelInvitation: (invitationId: string) =>
    api.delete(`/invitations/${invitationId}/`),

  // Import CSV d'invités. dry_run=true (défaut) analyse sans rien créer.
  importGuestsCsv: (eventId: string, file: unknown, dryRun = true) => {
    const form = new FormData();
    form.append('event', eventId);
    form.append('dry_run', String(dryRun));
    // file : { uri, name, type } issu d'expo-document-picker.
    form.append('file', file as never);
    return api.post('/invitations/import-csv/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Cagnotte / liste de cadeaux ───────────────────────────────────────────
  createRegistry: (data: GiftRegistryInput) =>
    api.post('/gift-registries/', data),

  updateRegistry: (registryId: string, data: GiftRegistryInput) =>
    api.patch(`/gift-registries/${registryId}/`, data),

  deleteRegistry: (registryId: string) =>
    api.delete(`/gift-registries/${registryId}/`),

  // Items de la liste (CRUD).
  createItem: (data: GiftItemInput) =>
    api.post('/gift-items/', data),

  updateItem: (itemId: string, data: GiftItemInput) =>
    api.patch(`/gift-items/${itemId}/`, data),

  deleteItem: (itemId: string) =>
    api.delete(`/gift-items/${itemId}/`),

  // ── Plan de table ─────────────────────────────────────────────────────────
  getTables: (eventId: string) =>
    api.get('/guest-tables/', { params: { event: eventId } }),

  createTable: (data: GuestTableInput) =>
    api.post('/guest-tables/', data),

  updateTable: (tableId: string, data: GuestTableInput) =>
    api.patch(`/guest-tables/${tableId}/`, data),

  deleteTable: (tableId: string) =>
    api.delete(`/guest-tables/${tableId}/`),

  // Place un invité à une table (garde de capacité côté backend).
  assignGuest: (tableId: string, invitationId: string) =>
    api.post(`/guest-tables/${tableId}/assign/`, { invitation: invitationId }),

  // Retire un invité de sa table.
  unassignGuest: (invitationId: string) =>
    api.post('/guest-tables/unassign/', { invitation: invitationId }),
};
