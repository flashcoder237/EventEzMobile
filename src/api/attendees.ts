// ============================================
// EventEz Mobile API — Attendees (collecte per-participant)
// ============================================
// Le socle backend crée les slots à la confirmation du paiement (webhook) ;
// ces endpoints servent la complétion post-paiement.

import api from './instance';

export const attendeeFormsAPI = {
  // Liste des slots + schéma du formulaire (acheteur). 409 payment_pending si
  // le webhook n'a pas encore confirmé le paiement (retour MoMo incertain).
  getAttendees: (registrationId: string) =>
    api.get(`/registrations/${registrationId}/attendees/`),

  // L'acheteur complète un slot.
  patchAttendee: (attendeeId: string, data: Record<string, any>) =>
    api.patch(`/attendees/${attendeeId}/`, { data }),

  // L'acheteur délègue la saisie d'un participant à un invité (par email).
  delegate: (attendeeId: string, email: string) =>
    api.post(`/attendees/${attendeeId}/delegate/`, { email }),

  // Public (invité sans compte) — via token de complétion. Pas d'auth.
  getByToken: (token: string) =>
    api.get(`/attendee-forms/public/${token}/`),

  patchByToken: (token: string, data: Record<string, any>) =>
    api.patch(`/attendee-forms/public/${token}/`, { data }),
};
