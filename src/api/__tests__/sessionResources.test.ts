/**
 * Smoke tests pour sessionResourcesAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

jest.mock('../config', () => ({
  __esModule: true,
  API_BASE_URL: 'http://test.local/api',
  SERVER_BASE_URL: 'http://test.local',
  ACCESS_TOKEN_KEY: 'eventez_access_token',
  REFRESH_TOKEN_KEY: 'eventez_refresh_token',
  getMediaUrl: jest.fn(),
  fetchUpload: jest.fn(() => Promise.resolve({ data: {} })),
}));

import { sessionResourcesAPI } from '../sessions';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('sessionResourcesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getSessionResources() GETs /session-resources/ with params', async () => {
    await sessionResourcesAPI.getSessionResources({ session: 'sid' });
    expect(api.get).toHaveBeenCalledWith('/session-resources/', { params: { session: 'sid' } });
  });

  it('getSessionResource() GETs /session-resources/{id}/', async () => {
    await sessionResourcesAPI.getSessionResource('rid');
    expect(api.get).toHaveBeenCalledWith('/session-resources/rid/');
  });

  it('createSessionResource() POSTs /session-resources/', async () => {
    const data = { title: 'res' };
    await sessionResourcesAPI.createSessionResource(data);
    expect(api.post).toHaveBeenCalledWith('/session-resources/', data);
  });

  it('updateSessionResource() PUTs /session-resources/{id}/', async () => {
    const data = { title: 'updated' };
    await sessionResourcesAPI.updateSessionResource('rid', data);
    expect(api.put).toHaveBeenCalledWith('/session-resources/rid/', data);
  });

  it('deleteSessionResource() DELETEs /session-resources/{id}/', async () => {
    await sessionResourcesAPI.deleteSessionResource('rid');
    expect(api.delete).toHaveBeenCalledWith('/session-resources/rid/');
  });

  it('downloadResource() POSTs /session-resources/{id}/download/', async () => {
    await sessionResourcesAPI.downloadResource('rid');
    expect(api.post).toHaveBeenCalledWith('/session-resources/rid/download/');
  });
});
