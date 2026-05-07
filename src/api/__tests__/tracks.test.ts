/**
 * Smoke tests pour tracksAPI — vérifie URL + verbe HTTP + body shape.
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

import { tracksAPI } from '../sessions';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('tracksAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getTracks() GETs /tracks/ with params', async () => {
    await tracksAPI.getTracks({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/tracks/', { params: { event: 'eid' } });
  });

  it('getTrack() GETs /tracks/{id}/', async () => {
    await tracksAPI.getTrack('tid');
    expect(api.get).toHaveBeenCalledWith('/tracks/tid/');
  });

  it('createTrack() POSTs /tracks/', async () => {
    const data = { name: 'Track A' };
    await tracksAPI.createTrack(data);
    expect(api.post).toHaveBeenCalledWith('/tracks/', data);
  });

  it('updateTrack() PUTs /tracks/{id}/', async () => {
    const data = { name: 'Track B' };
    await tracksAPI.updateTrack('tid', data);
    expect(api.put).toHaveBeenCalledWith('/tracks/tid/', data);
  });

  it('deleteTrack() DELETEs /tracks/{id}/', async () => {
    await tracksAPI.deleteTrack('tid');
    expect(api.delete).toHaveBeenCalledWith('/tracks/tid/');
  });
});
