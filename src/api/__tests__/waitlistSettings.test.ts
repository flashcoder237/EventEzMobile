/**
 * Smoke tests pour waitlistSettingsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { waitlistSettingsAPI } from '../misc';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('waitlistSettingsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getWaitlistSettings() GETs /waitlist-settings/ with params', async () => {
    await waitlistSettingsAPI.getWaitlistSettings({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/waitlist-settings/', { params: { event: 'eid' } });
  });

  it('getWaitlistSetting() GETs /waitlist-settings/{id}/', async () => {
    await waitlistSettingsAPI.getWaitlistSetting('sid');
    expect(api.get).toHaveBeenCalledWith('/waitlist-settings/sid/');
  });

  it('createWaitlistSetting() POSTs /waitlist-settings/', async () => {
    const data = { event: 'eid', enabled: true };
    await waitlistSettingsAPI.createWaitlistSetting(data);
    expect(api.post).toHaveBeenCalledWith('/waitlist-settings/', data);
  });

  it('updateWaitlistSetting() PUTs /waitlist-settings/{id}/', async () => {
    const data = { enabled: false };
    await waitlistSettingsAPI.updateWaitlistSetting('sid', data);
    expect(api.put).toHaveBeenCalledWith('/waitlist-settings/sid/', data);
  });

  it('deleteWaitlistSetting() DELETEs /waitlist-settings/{id}/', async () => {
    await waitlistSettingsAPI.deleteWaitlistSetting('sid');
    expect(api.delete).toHaveBeenCalledWith('/waitlist-settings/sid/');
  });
});
