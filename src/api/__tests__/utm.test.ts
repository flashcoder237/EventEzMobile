/**
 * Smoke tests pour utmAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { utmAPI } from '../misc';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('utmAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getAll() GETs /utm/ with params', async () => {
    await utmAPI.getAll({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/utm/', { params: { event: 'eid' } });
  });

  it('create() POSTs /utm/', async () => {
    const data = {
      event: 'eid',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
    };
    await utmAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/utm/', data);
  });

  it('getStats() GETs /utm/stats/ with event_id param', async () => {
    await utmAPI.getStats('eid');
    expect(api.get).toHaveBeenCalledWith('/utm/stats/', { params: { event_id: 'eid' } });
  });
});
