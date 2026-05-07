/**
 * Smoke tests pour referralsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { referralsAPI } from '../social';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('referralsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getCodes() GETs /referrals/codes/ with params', async () => {
    await referralsAPI.getCodes({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/referrals/codes/', { params: { page: 1 } });
  });

  it('getCode() GETs /referrals/codes/{id}/', async () => {
    await referralsAPI.getCode('cid');
    expect(api.get).toHaveBeenCalledWith('/referrals/codes/cid/');
  });

  it('createCode() POSTs /referrals/codes/', async () => {
    const data = { code_type: 'general', commission_percentage: 10 };
    await referralsAPI.createCode(data);
    expect(api.post).toHaveBeenCalledWith('/referrals/codes/', data);
  });

  it('updateCode() PATCHs /referrals/codes/{id}/', async () => {
    const data = { commission_percentage: 15 };
    await referralsAPI.updateCode('cid', data);
    expect(api.patch).toHaveBeenCalledWith('/referrals/codes/cid/', data);
  });

  it('deleteCode() DELETEs /referrals/codes/{id}/', async () => {
    await referralsAPI.deleteCode('cid');
    expect(api.delete).toHaveBeenCalledWith('/referrals/codes/cid/');
  });

  it('getStats() GETs /referrals/codes/{id}/stats/', async () => {
    await referralsAPI.getStats('cid');
    expect(api.get).toHaveBeenCalledWith('/referrals/codes/cid/stats/');
  });

  it('trackClick() POSTs /referrals/track/ with code', async () => {
    await referralsAPI.trackClick('ABC123');
    expect(api.post).toHaveBeenCalledWith('/referrals/track/', { code: 'ABC123' });
  });
});
