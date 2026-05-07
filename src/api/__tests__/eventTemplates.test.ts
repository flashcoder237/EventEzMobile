/**
 * Smoke tests pour eventTemplatesAPI — vérifie URL + verbe HTTP + body shape.
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

import { eventTemplatesAPI } from '../events';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('eventTemplatesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getAll() GETs /event-templates/ with params', async () => {
    await eventTemplatesAPI.getAll({ type: 'concert' });
    expect(api.get).toHaveBeenCalledWith('/event-templates/', { params: { type: 'concert' } });
  });

  it('getById() GETs /event-templates/{id}/', async () => {
    await eventTemplatesAPI.getById('tid');
    expect(api.get).toHaveBeenCalledWith('/event-templates/tid/');
  });
});
