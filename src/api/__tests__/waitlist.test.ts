/**
 * Smoke tests pour waitlistAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { waitlistAPI } from '../misc';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('waitlistAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getWaitlist() GETs /waitlist/ with params', async () => {
    await waitlistAPI.getWaitlist({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/waitlist/', { params: { page: 1 } });
  });

  it('getWaitlistEntry() GETs /waitlist/{id}/', async () => {
    await waitlistAPI.getWaitlistEntry('wid');
    expect(api.get).toHaveBeenCalledWith('/waitlist/wid/');
  });

  it('joinWaitlist() POSTs /waitlist/join/', async () => {
    const data = { event: 'eid', ticket_type: 'tid' };
    await waitlistAPI.joinWaitlist(data);
    expect(api.post).toHaveBeenCalledWith('/waitlist/join/', data);
  });

  it('cancelWaitlist() POSTs /waitlist/{id}/cancel/', async () => {
    await waitlistAPI.cancelWaitlist('wid');
    expect(api.post).toHaveBeenCalledWith('/waitlist/wid/cancel/');
  });

  it('getMyWaitlist() GETs /waitlist/my_waitlist/', async () => {
    await waitlistAPI.getMyWaitlist();
    expect(api.get).toHaveBeenCalledWith('/waitlist/my_waitlist/');
  });

  it('notifyEntry() POSTs /waitlist/{id}/notify/', async () => {
    await waitlistAPI.notifyEntry('wid');
    expect(api.post).toHaveBeenCalledWith('/waitlist/wid/notify/');
  });

  it('notifyBatch() POSTs /waitlist/notify_batch/', async () => {
    const data = { event: 'eid', count: 5 };
    await waitlistAPI.notifyBatch(data);
    expect(api.post).toHaveBeenCalledWith('/waitlist/notify_batch/', data);
  });

  it('getStatistics() GETs /waitlist/statistics/ with event param', async () => {
    await waitlistAPI.getStatistics('eid');
    expect(api.get).toHaveBeenCalledWith('/waitlist/statistics/', { params: { event: 'eid' } });
  });
});
