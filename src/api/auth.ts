// ============================================
// EventEz Mobile API — Authentication, Users & Verification
// ============================================

import api, { clearTokens, getRefreshToken } from './instance';
import { fetchUpload } from './config';

// ============================================
// AUTHENTICATION API
// ============================================

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/token/', { email, password }),

  register: (data: {
    email: string;
    username: string;
    password: string;
    confirm_password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }) => api.post('/register/', data),

  registerOrganizer: (data: any) =>
    api.post('/register/organizer/', data),

  /**
   * Guest checkout — crée un compte sans mot de passe pour finaliser un achat
   * sur un event gratuit. Retourne {access, refresh, user} comme un login.
   *
   * Erreur 409 si l'email correspond déjà à un compte complet — le mobile
   * doit alors basculer vers le formulaire de login normal.
   */
  guestRegister: (data: { email: string; first_name: string; last_name?: string }) =>
    api.post('/auth/guest-register/', data),

  /**
   * Upgrade un compte guest en compte complet (pose un mot de passe).
   * Le user doit être authentifié et avoir is_guest=true côté backend.
   */
  upgradeGuest: (data: { password: string; confirm_password: string; last_name?: string }) =>
    api.post('/auth/upgrade-guest/', data),

  refreshToken: (refreshToken: string) =>
    api.post('/token/refresh/', { refresh: refreshToken }),

  requestPasswordReset: (email: string) =>
    api.post('/password-reset/request/', { email }),

  validateResetToken: (token: string) =>
    api.get(`/password-reset/validate/${token}/`),

  resetPassword: (token: string, password: string) =>
    api.post('/password-reset/confirm/', { token, password }),

  logout: async () => {
    try {
      // getRefreshToken lit la mémoire en priorité, puis SecureStore — fonctionne
      // aussi en mode éphémère (rememberMe=false) pour blacklister le token.
      const refreshToken = await getRefreshToken();
      await api.post('/logout/', { refresh: refreshToken });
    } catch (error) {
      if (__DEV__) console.warn('Logout API call failed:', error);
    } finally {
      await clearTokens();
    }
  },

  // Authentification sociale
  googleSignIn: (token: string) =>
    api.post('/social-auth/google/', { token }),

  appleSignIn: (data: {
    identity_token: string;
    user?: {
      email?: string;
      name?: {
        firstName?: string;
        lastName?: string;
      };
    };
  }) => api.post('/social-auth/apple/', data),

  // Vérification email
  verifyEmail: (token: string) =>
    api.get(`/verify-email/${token}/`),

  resendVerificationEmail: (email: string) =>
    api.post('/verify-email/resend/', { email }),

  // Authentification par téléphone (OTP SMS)
  phoneSendOTP: (phoneNumber: string) =>
    api.post('/auth/phone/send-otp/', { phone_number: phoneNumber }),

  phoneVerifyOTP: (phoneNumber: string, code: string) =>
    api.post('/auth/phone/verify/', { phone_number: phoneNumber, code }),

  // Vérification de compte par téléphone (utilisateur authentifié)
  phoneSendAccountVerification: (phoneNumber: string) =>
    api.post('/auth/phone/send-account-verification/', { phone_number: phoneNumber }),

  phoneVerifyAccount: (phoneNumber: string, code: string) =>
    api.post('/auth/phone/verify-account/', { phone_number: phoneNumber, code }),
};

// ============================================
// USERS API
// ============================================

