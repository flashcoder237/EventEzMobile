/**
 * Smoke tests pour clientReleaseAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { clientReleaseAPI } from '../announcements';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('clientReleaseAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('get() GETs /admin/client-release-requirement/', async () => {
    await clientReleaseAPI.get();
    expect(api.get).toHaveBeenCalledWith('/admin/client-release-requirement/');
  });

  it('update() PATCHes /admin/client-release-requirement/', async () => {
    const data = { mobile_min_supported_version: '1.2.0' };
    await clientReleaseAPI.update(data);
    expect(api.patch).toHaveBeenCalledWith('/admin/client-release-requirement/', data);
  });
});
