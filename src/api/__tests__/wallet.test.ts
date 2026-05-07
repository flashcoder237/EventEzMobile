jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { walletAPI } from '../payments';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('walletAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getMyWallet() → GET /wallet/my_wallet/', async () => {
    await walletAPI.getMyWallet();
    expect(api.get).toHaveBeenCalledWith('/wallet/my_wallet/');
  });

  it('updateBankDetails(data) → PATCH /wallet/update_bank_details/', async () => {
    const data = { bank_name: 'Ecobank', bank_account_number: '12345' };
    await walletAPI.updateBankDetails(data);
    expect(api.patch).toHaveBeenCalledWith('/wallet/update_bank_details/', data);
  });

  it('getTransactions(params) → GET /wallet/transactions/', async () => {
    await walletAPI.getTransactions({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/wallet/transactions/', { params: { page: 1 } });
  });

  it('getPendingEarnings() → GET /wallet/pending_earnings/', async () => {
    await walletAPI.getPendingEarnings();
    expect(api.get).toHaveBeenCalledWith('/wallet/pending_earnings/');
  });

  it('getStats() → GET /wallet/stats/', async () => {
    await walletAPI.getStats();
    expect(api.get).toHaveBeenCalledWith('/wallet/stats/');
  });
});
