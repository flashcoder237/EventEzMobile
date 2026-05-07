/**
 * Smoke tests pour siteSettingsAPI + publicSettingsAPI — vérifie URL + verbe HTTP.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { siteSettingsAPI, publicSettingsAPI } from '../admin';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('siteSettingsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('get() GETs /site-settings/', async () => {
    await siteSettingsAPI.get();
    expect(api.get).toHaveBeenCalledWith('/site-settings/');
  });

  it('update() PATCHs /site-settings/ with data', async () => {
    const data = { ai_assist_enabled: true, phone_otp_enabled: false };
    await siteSettingsAPI.update(data);
    expect(api.patch).toHaveBeenCalledWith('/site-settings/', data);
  });
});

describe('publicSettingsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('get() GETs /public-settings/', async () => {
    await publicSettingsAPI.get();
    expect(api.get).toHaveBeenCalledWith('/public-settings/');
  });
});
