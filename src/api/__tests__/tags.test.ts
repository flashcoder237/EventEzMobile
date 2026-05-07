/**
 * Smoke tests pour tagsAPI — vérifie URL + verbe HTTP.
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

import { tagsAPI } from '../events';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('tagsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getTags() GETs /tags/ with params', async () => {
    await tagsAPI.getTags({ q: 'x' });
    expect(api.get).toHaveBeenCalledWith('/tags/', { params: { q: 'x' } });
  });

  it('getTag() GETs /tags/{id}/', async () => {
    await tagsAPI.getTag(7);
    expect(api.get).toHaveBeenCalledWith('/tags/7/');
  });
});
