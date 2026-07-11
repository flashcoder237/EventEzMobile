// ============================================
// EventEz Mobile API — Tickets, Transfers & Discounts
// ============================================

import api from './instance';
import { API_BASE_URL } from './config';

// ============================================
// TICKET TYPES API
// ============================================

export const ticketTypesAPI = {
  getTicketTypes: (params?: any) =>
    api.get('/ticket-types/', { params }),

  getTicketType: (id: string) =>
    api.get(`/ticket-types/${id}/`),

  createTicketType: (data: any) =>
    api.post('/ticket-types/', data),

  updateTicketType: (id: string, data: any) =>
    api.put(`/ticket-types/${id}/`, data),

  patchTicketType: (id: string, data: any) =>
    api.patch(`/ticket-types/${id}/`, data),

  deleteTicketType: (id: string) =>
    api.delete(`/ticket-types/${id}/`),
};

// ============================================
// TICKET PURCHASES API
// ============================================

export const ticketPurchasesAPI = {
  getTicketPurchases: (params?: any) =>
    api.get('/ticket-purchases/', { params }),

  getTicketPurchase: (id: string) =>
    api.get(`/ticket-purchases/${id}/`),

  createTicketPurchase: (data: any) =>
    api.post('/ticket-purchases/', data),

  updateTicketPurchase: (id: string, data: any) =>
    api.put(`/ticket-purchases/${id}/`, data),

  checkIn: (id: string) =>
    api.post(`/ticket-purchases/${id}/check_in/`),

  getMyTickets: () =>
    api.get('/ticket-purchases/'),

  getMyPurchases: () =>
    api.get('/ticket-purchases/my_purchases/'),

  // ── Wallet passes (Apple / Google) ──
  // Statut de config serveur : { apple_enabled, google_enabled }.
  getWalletStatus: () =>
    api.get('/ticket-purchases/wallet-status/'),

  // URL « Enregistrer dans Google Wallet » : { save_url }.
  getGooglePassUrl: (id: string) =>
    api.get(`/ticket-purchases/${id}/google-pass/`),

  // URL du .pkpass Apple (à télécharger AUTHENTIFIÉ via FileSystem.downloadAsync
  // avec le header Authorization — l'endpoint est owner-scopé).
  applePassUrl: (id: string) =>
    `${API_BASE_URL}/ticket-purchases/${id}/apple-pass/`,
};

// Alias for backward compatibility
export const ticketsAPI = ticketPurchasesAPI;

// ============================================
// DISCOUNTS API
// ============================================

export const discountsAPI = {
  // CRUD de base
  getDiscounts: (params?: any) =>
    api.get('/discounts/', { params }),

  getDiscount: (id: string) =>
    api.get(`/discounts/${id}/`),

  createDiscount: (data: any) =>
    api.post('/discounts/', data),

  updateDiscount: (id: string, data: any) =>
    api.put(`/discounts/${id}/`, data),

  patchDiscount: (id: string, data: any) =>
    api.patch(`/discounts/${id}/`, data),

  deleteDiscount: (id: string) =>
    api.delete(`/discounts/${id}/`),

  // Validation de code promo
  // Note: Utilise /discounts/validate_code/ (action sans ID)
  // Si subtotal est fourni, le backend retourne `applied_amount` (montant
  // exact de la remise) et `final_total` (subtotal - applied_amount). Le
  // mobile peut alors afficher le total définitif sans mention "estimation".
  validateDiscount: (code: string, eventId: string, ticketTypeId?: string, subtotal?: number) =>
    api.post('/discounts/validate_code/', {
      code,
      event: eventId,
      ticket_type: ticketTypeId,
      ...(subtotal !== undefined ? { subtotal } : {}),
    }),
};

// ============================================
// TICKET TRANSFERS API
// ============================================

export const ticketTransfersAPI = {
  // Liste des transferts de l'utilisateur
  getTransfers: (params?: any) =>
    api.get('/ticket-transfers/', { params }),

  // Transferts envoyés
  getSentTransfers: () =>
    api.get('/ticket-transfers/sent/'),

  // Transferts reçus
  getReceivedTransfers: () =>
    api.get('/ticket-transfers/received/'),

  // Transferts en attente
  getPendingTransfers: () =>
    api.get('/ticket-transfers/pending/'),

  // Créer un transfert
  createTransfer: (data: {
    ticket_purchase: number;
    recipient_email: string;
    recipient_name?: string;
    quantity?: number;
    message?: string;
  }) =>
    api.post('/ticket-transfers/', data),

  // Accepter un transfert
  acceptTransfer: (id: string) =>
    api.post(`/ticket-transfers/${id}/accept/`),

  // Refuser un transfert
  declineTransfer: (id: string) =>
    api.post(`/ticket-transfers/${id}/decline/`),

  // Annuler un transfert (par l'expéditeur)
  cancelTransfer: (id: string) =>
    api.post(`/ticket-transfers/${id}/cancel/`),

  // Accepter via token (sans auth)
  acceptByToken: (token: string) =>
    api.post('/ticket-transfers/accept_by_token/', { token }),

  // Refuser via token (sans auth)
  declineByToken: (token: string) =>
    api.post('/ticket-transfers/decline_by_token/', { token }),

  // Récupérer un transfert par token
  getByToken: (token: string) =>
    api.get('/ticket-transfers/by_token/', { params: { token } }),
};
