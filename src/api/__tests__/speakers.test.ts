/**
 * Smoke tests pour speakersAPI — vérifie URL + verbe HTTP + body shape.
 * uploadPhoto utilise fetchUpload (multipart) — on vérifie juste l'URL/method.
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

import { speakersAPI } from '../sessions';
import { fetchUpload } from '../config';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

const fetchUploadMock = fetchUpload as jest.Mock;

describe('speakersAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getSpeakers() GETs /speakers/ with params', async () => {
    await speakersAPI.getSpeakers({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/speakers/', { params: { event: 'eid' } });
  });

  it('getSpeaker() GETs /speakers/{id}/', async () => {
    await speakersAPI.getSpeaker('spk');
    expect(api.get).toHaveBeenCalledWith('/speakers/spk/');
  });

  it('createSpeaker() POSTs /speakers/', async () => {
    const data = { name: 'Alice' };
    await speakersAPI.createSpeaker(data);
    expect(api.post).toHaveBeenCalledWith('/speakers/', data);
  });

  it('updateSpeaker() PUTs /speakers/{id}/', async () => {
    const data = { name: 'Bob' };
    await speakersAPI.updateSpeaker('spk', data);
    expect(api.put).toHaveBeenCalledWith('/speakers/spk/', data);
  });

  it('patchSpeaker() PATCHes /speakers/{id}/', async () => {
    const data = { bio: 'updated' };
    await speakersAPI.patchSpeaker('spk', data);
    expect(api.patch).toHaveBeenCalledWith('/speakers/spk/', data);
  });

  it('deleteSpeaker() DELETEs /speakers/{id}/', async () => {
    await speakersAPI.deleteSpeaker('spk');
    expect(api.delete).toHaveBeenCalledWith('/speakers/spk/');
  });

  it('getSpeakerSessions() GETs /speakers/{id}/sessions/', async () => {
    await speakersAPI.getSpeakerSessions('spk');
    expect(api.get).toHaveBeenCalledWith('/speakers/spk/sessions/');
  });

  it('uploadPhoto() calls fetchUpload PATCH /speakers/{id}/', async () => {
    const fd = new FormData();
    await speakersAPI.uploadPhoto('spk', fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('PATCH', '/speakers/spk/', fd);
  });
});
