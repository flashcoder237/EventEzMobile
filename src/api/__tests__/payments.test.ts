/**
 * Smoke tests pour les APIs exposées depuis `src/api/payments.ts`.
 *
 * Couvre toutes les fonctions exportées par ce module source — `paymentsAPI`,
 * `refundsAPI`, `invoicesAPI`, `subscriptionsAPI`, `walletAPI`, `payoutsAPI`
 * et `commissionsAPI` — afin que le mutation testing (qui exécute uniquement
 * `payments.test.ts` pour `payments.ts`) puisse détecter les altérations de
 * verbe HTTP ou d'URL sur n'importe laquelle de ces sous-APIs.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import {
  paymentsAPI,
  refundsAPI,
  invoicesAPI,
  subscriptionsAPI,
  walletAPI,
  payoutsAPI,
  commissionsAPI,
} from '../payments';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('paymentsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getPayments(params) → GET /payments/', async () => {
    await paymentsAPI.getPayments({ status: 'completed' });
    expect(api.get).toHaveBeenCalledWith('/payments/', { params: { status: 'completed' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getPayment(id) → GET /payments/:id/', async () => {
    await paymentsAPI.getPayment('p-1');
    expect(api.get).toHaveBeenCalledWith('/payments/p-1/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('createPayment(data) → POST /payments/', async () => {
    const data = { amount: 1000, method: 'mtn' };
    await paymentsAPI.createPayment(data);
    expect(api.post).toHaveBeenCalledWith('/payments/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('updatePayment(id, data) → PUT /payments/:id/', async () => {
    const data = { status: 'pending' };
    await paymentsAPI.updatePayment('p-1', data);
    expect(api.put).toHaveBeenCalledWith('/payments/p-1/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('initializePayment(id) → POST /payments/:id/initialize_payment/', async () => {
    await paymentsAPI.initializePayment('p-1');
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/initialize_payment/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('verifyPayment(id) → GET /payments/:id/verify_payment/ (axios path)', async () => {
    await paymentsAPI.verifyPayment('p-1');
    expect(api.get).toHaveBeenCalledWith('/payments/p-1/verify_payment/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('processMtnMoney(id, data) → POST /payments/:id/process_mtn_money/', async () => {
    await paymentsAPI.processMtnMoney('p-1', { phone: '+237xxx' });
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/process_mtn_money/', { phone: '+237xxx' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('processOrangeMoney(id, data) → POST /payments/:id/process_orange_money/', async () => {
    await paymentsAPI.processOrangeMoney('p-1', { phone: '+237yyy' });
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/process_orange_money/', { phone: '+237yyy' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getPaymentHistory() → GET /payments/', async () => {
    await paymentsAPI.getPaymentHistory();
    expect(api.get).toHaveBeenCalledWith('/payments/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('calculateUsageFees(id) → POST /payments/:id/calculate_usage_fees/', async () => {
    await paymentsAPI.calculateUsageFees('p-1');
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/calculate_usage_fees/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('cancelPayment(id) → POST /payments/:id/cancel_payment/', async () => {
    await paymentsAPI.cancelPayment('p-1');
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/cancel_payment/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getPaymentMethods(country, currency) → GET /payments/methods/ with params', async () => {
    await paymentsAPI.getPaymentMethods('CM', 'XAF');
    expect(api.get).toHaveBeenCalledWith('/payments/methods/', {
      params: { country: 'CM', currency: 'XAF' },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('processMobileMoney(id, data) → POST /payments/:id/process_mobile_money/', async () => {
    const data = { phone: '+237zzz', channel: 'cm.mtn' };
    await paymentsAPI.processMobileMoney('p-1', data);
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/process_mobile_money/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('initiate(data) → POST /payments/initiate/ (endpoint unifie CinetPay/NotchPay)', async () => {
    const data = {
      registration_id: 'reg-1',
      payment_method: 'moov_money',
      billing_email: 'user@test.com',
      billing_phone: '+22697123456',
    };
    await paymentsAPI.initiate(data);
    expect(api.post).toHaveBeenCalledWith('/payments/initiate/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('cinetpayReturn(transactionId) → GET /payments/cinetpay/return/?transaction_id=', async () => {
    await paymentsAPI.cinetpayReturn('txn-abc');
    expect(api.get).toHaveBeenCalledWith('/payments/cinetpay/return/', {
      params: { transaction_id: 'txn-abc' },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// REFUNDS — colocated to ensure mutation testing covers payments.ts in full.
// ===========================================================================
describe('refundsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getRefunds(params) → GET /refunds/', async () => {
    await refundsAPI.getRefunds({ status: 'pending' });
    expect(api.get).toHaveBeenCalledWith('/refunds/', { params: { status: 'pending' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getRefund(id) → GET /refunds/:id/', async () => {
    await refundsAPI.getRefund('r-1');
    expect(api.get).toHaveBeenCalledWith('/refunds/r-1/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('createRefund(data) → POST /refunds/', async () => {
    const data = { payment: 'p-1', reason: 'duplicate' };
    await refundsAPI.createRefund(data);
    expect(api.post).toHaveBeenCalledWith('/refunds/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('processRefund(id, data) → POST /refunds/:id/process_refund/', async () => {
    const data = { action: 'approve' };
    await refundsAPI.processRefund('r-1', data);
    expect(api.post).toHaveBeenCalledWith('/refunds/r-1/process_refund/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// INVOICES
// ===========================================================================
describe('invoicesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getInvoices(params) → GET /invoices/', async () => {
    await invoicesAPI.getInvoices({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/invoices/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getInvoice(id) → GET /invoices/:id/', async () => {
    await invoicesAPI.getInvoice('inv-1');
    expect(api.get).toHaveBeenCalledWith('/invoices/inv-1/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('downloadPdf(id) → GET /invoices/:id/download_pdf/', async () => {
    await invoicesAPI.downloadPdf('inv-1');
    expect(api.get).toHaveBeenCalledWith('/invoices/inv-1/download_pdf/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// SUBSCRIPTIONS
// ===========================================================================
describe('subscriptionsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getPlans(country) → GET /subscription-plans/ with country_code', async () => {
    await subscriptionsAPI.getPlans('CM');
    expect(api.get).toHaveBeenCalledWith('/subscription-plans/', { params: { country_code: 'CM' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getPrices(country) → GET /subscription-plans/prices/ with country_code', async () => {
    await subscriptionsAPI.getPrices('CM');
    expect(api.get).toHaveBeenCalledWith('/subscription-plans/prices/', { params: { country_code: 'CM' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getCurrentPlan() → GET /subscription-plans/current/', async () => {
    await subscriptionsAPI.getCurrentPlan();
    expect(api.get).toHaveBeenCalledWith('/subscription-plans/current/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getMySubscription() → GET /subscriptions/my_subscription/', async () => {
    await subscriptionsAPI.getMySubscription();
    expect(api.get).toHaveBeenCalledWith('/subscriptions/my_subscription/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('upgrade(planId, billingCycle) → POST /subscriptions/upgrade/', async () => {
    await subscriptionsAPI.upgrade('plan-2', 'yearly');
    expect(api.post).toHaveBeenCalledWith('/subscriptions/upgrade/', {
      plan_id: 'plan-2',
      billing_cycle: 'yearly',
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('processPayment(paymentId, method, phone) → POST /subscriptions/process-payment/', async () => {
    await subscriptionsAPI.processPayment('pay-1', 'mtn', '+237aaa');
    expect(api.post).toHaveBeenCalledWith('/subscriptions/process-payment/', {
      payment_id: 'pay-1',
      payment_method: 'mtn',
      phone: '+237aaa',
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('verifyPayment(paymentId) → GET /subscriptions/verify-payment/:id/', async () => {
    await subscriptionsAPI.verifyPayment('pay-1');
    expect(api.get).toHaveBeenCalledWith('/subscriptions/verify-payment/pay-1/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('paymentHistory() → GET /subscriptions/payment-history/', async () => {
    await subscriptionsAPI.paymentHistory();
    expect(api.get).toHaveBeenCalledWith('/subscriptions/payment-history/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('cancel() → POST /subscriptions/cancel/', async () => {
    await subscriptionsAPI.cancel();
    expect(api.post).toHaveBeenCalledWith('/subscriptions/cancel/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// WALLET
// ===========================================================================
describe('walletAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getMyWallet() → GET /wallet/my_wallet/', async () => {
    await walletAPI.getMyWallet();
    expect(api.get).toHaveBeenCalledWith('/wallet/my_wallet/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('updateBankDetails(data) → PATCH /wallet/update_bank_details/', async () => {
    const data = { bank_name: 'Ecobank', bank_account_number: '12345' };
    await walletAPI.updateBankDetails(data);
    expect(api.patch).toHaveBeenCalledWith('/wallet/update_bank_details/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getTransactions(params) → GET /wallet/transactions/', async () => {
    await walletAPI.getTransactions({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/wallet/transactions/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getPendingEarnings() → GET /wallet/pending_earnings/', async () => {
    await walletAPI.getPendingEarnings();
    expect(api.get).toHaveBeenCalledWith('/wallet/pending_earnings/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getStats() → GET /wallet/stats/', async () => {
    await walletAPI.getStats();
    expect(api.get).toHaveBeenCalledWith('/wallet/stats/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// PAYOUTS
// ===========================================================================
describe('payoutsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getPayouts(params) → GET /payouts/', async () => {
    await payoutsAPI.getPayouts({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/payouts/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getPayout(id) → GET /payouts/:id/', async () => {
    await payoutsAPI.getPayout('po-1');
    expect(api.get).toHaveBeenCalledWith('/payouts/po-1/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('requestPayout(data) → POST /payouts/request_payout/', async () => {
    const data = { amount: 5000, payout_method: 'bank_transfer' };
    await payoutsAPI.requestPayout(data);
    expect(api.post).toHaveBeenCalledWith('/payouts/request_payout/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('processPayout(id, processData) → POST /payouts/:id/process/', async () => {
    const processData = { action: 'approve' as const, notes: 'OK' };
    await payoutsAPI.processPayout('po-1', processData);
    expect(api.post).toHaveBeenCalledWith('/payouts/po-1/process/', processData);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('cancelPayout(id) → POST /payouts/:id/cancel/', async () => {
    await payoutsAPI.cancelPayout('po-1');
    expect(api.post).toHaveBeenCalledWith('/payouts/po-1/cancel/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getAvailableMethods(country) → GET /payouts/methods/ with country', async () => {
    await payoutsAPI.getAvailableMethods('CM');
    expect(api.get).toHaveBeenCalledWith('/payouts/methods/', { params: { country: 'CM' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// COMMISSIONS
// ===========================================================================
describe('commissionsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getCommissions(params) → GET /commissions/', async () => {
    await commissionsAPI.getCommissions({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/commissions/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getConfig(country) → GET /commissions/config/ with country_code', async () => {
    await commissionsAPI.getConfig('CM');
    expect(api.get).toHaveBeenCalledWith('/commissions/config/', { params: { country_code: 'CM' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('calculate(price, country) → POST /commissions/calculate/', async () => {
    await commissionsAPI.calculate(10000, 'CM');
    expect(api.post).toHaveBeenCalledWith('/commissions/calculate/', {
      ticket_price: 10000,
      country_code: 'CM',
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getStats() → GET /commissions/stats/', async () => {
    await commissionsAPI.getStats();
    expect(api.get).toHaveBeenCalledWith('/commissions/stats/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('convert(amount, from, to) → GET /commissions/convert/ with params', async () => {
    await commissionsAPI.convert(100, 'XAF', 'EUR');
    expect(api.get).toHaveBeenCalledWith('/commissions/convert/', {
      params: { amount: 100, from: 'XAF', to: 'EUR' },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
