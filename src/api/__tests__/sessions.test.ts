/**
 * Smoke tests pour sessionsAPI — vérifie URL + verbe HTTP + body shape.
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

import { sessionsAPI } from '../sessions';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('sessionsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getSessions() GETs /sessions/ with params', async () => {
    await sessionsAPI.getSessions({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/sessions/', { params: { page: 1 } });
  });

  it('getSession() GETs /sessions/{id}/', async () => {
    await sessionsAPI.getSession('sid');
    expect(api.get).toHaveBeenCalledWith('/sessions/sid/');
  });

  it('createSession() POSTs /sessions/', async () => {
    const data = { title: 'X' };
    await sessionsAPI.createSession(data);
    expect(api.post).toHaveBeenCalledWith('/sessions/', data);
  });

  it('updateSession() PUTs /sessions/{id}/', async () => {
    const data = { title: 'Y' };
    await sessionsAPI.updateSession('sid', data);
    expect(api.put).toHaveBeenCalledWith('/sessions/sid/', data);
  });

  it('deleteSession() DELETEs /sessions/{id}/', async () => {
    await sessionsAPI.deleteSession('sid');
    expect(api.delete).toHaveBeenCalledWith('/sessions/sid/');
  });

  it('getCalendar() GETs /sessions/calendar/ with params', async () => {
    await sessionsAPI.getCalendar({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/sessions/calendar/', { params: { event: 'eid' } });
  });

  it('getMySessions() GETs /sessions/my_sessions/', async () => {
    await sessionsAPI.getMySessions();
    expect(api.get).toHaveBeenCalledWith('/sessions/my_sessions/');
  });

  it('registerToSession() POSTs /sessions/{id}/register/', async () => {
    await sessionsAPI.registerToSession('sid');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/register/');
  });

  it('unregisterFromSession() POSTs /sessions/{id}/unregister/', async () => {
    await sessionsAPI.unregisterFromSession('sid');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/unregister/');
  });

  it('markAttended() POSTs /sessions/{id}/mark_attended/ with data', async () => {
    await sessionsAPI.markAttended('sid', { user_id: 'u1' });
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/mark_attended/', { user_id: 'u1' });
  });

  it('markAttended() POSTs /sessions/{id}/mark_attended/ with empty body when no data', async () => {
    await sessionsAPI.markAttended('sid');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/mark_attended/', {});
  });

  it('scanAttendance() POSTs /sessions/{id}/scan_attendance/ with code', async () => {
    await sessionsAPI.scanAttendance('sid', 'QR-CODE');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/scan_attendance/', { code: 'QR-CODE' });
  });

  it('getAttendees() GETs /sessions/{id}/attendees/', async () => {
    await sessionsAPI.getAttendees('sid');
    expect(api.get).toHaveBeenCalledWith('/sessions/sid/attendees/');
  });

  it('getStatistics() GETs /sessions/{id}/statistics/', async () => {
    await sessionsAPI.getStatistics('sid');
    expect(api.get).toHaveBeenCalledWith('/sessions/sid/statistics/');
  });

  it('addResource() POSTs /sessions/{id}/add_resource/ with body', async () => {
    const data = { title: 'res' };
    await sessionsAPI.addResource('sid', data);
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/add_resource/', data);
  });

  it('joinWaitlist() POSTs /sessions/{id}/join_waitlist/', async () => {
    await sessionsAPI.joinWaitlist('sid');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/join_waitlist/');
  });

  it('getWaitlistStatus() GETs /sessions/{id}/waitlist_status/', async () => {
    await sessionsAPI.getWaitlistStatus('sid');
    expect(api.get).toHaveBeenCalledWith('/sessions/sid/waitlist_status/');
  });

  it('leaveWaitlist() POSTs /sessions/{id}/leave_waitlist/', async () => {
    await sessionsAPI.leaveWaitlist('sid');
    expect(api.post).toHaveBeenCalledWith('/sessions/sid/leave_waitlist/');
  });
});
