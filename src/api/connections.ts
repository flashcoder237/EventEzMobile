// ============================================
// EventEz Mobile API — User Connections (LinkedIn-style)
// ============================================

import api from './instance';

export interface ConnectionUser {
  id: number;
  email: string;
  full_name: string;
  profile_picture: string | null;
}

export interface Connection {
  id: number;
  user: ConnectionUser;
  source: 'qr' | 'mutual_follow' | 'manual';
  created_at: string;
}

export interface QrTokenResponse {
  token: string;
  ttl_seconds: number;
}

export interface FromQrError {
  error: string;
  code: 'invalid_format' | 'expired' | 'invalid_signature' | 'self_scan' | 'user_not_found';
}

export const connectionsAPI = {
  /** Liste mes connections (l'autre user dans chaque pair). */
  list: (params?: { page?: number; page_size?: number; search?: string }) =>
    (params
      ? api.get<{ results: Connection[]; count: number; next?: boolean }>('/connections/', { params })
      : api.get<{ results: Connection[]; count: number }>('/connections/')),

  /** Retire une connection. `connectionId` = Connection.id (champ `id` retourne
   * par `list()`), pas l'user_id de l'autre. */
  remove: (connectionId: number | string) =>
    api.delete(`/connections/${connectionId}/`),

  /**
   * Genere un token QR temporaire (10 minutes) pour partager via QR code.
   * Le destinataire qui scanne envoie ce token a `fromQr()`.
   */
  getMyQrToken: () => api.get<QrTokenResponse>('/connections/my_qr_token/'),

  /**
   * Cree une Connection bidirectionnelle apres scan du QR d'un autre user.
   * Le token vient du QR scanne (genere par l'autre user via `getMyQrToken`).
   */
  fromQr: (token: string) =>
    api.post<Connection>('/connections/from_qr/', { token }),

  /**
   * Se connecter MANUELLEMENT à un user (depuis son profil). Idempotent, débloque
   * le DM direct. `source='manual'`.
   */
  connect: (userId: number | string) =>
    api.post<Connection & { created: boolean }>('/connections/connect/', { user_id: userId }),

  /**
   * G13 — échange sur place en secouant : candidats appariés (≤ 3 s, < 50 m),
   * jamais de choix automatique. Position grossière, jamais stockée en base.
   */
  bump: (data: { event_id: string; lat: number; lng: number; ts: number }) =>
    api.post<{ candidates: BumpCandidate[]; window_seconds: number }>('/connections/bump/', data),

  /** Confirme un candidat : 202 `waiting` puis 201 `connected` à la double confirmation. */
  bumpConfirm: (eventId: string, userId: number | string) =>
    api.post<{ status: 'waiting' | 'connected'; connection_id?: number; user?: BumpCandidate }>(
      '/connections/bump/confirm/',
      { event_id: eventId, user_id: userId },
    ),
};

export interface BumpCandidate {
  id: number;
  full_name: string;
  profile_picture: string | null;
}
