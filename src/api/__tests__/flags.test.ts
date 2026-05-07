/**
 * Smoke tests pour flagsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { flagsAPI } from '../feedback';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('flagsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getFlags() GETs /flags/ with params', async () => {
    await flagsAPI.getFlags({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/flags/', { params: { page: 1 } });
  });

  it('getFlag() GETs /flags/{id}/', async () => {
    await flagsAPI.getFlag('fid');
    expect(api.get).toHaveBeenCalledWith('/flags/fid/');
  });

  it('createFlag() POSTs /flags/', async () => {
    const data = { event: 'eid', reason: 'spam' };
    await flagsAPI.createFlag(data);
    expect(api.post).toHaveBeenCalledWith('/flags/', data);
  });

  it('resolveFlag() POSTs /flags/{id}/resolve/ with resolutionData', async () => {
    const data = { resolution: 'closed' };
    await flagsAPI.resolveFlag('fid', data);
    expect(api.post).toHaveBeenCalledWith('/flags/fid/resolve/', data);
  });

  it('getUnresolvedFlags() GETs /flags/unresolved/', async () => {
    await flagsAPI.getUnresolvedFlags();
    expect(api.get).toHaveBeenCalledWith('/flags/unresolved/');
  });
});
