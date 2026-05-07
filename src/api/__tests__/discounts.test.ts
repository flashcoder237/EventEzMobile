jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { discountsAPI } from '../tickets';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('discountsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getDiscounts() → GET /discounts/ with params', async () => {
    await discountsAPI.getDiscounts({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/discounts/', { params: { page: 1 } });
  });

  it('getDiscount(id) → GET /discounts/:id/', async () => {
    await discountsAPI.getDiscount('42');
    expect(api.get).toHaveBeenCalledWith('/discounts/42/');
  });

  it('createDiscount(data) → POST /discounts/', async () => {
    const data = { code: 'SUMMER', percent: 10 };
    await discountsAPI.createDiscount(data);
    expect(api.post).toHaveBeenCalledWith('/discounts/', data);
  });

  it('updateDiscount(id, data) → PUT /discounts/:id/', async () => {
    const data = { code: 'WINTER' };
    await discountsAPI.updateDiscount('7', data);
    expect(api.put).toHaveBeenCalledWith('/discounts/7/', data);
  });

  it('patchDiscount(id, data) → PATCH /discounts/:id/', async () => {
    const data = { percent: 20 };
    await discountsAPI.patchDiscount('7', data);
    expect(api.patch).toHaveBeenCalledWith('/discounts/7/', data);
  });

  it('deleteDiscount(id) → DELETE /discounts/:id/', async () => {
    await discountsAPI.deleteDiscount('7');
    expect(api.delete).toHaveBeenCalledWith('/discounts/7/');
  });

  it('validateDiscount(code, eventId, ticketTypeId, subtotal) → POST /discounts/validate_code/', async () => {
    await discountsAPI.validateDiscount('SUMMER', 'evt-1', 'tt-1', 5000);
    expect(api.post).toHaveBeenCalledWith('/discounts/validate_code/', {
      code: 'SUMMER',
      event: 'evt-1',
      ticket_type: 'tt-1',
      subtotal: 5000,
    });
  });
});
