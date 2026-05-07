jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { commissionsAPI } from '../payments';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('commissionsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getCommissions(params) → GET /commissions/', async () => {
    await commissionsAPI.getCommissions({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/commissions/', { params: { page: 1 } });
  });

  it('getConfig(country) → GET /commissions/config/ with country_code', async () => {
    await commissionsAPI.getConfig('CM');
    expect(api.get).toHaveBeenCalledWith('/commissions/config/', { params: { country_code: 'CM' } });
  });

  it('calculate(price, country) → POST /commissions/calculate/', async () => {
    await commissionsAPI.calculate(10000, 'CM');
    expect(api.post).toHaveBeenCalledWith('/commissions/calculate/', {
      ticket_price: 10000,
      country_code: 'CM',
    });
  });

  it('getStats() → GET /commissions/stats/', async () => {
    await commissionsAPI.getStats();
    expect(api.get).toHaveBeenCalledWith('/commissions/stats/');
  });

  it('convert(amount, from, to) → GET /commissions/convert/ with params', async () => {
    await commissionsAPI.convert(100, 'XAF', 'EUR');
    expect(api.get).toHaveBeenCalledWith('/commissions/convert/', {
      params: { amount: 100, from: 'XAF', to: 'EUR' },
    });
  });
});
