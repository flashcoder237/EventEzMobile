/**
 * Smoke tests pour sessionRegistrationsAPI — vérifie URL + verbe HTTP + body shape.
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

import { sessionRegistrationsAPI } from '../sessions';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('sessionRegistrationsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getSessionRegistrations() GETs /session-registrations/ with params', async () => {
    await sessionRegistrationsAPI.getSessionRegistrations({ session: 'sid' });
    expect(api.get).toHaveBeenCalledWith('/session-registrations/', { params: { session: 'sid' } });
  });

  it('getSessionRegistration() GETs /session-registrations/{id}/', async () => {
    await sessionRegistrationsAPI.getSessionRegistration('rid');
    expect(api.get).toHaveBeenCalledWith('/session-registrations/rid/');
  });

  it('createSessionRegistration() POSTs /session-registrations/', async () => {
    const data = { session: 'sid' };
    await sessionRegistrationsAPI.createSessionRegistration(data);
    expect(api.post).toHaveBeenCalledWith('/session-registrations/', data);
  });

  it('updateSessionRegistration() PUTs /session-registrations/{id}/', async () => {
    const data = { status: 'confirmed' };
    await sessionRegistrationsAPI.updateSessionRegistration('rid', data);
    expect(api.put).toHaveBeenCalledWith('/session-registrations/rid/', data);
  });

  it('deleteSessionRegistration() DELETEs /session-registrations/{id}/', async () => {
    await sessionRegistrationsAPI.deleteSessionRegistration('rid');
    expect(api.delete).toHaveBeenCalledWith('/session-registrations/rid/');
  });
});
