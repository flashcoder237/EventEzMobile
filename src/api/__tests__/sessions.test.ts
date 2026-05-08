/**
 * Smoke tests pour les APIs exposées depuis `src/api/sessions.ts`.
 *
 * Couvre `sessionsAPI`, `sessionRegistrationsAPI`, `sessionResourcesAPI`,
 * `speakersAPI` et `tracksAPI` colocalisées, afin que le mutation testing
 * (qui exécute uniquement `sessions.test.ts` pour `sessions.ts`) détecte les
 * altérations de verbe HTTP ou d'URL sur n'importe laquelle de ces sous-APIs.
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

import {
  sessionsAPI,
  sessionRegistrationsAPI,
  sessionResourcesAPI,
  speakersAPI,
  tracksAPI,
} from '../sessions';
import { fetchUpload } from '../config';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

const fetchUploadMock = fetchUpload as jest.Mock;

const expectOnly = (
  api: ReturnType<typeof getMockedApi>,
  used: 'get' | 'post' | 'put' | 'patch' | 'delete',
) => {
  const verbs: Array<'get' | 'post' | 'put' | 'patch' | 'delete'> = [
    'get',
    'post',
    'put',
    'patch',
    'delete',
  ];
  for (const verb of verbs) {
    if (verb !== used) expect(api[verb]).not.toHaveBeenCalled();
  }
};

describe('sessionsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getSessions() GETs /sessions/ with params', async () => {
    await sessionsAPI.getSessions({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/sessions/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getSession() GETs /sessions/{id}/', async () => {
    await sessionsAPI.getSession('sid');
    expect(api.get).toHaveBeenCalledWith('/sessions/sid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('createSession() POSTs /sessions/', async () => {
    const data = { title: 'X' };
    await sessionsAPI.createSession(data);
    expect(api.post).toHaveBeenCalledWith('/sessions/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('updateSession() PUTs /sessions/{id}/', async () => {
    const data = { title: 'Y' };
    await sessionsAPI.updateSession('sid', data);
    expect(api.put).toHaveBeenCalledWith('/sessions/sid/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expectOnly(api, 'put');
  });

  it('deleteSession() DELETEs /sessions/{id}/', async () => {
    await sessionsAPI.deleteSession('sid');
    expect(api.delete).toHaveBeenCalledWith('/sessions/sid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });

  it('getCalendar() GETs /sessions/calendar/ with params', async () => {
    await sessionsAPI.getCalendar({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/sessions/calendar/', { params: { event: 'eid' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getMySessions() GETs /sessions/my_sessions/', async () => {
    await sessionsAPI.getMySessions();
    expect(api.get).toHaveBeenCalledWith('/sessions/my_sessions/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('registerToSession() POSTs /sessions/{id}/register/', async () => {
    await sessionsAPI.registerToSession('sid');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/register/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('unregisterFromSession() POSTs /sessions/{id}/unregister/', async () => {
    await sessionsAPI.unregisterFromSession('sid');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/unregister/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('markAttended() POSTs /sessions/{id}/mark_attended/ with data', async () => {
    await sessionsAPI.markAttended('sid', { user_id: 'u1' });
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/mark_attended/', { user_id: 'u1' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('markAttended() POSTs /sessions/{id}/mark_attended/ with empty body when no data', async () => {
    await sessionsAPI.markAttended('sid');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/mark_attended/', {});
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('scanAttendance() POSTs /sessions/{id}/scan_attendance/ with code', async () => {
    await sessionsAPI.scanAttendance('sid', 'QR-CODE');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/scan_attendance/', { code: 'QR-CODE' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('getAttendees() GETs /sessions/{id}/attendees/', async () => {
    await sessionsAPI.getAttendees('sid');
    expect(api.get).toHaveBeenCalledWith('/sessions/sid/attendees/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getStatistics() GETs /sessions/{id}/statistics/', async () => {
    await sessionsAPI.getStatistics('sid');
    expect(api.get).toHaveBeenCalledWith('/sessions/sid/statistics/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('addResource() POSTs /sessions/{id}/add_resource/ with body', async () => {
    const data = { title: 'res' };
    await sessionsAPI.addResource('sid', data);
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/add_resource/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('joinWaitlist() POSTs /sessions/{id}/join_waitlist/', async () => {
    await sessionsAPI.joinWaitlist('sid');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/join_waitlist/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('getWaitlistStatus() GETs /sessions/{id}/waitlist_status/', async () => {
    await sessionsAPI.getWaitlistStatus('sid');
    expect(api.get).toHaveBeenCalledWith('/sessions/sid/waitlist_status/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('leaveWaitlist() POSTs /sessions/{id}/leave_waitlist/', async () => {
    await sessionsAPI.leaveWaitlist('sid');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/leave_waitlist/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });
});

describe('sessionRegistrationsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getSessionRegistrations() GETs /session-registrations/ with params', async () => {
    await sessionRegistrationsAPI.getSessionRegistrations({ session: 'sid' });
    expect(api.get).toHaveBeenCalledWith('/session-registrations/', { params: { session: 'sid' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getSessionRegistration() GETs /session-registrations/{id}/', async () => {
    await sessionRegistrationsAPI.getSessionRegistration('rid');
    expect(api.get).toHaveBeenCalledWith('/session-registrations/rid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('createSessionRegistration() POSTs /session-registrations/', async () => {
    const data = { session: 'sid' };
    await sessionRegistrationsAPI.createSessionRegistration(data);
    expect(api.post).toHaveBeenCalledWith('/session-registrations/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('updateSessionRegistration() PUTs /session-registrations/{id}/', async () => {
    const data = { status: 'confirmed' };
    await sessionRegistrationsAPI.updateSessionRegistration('rid', data);
    expect(api.put).toHaveBeenCalledWith('/session-registrations/rid/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expectOnly(api, 'put');
  });

  it('deleteSessionRegistration() DELETEs /session-registrations/{id}/', async () => {
    await sessionRegistrationsAPI.deleteSessionRegistration('rid');
    expect(api.delete).toHaveBeenCalledWith('/session-registrations/rid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });
});

describe('sessionResourcesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getSessionResources() GETs /session-resources/ with params', async () => {
    await sessionResourcesAPI.getSessionResources({ session: 'sid' });
    expect(api.get).toHaveBeenCalledWith('/session-resources/', { params: { session: 'sid' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getSessionResource() GETs /session-resources/{id}/', async () => {
    await sessionResourcesAPI.getSessionResource('rid');
    expect(api.get).toHaveBeenCalledWith('/session-resources/rid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('createSessionResource() POSTs /session-resources/', async () => {
    const data = { title: 'res' };
    await sessionResourcesAPI.createSessionResource(data);
    expect(api.post).toHaveBeenCalledWith('/session-resources/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('updateSessionResource() PUTs /session-resources/{id}/', async () => {
    const data = { title: 'updated' };
    await sessionResourcesAPI.updateSessionResource('rid', data);
    expect(api.put).toHaveBeenCalledWith('/session-resources/rid/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expectOnly(api, 'put');
  });

  it('deleteSessionResource() DELETEs /session-resources/{id}/', async () => {
    await sessionResourcesAPI.deleteSessionResource('rid');
    expect(api.delete).toHaveBeenCalledWith('/session-resources/rid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });

  it('downloadResource() POSTs /session-resources/{id}/download/', async () => {
    await sessionResourcesAPI.downloadResource('rid');
    expect(api.post).toHaveBeenCalledWith('/session-resources/rid/download/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });
});

describe('speakersAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getSpeakers() GETs /speakers/ with params', async () => {
    await speakersAPI.getSpeakers({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/speakers/', { params: { event: 'eid' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getSpeaker() GETs /speakers/{id}/', async () => {
    await speakersAPI.getSpeaker('spk');
    expect(api.get).toHaveBeenCalledWith('/speakers/spk/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('createSpeaker() POSTs /speakers/', async () => {
    const data = { name: 'Alice' };
    await speakersAPI.createSpeaker(data);
    expect(api.post).toHaveBeenCalledWith('/speakers/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('updateSpeaker() PUTs /speakers/{id}/', async () => {
    const data = { name: 'Bob' };
    await speakersAPI.updateSpeaker('spk', data);
    expect(api.put).toHaveBeenCalledWith('/speakers/spk/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expectOnly(api, 'put');
  });

  it('patchSpeaker() PATCHes /speakers/{id}/', async () => {
    const data = { bio: 'updated' };
    await speakersAPI.patchSpeaker('spk', data);
    expect(api.patch).toHaveBeenCalledWith('/speakers/spk/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expectOnly(api, 'patch');
  });

  it('deleteSpeaker() DELETEs /speakers/{id}/', async () => {
    await speakersAPI.deleteSpeaker('spk');
    expect(api.delete).toHaveBeenCalledWith('/speakers/spk/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });

  it('getSpeakerSessions() GETs /speakers/{id}/sessions/', async () => {
    await speakersAPI.getSpeakerSessions('spk');
    expect(api.get).toHaveBeenCalledWith('/speakers/spk/sessions/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('uploadPhoto() calls fetchUpload PATCH /speakers/{id}/', async () => {
    const fd = new FormData();
    await speakersAPI.uploadPhoto('spk', fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('PATCH', '/speakers/spk/', fd);
    expect(fetchUploadMock).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

describe('tracksAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getTracks() GETs /tracks/ with params', async () => {
    await tracksAPI.getTracks({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/tracks/', { params: { event: 'eid' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getTrack() GETs /tracks/{id}/', async () => {
    await tracksAPI.getTrack('tid');
    expect(api.get).toHaveBeenCalledWith('/tracks/tid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('createTrack() POSTs /tracks/', async () => {
    const data = { name: 'Track A' };
    await tracksAPI.createTrack(data);
    expect(api.post).toHaveBeenCalledWith('/tracks/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('updateTrack() PUTs /tracks/{id}/', async () => {
    const data = { name: 'Track B' };
    await tracksAPI.updateTrack('tid', data);
    expect(api.put).toHaveBeenCalledWith('/tracks/tid/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expectOnly(api, 'put');
  });

  it('deleteTrack() DELETEs /tracks/{id}/', async () => {
    await tracksAPI.deleteTrack('tid');
    expect(api.delete).toHaveBeenCalledWith('/tracks/tid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });
});
