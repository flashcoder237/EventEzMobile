// ============================================
// EventEz Mobile API — Audit, Treasury & Site Settings (Admin)
// ============================================

import api from './instance';

// ============================================
// AUDIT API (Admin only)
// ============================================

export const auditAPI = {
  // CRUD de base (route: /api/audit/logs/)
  getLogs: (params?: any) =>
    api.get('/audit/logs/', { params }),

  getLog: (id: string) =>
    api.get(`/audit/logs/${id}/`),

  // Actions
  getStatistics: (params?: any) =>
    api.get('/audit/logs/statistics/', { params }),

  getRecentLogs: (params?: { limit?: number }) =>
    api.get('/audit/logs/recent/', { params }),

  // Export — use `useExport()` hook instead.
  // Endpoint kept for reference: GET /audit/logs/export/?user=&export_format=csv|xlsx|pdf
};

// ============================================
// TREASURY API (Admin only)
// ============================================

export const treasuryAPI = {
  // Overview
  getOverview: () =>
    api.get('/admin/treasury/overview/'),

  // Wallet — exposé directement dans la réponse de getOverview() (champ `wallet`).
  // Ces aliases conservent la compat des callers historiques mais tapent les
  // endpoints réels du `TreasuryOverviewViewSet`.
  getWallet: () =>
    api.get('/admin/treasury/overview/'),

  recomputeWallet: () =>
    api.post('/admin/treasury/overview/recompute/'),

  // Transactions
  getTransactions: (params?: any) =>
    api.get('/admin/treasury/transactions/', { params }),

  getTransaction: (id: string) =>
    api.get(`/admin/treasury/transactions/${id}/`),

  createTransaction: (data: any) =>
    api.post('/admin/treasury/transactions/', data),

  // Staff
  getStaffMembers: (params?: any) =>
    api.get('/admin/treasury/staff/', { params }),

  getStaffMember: (id: string) =>
    api.get(`/admin/treasury/staff/${id}/`),

  createStaffMember: (data: any) =>
    api.post('/admin/treasury/staff/', data),

  updateStaffMember: (id: string, data: any) =>
    api.patch(`/admin/treasury/staff/${id}/`, data),

  deleteStaffMember: (id: string) =>
    api.delete(`/admin/treasury/staff/${id}/`),

  // Staff Payments
  getStaffPayments: (params?: any) =>
    api.get('/admin/treasury/staff-payments/', { params }),

  createStaffPayment: (data: any) =>
    api.post('/admin/treasury/staff-payments/', data),

  // Backend action `generate` sur StaffPaymentViewSet (cf. apps/treasury/views.py)
  generatePayroll: (data: { month: number; year: number }) =>
    api.post('/admin/treasury/staff-payments/generate/', data),

  // Expenses
  getExpenses: (params?: any) =>
    api.get('/admin/treasury/expenses/', { params }),

  getExpense: (id: string) =>
    api.get(`/admin/treasury/expenses/${id}/`),

  createExpense: (data: any) =>
    api.post('/admin/treasury/expenses/', data),

  updateExpense: (id: string, data: any) =>
    api.patch(`/admin/treasury/expenses/${id}/`, data),

  deleteExpense: (id: string) =>
    api.delete(`/admin/treasury/expenses/${id}/`),

  approveExpense: (id: string) =>
    api.post(`/admin/treasury/expenses/${id}/approve/`),

  rejectExpense: (id: string, reason: string) =>
    api.post(`/admin/treasury/expenses/${id}/reject/`, { reason }),

  // Shareholders
  getShareholders: (params?: any) =>
    api.get('/admin/treasury/shareholders/', { params }),

  getShareholder: (id: string) =>
    api.get(`/admin/treasury/shareholders/${id}/`),

  createShareholder: (data: any) =>
    api.post('/admin/treasury/shareholders/', data),

  updateShareholder: (id: string, data: any) =>
    api.patch(`/admin/treasury/shareholders/${id}/`, data),

  deleteShareholder: (id: string) =>
    api.delete(`/admin/treasury/shareholders/${id}/`),

  // Dividends
  getDividends: (params?: any) =>
    api.get('/admin/treasury/dividends/', { params }),

  getDividend: (id: string) =>
    api.get(`/admin/treasury/dividends/${id}/`),

  createDividend: (data: any) =>
    api.post('/admin/treasury/dividends/', data),

  approveDividend: (id: string) =>
    api.post(`/admin/treasury/dividends/${id}/approve/`),

  distributeDividend: (id: string) =>
    api.post(`/admin/treasury/dividends/${id}/distribute/`),

  /**
   * Calcule la répartition pour une période sans créer de DividendDistribution.
   * Utilisé par l'écran "Distribuer les dividendes" pour montrer aux admins
   * combien chaque shareholder toucherait avant validation.
   */
  previewDividend: (data: { period_start: string; period_end: string; distribution_percentage: number }) =>
    api.post('/admin/treasury/dividends/preview/', data),

  // Reports
  getProfitLoss: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/admin/treasury/reports/profit-loss/', { params }),

  getFinancialSummary: (params?: any) =>
    api.get('/admin/treasury/reports/summary/', { params }),

  getMonthlyReport: (params?: { month?: number; year?: number }) =>
    api.get('/admin/treasury/reports/monthly/', { params }),
};

// ============================================
// SITE SETTINGS API
// ============================================

export const siteSettingsAPI = {
  get: () =>
    api.get('/site-settings/'),

  /**
   * PATCH partiel des paramètres site — admin uniquement (le backend renvoie 403
   * sinon). Champs supportés : ai_moderation_enabled, ai_assist_enabled,
   * phone_otp_enabled, sms_notifications_enabled, sms_pre_payment_enabled,
   * sms_post_payment_enabled, payout_approval_mode, etc. (cf SiteSettings).
   */
  update: (data: Record<string, any>) =>
    api.patch('/site-settings/', data),
};

// Toggles publics utilisables avant authentification (login/register).
// Retourne uniquement les flags exposes publiquement par PublicSettingsView.
export const publicSettingsAPI = {
  get: () =>
    api.get('/public-settings/'),
};
