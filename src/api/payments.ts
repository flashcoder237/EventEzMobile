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
    // Toujours marque source=mobile : permet au backend d'inclure ?source=mobile
    // dans le return_url envoye a NotchPay/CinetPay, pour que la page web
    // /payment/callback/{id} declenche le deep link `eventez://payment-success/{id}`
    // et ferme le navigateur in-app (openAuthSessionAsync).
    api.post('/payments/', { source: 'mobile', ...data }),

  updatePayment: (id: string, data: any) =>
    api.put(`/payments/${id}/`, data),

  initializePayment: (id: string) =>
    // Idem : signale au backend que ce paiement vient du mobile pour le
    // bon return_url. Cf. createPayment ci-dessus.
    api.post(`/payments/${id}/initialize_payment/`, { source: 'mobile' }),

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

  /**
   * Récupère la liste des méthodes de paiement disponibles.
   *
   * Sémantique (mai 2026) :
   * - `countryCode` (param `country` côté API) = pays du PAYEUR. Détermine
   *   les Mobile Money locaux que le payeur peut utiliser.
   * - `eventCountry` (optionnel) = pays de l'EVENT. Si distinct du payeur,
   *   détermine la devise event qui filtre les MoMo compatibles + active
   *   le fallback Stripe (carte/PayPal) si la devise event ∈ Stripe.
   * - `currency` (optionnel) = devise event. Si absente, dérivée de eventCountry.
   *
   * Compat retro : si eventCountry absent, `countryCode` joue les deux rôles
   * (= ancien comportement).
   */
  getPaymentMethods: (countryCode: string, currency?: string, eventCountry?: string) => {
    const params: Record<string, string> = { country: countryCode };
    if (currency) params.currency = currency;
    if (eventCountry) params.event_country = eventCountry;
    return api.get('/payments/methods/', { params });
  },

  processMobileMoney: (id: string, data: { phone: string; channel?: string }) =>
    api.post(`/payments/${id}/process_mobile_money/`, { source: 'mobile', ...data }),

  /**
   * Endpoint generique unifie : cree le Payment + initialise chez le bon
   * gateway (NotchPay ou CinetPay) en une requete. Backend route via
   * PaymentProviderFactory selon (payment_method, country_code).
   *
   * Body :
   *   - registration_id, payment_method (obligatoires)
   *   - billing_email, billing_phone, billing_name (optionnels)
   *   - customer.{name,surname,address,city,country,state,zip_code}
   *     (obligatoire pour carte CinetPay)
   *
   * Retourne payment_url a ouvrir via WebBrowser.openBrowserAsync().
   */
  initiate: (data: {
    registration_id: string;
    payment_method: string;
    billing_email?: string;
    billing_phone?: string;
    billing_name?: string;
    /**
     * Pays ISO 2 lettres du PAYEUR. Distinct du pays event. Permet au backend
     * de router via le channel local du payeur (ex: OMSN pour un Sénégalais
     * qui paie un event ivoirien en XOF).
     */
    payer_country?: string;
    customer?: {
      name?: string;
      surname?: string;
      address?: string;
      city?: string;
      country?: string;
      state?: string;
      zip_code?: string;
    };
  }) => api.post('/payments/initiate/', { source: 'mobile', ...data }),

  /**
   * GET /api/payments/cinetpay/return/ — statut Payment apres redirect CinetPay.
   * Le webhook fait foi pour la mutation du statut ; ce endpoint sert juste a
   * afficher succes/echec/en-cours dans l'ecran de retour mobile.
   */
  cinetpayReturn: (transactionId: string) =>
    api.get('/payments/cinetpay/return/', { params: { transaction_id: transactionId } }),

  /**
   * Liste des pays ou un organisateur peut creer un event (NotchPay +
   * CinetPay + 46 pays Stripe = 59 pays). Endpoint public, auth-free.
   * Utilise par les badges "Pays non disponible" cote UI creation event.
   */
  supportedCountries: () => api.get('/payments/supported-countries/'),

  /**
   * Plafond ticket pour un (country, currency). Public, auth-free.
   * Utilise par EventStep3Pricing pour afficher la limite et valider
   * avant submit.
   */
  ticketPriceCap: (country: string, currency: string) =>
    api.get('/payments/ticket-price-cap/', {
      params: { country, currency },
    }),

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

  /**
   * Phase 2 — Cree (ou regenere) un AccountLink Stripe Connect Express
   * pour l'onboarding KYC de l'organisateur. Retourne `onboarding_url`
   * a ouvrir via WebBrowser.openBrowserAsync(). Le webhook account.updated
   * mettra a jour wallet.stripe_onboarding_complete / stripe_payouts_enabled
   * apres que l'organisateur ait fini.
   */
  stripeOnboardingLink: (params?: { return_url?: string; refresh_url?: string }) =>
    api.post('/wallet/stripe-onboarding-link/', params || {}),

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

  /**
   * Recupere la config commission d'un pays.
   *
   * @param countryCode    Code ISO du pays event
   * @param targetCurrency Devise cible — si fournie ET differente de la devise
   *                       du pays, le backend convertit `fixed_fee` dans cette
   *                       devise. Evite d'afficher un fixed_fee XAF pour un
   *                       event EUR.
   */
  getConfig: (countryCode?: string, targetCurrency?: string, organizerId?: string | number) => {
    const params: Record<string, string> = {};
    if (countryCode) params.country_code = countryCode;
    if (targetCurrency) params.target_currency = targetCurrency;
    // organizer_id : applique un eventuel override de frais (promo lancement)
    // pour que l'apercu == le montant debite.
    if (organizerId !== undefined && organizerId !== null && organizerId !== '') {
      params.organizer_id = String(organizerId);
    }
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
