/**
 * Smoke tests pour socialAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { socialAPI } from '../social';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('socialAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getFeed() GETs /social/feed/ with params', async () => {
    await socialAPI.getFeed({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/social/feed/', { params: { page: 1 } });
  });

  it('getMyFeed() GETs /social/feed/my_feed/', async () => {
    await socialAPI.getMyFeed();
    expect(api.get).toHaveBeenCalledWith('/social/feed/my_feed/');
  });

  it('getEventFeed() GETs /social/feed/event_feed/ with event_id param', async () => {
    await socialAPI.getEventFeed('eid');
    expect(api.get).toHaveBeenCalledWith('/social/feed/event_feed/', { params: { event_id: 'eid' } });
  });

  it('getConnections() GETs /social/connections/ with params', async () => {
    await socialAPI.getConnections({ status: 'pending' });
    expect(api.get).toHaveBeenCalledWith('/social/connections/', { params: { status: 'pending' } });
  });

  it('getMyConnections() GETs /social/connections/my_connections/', async () => {
    await socialAPI.getMyConnections();
    expect(api.get).toHaveBeenCalledWith('/social/connections/my_connections/');
  });

  it('getEventAttendees() GETs /social/connections/event_attendees/ with event_id param', async () => {
    await socialAPI.getEventAttendees('eid');
    expect(api.get).toHaveBeenCalledWith('/social/connections/event_attendees/', {
      params: { event_id: 'eid' },
    });
  });

  it('sendConnectionRequest() POSTs /social/connections/', async () => {
    const data = { receiver: 'u1', event: 'eid', message: 'hi' };
    await socialAPI.sendConnectionRequest(data);
    expect(api.post).toHaveBeenCalledWith('/social/connections/', data);
  });

  it('acceptConnection() POSTs /social/connections/{id}/accept/', async () => {
    await socialAPI.acceptConnection('cid');
    expect(api.post).toHaveBeenCalledWith('/social/connections/cid/accept/');
  });

  it('declineConnection() POSTs /social/connections/{id}/decline/', async () => {
    await socialAPI.declineConnection('cid');
    expect(api.post).toHaveBeenCalledWith('/social/connections/cid/decline/');
  });

  it('cancelConnection() POSTs /social/connections/{id}/cancel/', async () => {
    await socialAPI.cancelConnection('cid');
    expect(api.post).toHaveBeenCalledWith('/social/connections/cid/cancel/');
  });
});
