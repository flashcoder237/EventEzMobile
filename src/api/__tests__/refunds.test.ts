jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { refundsAPI } from '../payments';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('refundsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getRefunds(params) → GET /refunds/', async () => {
    await refundsAPI.getRefunds({ status: 'pending' });
    expect(api.get).toHaveBeenCalledWith('/refunds/', { params: { status: 'pending' } });
  });

  it('getRefund(id) → GET /refunds/:id/', async () => {
    await refundsAPI.getRefund('r-1');
    expect(api.get).toHaveBeenCalledWith('/refunds/r-1/');
  });

  it('createRefund(data) → POST /refunds/', async () => {
    const data = { payment: 'p-1', reason: 'duplicate' };
    await refundsAPI.createRefund(data);
    expect(api.post).toHaveBeenCalledWith('/refunds/', data);
  });

  it('processRefund(id, data) → POST /refunds/:id/process_refund/', async () => {
    const data = { action: 'approve' };
    await refundsAPI.processRefund('r-1', data);
    expect(api.post).toHaveBeenCalledWith('/refunds/r-1/process_refund/', data);
  });
});
