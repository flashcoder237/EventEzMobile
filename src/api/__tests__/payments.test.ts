jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { paymentsAPI } from '../payments';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('paymentsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getPayments(params) → GET /payments/', async () => {
    await paymentsAPI.getPayments({ status: 'completed' });
    expect(api.get).toHaveBeenCalledWith('/payments/', { params: { status: 'completed' } });
  });

  it('getPayment(id) → GET /payments/:id/', async () => {
    await paymentsAPI.getPayment('p-1');
    expect(api.get).toHaveBeenCalledWith('/payments/p-1/');
  });

  it('createPayment(data) → POST /payments/', async () => {
    const data = { amount: 1000, method: 'mtn' };
    await paymentsAPI.createPayment(data);
    expect(api.post).toHaveBeenCalledWith('/payments/', data);
  });

  it('updatePayment(id, data) → PUT /payments/:id/', async () => {
    const data = { status: 'pending' };
    await paymentsAPI.updatePayment('p-1', data);
    expect(api.put).toHaveBeenCalledWith('/payments/p-1/', data);
  });

  it('initializePayment(id) → POST /payments/:id/initialize_payment/', async () => {
    await paymentsAPI.initializePayment('p-1');
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/initialize_payment/');
  });

  it('verifyPayment(id) → GET /payments/:id/verify_payment/ (axios path)', async () => {
    await paymentsAPI.verifyPayment('p-1');
    expect(api.get).toHaveBeenCalledWith('/payments/p-1/verify_payment/');
  });

  it('processMtnMoney(id, data) → POST /payments/:id/process_mtn_money/', async () => {
    await paymentsAPI.processMtnMoney('p-1', { phone: '+237xxx' });
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/process_mtn_money/', { phone: '+237xxx' });
  });

  it('processOrangeMoney(id, data) → POST /payments/:id/process_orange_money/', async () => {
    await paymentsAPI.processOrangeMoney('p-1', { phone: '+237yyy' });
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/process_orange_money/', { phone: '+237yyy' });
  });

  it('getPaymentHistory() → GET /payments/', async () => {
    await paymentsAPI.getPaymentHistory();
    expect(api.get).toHaveBeenCalledWith('/payments/');
  });

  it('calculateUsageFees(id) → POST /payments/:id/calculate_usage_fees/', async () => {
    await paymentsAPI.calculateUsageFees('p-1');
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/calculate_usage_fees/');
  });

  it('cancelPayment(id) → POST /payments/:id/cancel_payment/', async () => {
    await paymentsAPI.cancelPayment('p-1');
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/cancel_payment/');
  });

  it('getPaymentMethods(country, currency) → GET /payments/methods/ with params', async () => {
    await paymentsAPI.getPaymentMethods('CM', 'XAF');
    expect(api.get).toHaveBeenCalledWith('/payments/methods/', {
      params: { country: 'CM', currency: 'XAF' },
    });
  });

  it('processMobileMoney(id, data) → POST /payments/:id/process_mobile_money/', async () => {
    const data = { phone: '+237zzz', channel: 'cm.mtn' };
    await paymentsAPI.processMobileMoney('p-1', data);
    expect(api.post).toHaveBeenCalledWith('/payments/p-1/process_mobile_money/', data);
  });
});
