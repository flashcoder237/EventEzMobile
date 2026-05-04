// ============================================
// EventEz Mobile API — Payments, Refunds, Invoices, Subscriptions, Wallet, Payouts & Commissions
// ============================================

import api, { getAccessToken } from './instance';
import { API_BASE_URL } from './config';

// ============================================
// PAYMENTS API
// ============================================

export const paymentsAPI = {
  getPayments: (params?: any) =>
    api.get('/payments/', { params }),

  getPayment: (id: string) =>
    api.get(`/payments/${id}/`),

  createPayment: (data: any) =>
    api.post('/payments/', data),

  updatePayment: (id: string, data: any) =>
    api.put(`/payments/${id}/`, data),

  initializePayment: (id: string) =>
    api.post(`/payments/${id}/initialize_payment/`),

  verifyPayment: async (id: string) => {
    try {
      return await api.get(`/payments/${id}/verify_payment/`);
    } catch (axiosErr: any) {
      // Fallback: use native fetch if axios fails with network error
      if (axiosErr?.code === 'ERR_NETWORK' || axiosErr?.message?.includes('Network Error')) {
        if (__DEV__) console.log('[API] Axios network error, falling back to native fetch for payment verification');
        const token = await getAccessToken();
        const response = await fetch(`${API_BASE_URL}/payments/${id}/verify_payment/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error: any = new Error(`HTTP ${response.status}`);
          error.response = { status: response.status, data: errorData };
          throw error;
        }
        const data = await response.json();
        return { data, status: response.status, headers: {} };
      }
      throw axiosErr;
    }
  },

  processMtnMoney: (id: string, data?: { phone?: string }) =>
    api.post(`/payments/${id}/process_mtn_money/`, data || {}),

  processOrangeMoney: (id: string, data?: { phone?: string }) =>
    api.post(`/payments/${id}/process_orange_money/`, data || {}),

  getPaymentHistory: () =>
    api.get('/payments/'),

  calculateUsageFees: (id: string) =>
    api.post(`/payments/${id}/calculate_usage_fees/`),

  cancelPayment: (id: string) =>
    api.post(`/payments/${id}/cancel_payment/`),

  getPaymentMethods: (countryCode: string, currency?: string) => {
    const params: Record<string, string> = { country: countryCode };
    if (currency) params.currency = currency;
    return api.get('/payments/methods/', { params });
  },

  processMobileMoney: (id: string, data: { phone: string; channel?: string }) =>
    api.post(`/payments/${id}/process_mobile_money/`, data),

  // Export — use `useExport()` hook instead.
  // Endpoint kept for reference: GET /payments/export/?status=&export_format=csv|xlsx|pdf
};

// ============================================
// REFUNDS API
// ============================================

export const refundsAPI = {
  getRefunds: (params?: any) =>
    api.get('/refunds/', { params }),

  getRefund: (id: string) =>
    api.get(`/refunds/${id}/`),

  createRefund: (data: any) =>
    api.post('/refunds/', data),

  processRefund: (id: string, data?: any) =>
    api.post(`/refunds/${id}/process_refund/`, data || {}),
};

// ============================================
// INVOICES API
// ============================================

export const invoicesAPI = {
  getInvoices: (params?: any) =>
    api.get('/invoices/', { params }),

  getInvoice: (id: string) =>
    api.get(`/invoices/${id}/`),

  // Renvoie `{ pdf_url }` — ouvrir l'URL via `Linking` ou `expo-web-browser`
  downloadPdf: (id: string) =>
    api.get<{ pdf_url: string }>(`/invoices/${id}/download_pdf/`),
};

// ============================================
// SUBSCRIPTIONS API
// ============================================

export const subscriptionsAPI = {
  getPlans: (countryCode?: string) => {
    const params = countryCode ? { country_code: countryCode } : {};
    return api.get('/subscription-plans/', { params });
  },

  getPrices: (countryCode?: string) => {
    const params = countryCode ? { country_code: countryCode } : {};
    return api.get('/subscription-plans/prices/', { params });
  },

  getCurrentPlan: () =>
    api.get('/subscription-plans/current/'),

  getMySubscription: () =>
    api.get('/subscriptions/my_subscription/'),

  upgrade: (planId: string, billingCycle: 'monthly' | 'yearly') =>
    api.post('/subscriptions/upgrade/', { plan_id: planId, billing_cycle: billingCycle }),

  processPayment: (paymentId: string, paymentMethod: string, phone?: string) =>
    api.post('/subscriptions/process-payment/', {
      payment_id: paymentId,
      payment_method: paymentMethod,
      phone: phone || '',
    }),

  verifyPayment: (paymentId: string) =>
    api.get(`/subscriptions/verify-payment/${paymentId}/`),

  paymentHistory: () =>
    api.get('/subscriptions/payment-history/'),

  cancel: () =>
    api.post('/subscriptions/cancel/'),
};

// ============================================
// WALLET API
// ============================================

export const walletAPI = {
  getMyWallet: () =>
    api.get('/wallet/my_wallet/'),

  updateBankDetails: (data: {
    bank_name?: string;
    bank_account_name?: string;
    bank_account_number?: string;
    mobile_money_number?: string;
    mobile_money_provider?: string;
  }) => api.patch('/wallet/update_bank_details/', data),

  getTransactions: (params?: any) =>
    api.get('/wallet/transactions/', { params }),

  getPendingEarnings: () =>
    api.get('/wallet/pending_earnings/'),

  getStats: () =>
    api.get('/wallet/stats/'),

  // Export — use `useExport()` hook instead.
  // Endpoint kept for reference: GET /wallet/transactions/export/?type=&export_format=csv|xlsx|pdf
};

// ============================================
// PAYOUTS API
// ============================================

export const payoutsAPI = {
  getPayouts: (params?: any) =>
    api.get('/payouts/', { params }),

  getPayout: (id: string) =>
    api.get(`/payouts/${id}/`),

  requestPayout: (data: {
    amount: number;
    payout_method: string;
  }) => api.post('/payouts/request_payout/', data),

  processPayout: (id: string, processData: {
    action: 'approve' | 'reject';
    notes?: string;
    failure_reason?: string;
    transaction_reference?: string;
  }) =>
    api.post(`/payouts/${id}/process/`, processData),

  /**
   * Annule une demande de retrait pending (organisateur uniquement).
   * Re-crédite immédiatement le solde disponible.
   */
  cancelPayout: (id: string) =>
    api.post(`/payouts/${id}/cancel/`),

  getAvailableMethods: (country?: string) => {
    const params = country ? { country } : {};
    return api.get('/payouts/methods/', { params });
  },
};

// ============================================
// COMMISSIONS API
// ============================================

export const commissionsAPI = {
  getCommissions: (params?: any) =>
    api.get('/commissions/', { params }),

  getConfig: (countryCode?: string) => {
    const params = countryCode ? { country_code: countryCode } : {};
    return api.get('/commissions/config/', { params });
  },

  calculate: (ticketPrice: number, countryCode?: string) =>
    api.post('/commissions/calculate/', {
      ticket_price: ticketPrice,
      ...(countryCode ? { country_code: countryCode } : {}),
    }),

  getStats: () =>
    api.get('/commissions/stats/'),

  // Conversion indicative (non contractuelle) - taux hardcodes backend
  convert: (amount: number, from: string, to: string) =>
    api.get('/commissions/convert/', { params: { amount, from, to } }),
};
