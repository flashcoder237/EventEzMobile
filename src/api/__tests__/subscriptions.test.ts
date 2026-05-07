jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { subscriptionsAPI } from '../payments';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('subscriptionsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getPlans(country) → GET /subscription-plans/ with country_code', async () => {
    await subscriptionsAPI.getPlans('CM');
    expect(api.get).toHaveBeenCalledWith('/subscription-plans/', { params: { country_code: 'CM' } });
  });

  it('getPrices(country) → GET /subscription-plans/prices/ with country_code', async () => {
    await subscriptionsAPI.getPrices('CM');
    expect(api.get).toHaveBeenCalledWith('/subscription-plans/prices/', { params: { country_code: 'CM' } });
  });

  it('getCurrentPlan() → GET /subscription-plans/current/', async () => {
    await subscriptionsAPI.getCurrentPlan();
    expect(api.get).toHaveBeenCalledWith('/subscription-plans/current/');
  });

  it('getMySubscription() → GET /subscriptions/my_subscription/', async () => {
    await subscriptionsAPI.getMySubscription();
    expect(api.get).toHaveBeenCalledWith('/subscriptions/my_subscription/');
  });

  it('upgrade(planId, billingCycle) → POST /subscriptions/upgrade/', async () => {
    await subscriptionsAPI.upgrade('plan-2', 'yearly');
    expect(api.post).toHaveBeenCalledWith('/subscriptions/upgrade/', {
      plan_id: 'plan-2',
      billing_cycle: 'yearly',
    });
  });

  it('processPayment(paymentId, method, phone) → POST /subscriptions/process-payment/', async () => {
    await subscriptionsAPI.processPayment('pay-1', 'mtn', '+237aaa');
    expect(api.post).toHaveBeenCalledWith('/subscriptions/process-payment/', {
      payment_id: 'pay-1',
      payment_method: 'mtn',
      phone: '+237aaa',
    });
  });

  it('verifyPayment(paymentId) → GET /subscriptions/verify-payment/:id/', async () => {
    await subscriptionsAPI.verifyPayment('pay-1');
    expect(api.get).toHaveBeenCalledWith('/subscriptions/verify-payment/pay-1/');
  });

  it('paymentHistory() → GET /subscriptions/payment-history/', async () => {
    await subscriptionsAPI.paymentHistory();
    expect(api.get).toHaveBeenCalledWith('/subscriptions/payment-history/');
  });

  it('cancel() → POST /subscriptions/cancel/', async () => {
    await subscriptionsAPI.cancel();
    expect(api.post).toHaveBeenCalledWith('/subscriptions/cancel/');
  });
});
