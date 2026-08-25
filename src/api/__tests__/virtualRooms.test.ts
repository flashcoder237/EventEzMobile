/**
 * Smoke tests pour virtualRoomsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { virtualRoomsAPI } from '../content';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('virtualRoomsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getByEvent() GETs /virtual-rooms/by_event/ with event_id', async () => {
    await virtualRoomsAPI.getByEvent('eid');
    expect(api.get).toHaveBeenCalledWith('/virtual-rooms/by_event/', {
      params: { event_id: 'eid' },
    });
  });

  it('getById() GETs /virtual-rooms/{id}/', async () => {
    await virtualRoomsAPI.getById('rid');
    expect(api.get).toHaveBeenCalledWith('/virtual-rooms/rid/');
  });

  it('join() POSTs /virtual-rooms/{id}/join/', async () => {
    await virtualRoomsAPI.join('rid');
    expect(api.post).toHaveBeenCalledWith('/virtual-rooms/rid/join/');
  });

  it('leave() POSTs /virtual-rooms/{id}/leave/', async () => {
    await virtualRoomsAPI.leave('rid');
    expect(api.post).toHaveBeenCalledWith('/virtual-rooms/rid/leave/');
  });

  it('getParticipants() GETs /virtual-rooms/{id}/participants/', async () => {
    await virtualRoomsAPI.getParticipants('rid');
    expect(api.get).toHaveBeenCalledWith('/virtual-rooms/rid/participants/');
  });

  it('eventJoin() GETs /virtual-rooms/event/{eventId}/join/', async () => {
    await virtualRoomsAPI.eventJoin('eid');
    expect(api.get).toHaveBeenCalledWith('/virtual-rooms/event/eid/join/');
  });

  it('eventPlanInfo() GETs /virtual-rooms/event/{eventId}/plan-info/', async () => {
    await virtualRoomsAPI.eventPlanInfo('eid');
    expect(api.get).toHaveBeenCalledWith('/virtual-rooms/event/eid/plan-info/');
  });

  it('liveStatus() GETs /virtual-rooms/event/{eventId}/live-status/', async () => {
    await virtualRoomsAPI.liveStatus('eid');
    expect(api.get).toHaveBeenCalledWith('/virtual-rooms/event/eid/live-status/');
  });

  it('liveStatus() accepts a slug', async () => {
    await virtualRoomsAPI.liveStatus('my-event-slug');
    expect(api.get).toHaveBeenCalledWith('/virtual-rooms/event/my-event-slug/live-status/');
  });
});
