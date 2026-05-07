jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { payoutsAPI } from '../payments';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('payoutsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getPayouts(params) → GET /payouts/', async () => {
    await payoutsAPI.getPayouts({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/payouts/', { params: { page: 1 } });
  });

  it('getPayout(id) → GET /payouts/:id/', async () => {
    await payoutsAPI.getPayout('po-1');
    expect(api.get).toHaveBeenCalledWith('/payouts/po-1/');
  });

  it('requestPayout(data) → POST /payouts/request_payout/', async () => {
    const data = { amount: 5000, payout_method: 'bank_transfer' };
    await payoutsAPI.requestPayout(data);
    expect(api.post).toHaveBeenCalledWith('/payouts/request_payout/', data);
  });

  it('processPayout(id, processData) → POST /payouts/:id/process/', async () => {
    const processData = { action: 'approve' as const, notes: 'OK' };
    await payoutsAPI.processPayout('po-1', processData);
    expect(api.post).toHaveBeenCalledWith('/payouts/po-1/process/', processData);
  });

  it('cancelPayout(id) → POST /payouts/:id/cancel/', async () => {
    await payoutsAPI.cancelPayout('po-1');
    expect(api.post).toHaveBeenCalledWith('/payouts/po-1/cancel/');
  });

  it('getAvailableMethods(country) → GET /payouts/methods/ with country', async () => {
    await payoutsAPI.getAvailableMethods('CM');
    expect(api.get).toHaveBeenCalledWith('/payouts/methods/', { params: { country: 'CM' } });
  });
});
