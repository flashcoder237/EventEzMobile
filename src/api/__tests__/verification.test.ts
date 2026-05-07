/**
 * Smoke tests pour verificationAPI — vérifie URL + verbe HTTP + body shape.
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

import { verificationAPI } from '../auth';
import { fetchUpload } from '../config';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

const fetchUploadMock = fetchUpload as jest.Mock;

describe('verificationAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('submit() calls fetchUpload POST /verifications/submit/', async () => {
    const fd = new FormData();
    await verificationAPI.submit(fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/verifications/submit/', fd);
  });

  it('getMyRequest() GETs /verifications/my_request/', async () => {
    await verificationAPI.getMyRequest();
    expect(api.get).toHaveBeenCalledWith('/verifications/my_request/');
  });

  it('getPending() GETs /verifications/pending/', async () => {
    await verificationAPI.getPending();
    expect(api.get).toHaveBeenCalledWith('/verifications/pending/');
  });

  it('approve() POSTs /verifications/{id}/approve/', async () => {
    await verificationAPI.approve(42);
    expect(api.post).toHaveBeenCalledWith('/verifications/42/approve/');
  });

  it('reject() POSTs /verifications/{id}/reject/ with reason', async () => {
    await verificationAPI.reject(42, 'spam');
    expect(api.post).toHaveBeenCalledWith('/verifications/42/reject/', { reason: 'spam' });
  });
});