export const usersAPI = {
  // CRUD de base
  getUsers: (params?: any) =>
    api.get('/users/', { params }),

  getUser: (id: string) =>
    api.get(`/users/${id}/`),

  // Utilisateur courant
  getCurrentUser: () =>
    api.get('/users/me/'),

  updateCurrentUser: (data: any) =>
    api.patch('/users/me/', data),

  // Backend n'accepte que PUT pour update_profile
  updateProfile: (data: any) =>
    api.put('/users/update_profile/', data),

  updateProfileImage: (formData: FormData) =>
    fetchUpload('PATCH', '/users/me/upload_profile_image/', formData),

  getUserSettings: () =>
    api.get('/users/me/settings/'),

  // Privacy : bloquer / débloquer / lister les utilisateurs bloqués
  blockUser: (userId: string | number) =>
    api.post(`/users/${userId}/block/`),
  unblockUser: (userId: string | number) =>
    api.post(`/users/${userId}/unblock/`),
  listBlocked: () =>
    api.get('/users/blocked/'),

  updateUserSettings: (settings: any) =>
    api.put('/users/me/settings/', settings),

  /**
   * Met à jour uniquement la préférence de langue de l'utilisateur.
   * Endpoint léger : PATCH /users/me/language/ → { language: 'fr' | 'en' }.
   * Utilisé par LanguagePickerScreen + SettingsScreen pour synchroniser la
   * langue locale (i18next) avec la préférence backend qui pilote les
   * emails/notifications/factures.
   */
  updateLanguage: (lang: 'fr' | 'en') =>
    api.patch('/users/me/language/', { language: lang }),

  deleteAccount: (data: { password: string; reason?: string }) =>
    api.post('/users/me/delete_account/', data),

  // Organisateurs
  getOrganizers: (params?: any) =>
    api.get('/users/organizers/', { params }),

  becomeOrganizer: (data?: {
    organizer_type: 'individual' | 'organization';
    company_name?: string;
    registration_number?: string;
    phone?: string;
  }) => api.post('/users/become_organizer/', data || {}),

  // Authentification & Sécurité
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/users/change_password/', data),

  // Notifications
  updateNotificationSettings: (data: any) =>
    api.patch('/users/notification_settings/', data),

  // Analytics
  getUserAnalytics: () =>
    api.get('/users/analytics/'),

  // Admin: CRUD utilisateurs
  updateUser: (id: string, data: any) =>
    api.patch(`/users/${id}/`, data),

  deleteUser: (id: string) =>
    api.delete(`/users/${id}/`),

  createUser: (data: any) =>
    api.post('/users/create_user/', data),

  // Admin/Modérateur: Vérification de profils
  getPendingVerification: () =>
    api.get('/users/pending_verification/'),

  verifyProfile: (id: string, data?: { verified_status?: boolean; note?: string }) =>
    api.post(`/users/${id}/verify_profile/`, data || {}),

  rejectProfile: (id: string, data: { reason: string }) =>
    api.post(`/users/${id}/reject_profile/`, data),

  // User Following
  followUser: (id: number, preferences?: {
    notification_preference?: 'all' | 'important' | 'none';
    notify_email?: boolean;
    notify_push?: boolean;
    notify_new_event?: boolean;
  }) => api.post(`/users/${id}/follow/`, preferences || {}),

  unfollowUser: (id: number) =>
    api.post(`/users/${id}/unfollow/`),

  isFollowingUser: (id: number) =>
    api.get(`/users/${id}/is_following/`),

  getUserFollowersCount: (id: number) =>
    api.get(`/users/${id}/followers_count/`),

  updateUserFollowPreferences: (id: number, preferences: any) =>
    api.patch(`/users/${id}/update_follow_preferences/`, preferences),

  getFollowingUsers: () =>
    api.get('/users/following_users/'),

  // Export — admin only — use `useExport()` hook instead.
  // Endpoint kept for reference: GET /users/export/?role=&export_format=csv|xlsx|pdf
};

// ============================================
// VERIFICATION API
// ============================================

export const verificationAPI = {
  submit: (formData: FormData) =>
    fetchUpload('POST', '/verifications/submit/', formData),

  // 404 = l'utilisateur n'a pas encore soumis de demande de verification.
  // C'est un etat vide normal (le screen affiche alors le formulaire), pas
  // une erreur — on le declare attendu pour eviter le bruit de log rouge.
  getMyRequest: () =>
    api.get('/verifications/my_request/', { expectedErrorStatuses: [404] } as any),

  getPending: () =>
    api.get('/verifications/pending/'),

  approve: (id: number) =>
    api.post(`/verifications/${id}/approve/`),

  reject: (id: number, reason: string) =>
    api.post(`/verifications/${id}/reject/`, { reason }),
};
