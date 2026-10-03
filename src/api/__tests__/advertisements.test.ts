/**
 * Smoke tests pour advertisementsAPI — vérifie URL + verbe HTTP + body shape.
 *
 * create/update acceptent FormData (multipart) OU un objet simple (JSON) :
 *  - FormData  → fetchUpload (fetch natif). Axios sérialise mal le FormData
 *    polyfillé de React Native, et un 'Content-Type: multipart/form-data'
 *    forcé prive la requête de son boundary → ERR_NETWORK à la création.
 *  - objet     → axios normal, sans header particulier.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

jest.mock('../config', () => ({
  ...jest.requireActual('../config'),
  fetchUpload: jest.fn(() => Promise.resolve({ data: {} })),
}));

import { advertisementsAPI } from '../social';
import { fetchUpload } from '../config';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

const fetchUploadMock = fetchUpload as jest.Mock;

describe('advertisementsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getNearby() GETs /advertisements/nearby/ with params', async () => {
    await advertisementsAPI.getNearby({ country: 'CM', city: 'Douala' });
    expect(api.get).toHaveBeenCalledWith('/advertisements/nearby/', {
      params: { country: 'CM', city: 'Douala' },
    });
  });

  it('recordView() POSTs /advertisements/{id}/view/', async () => {
    await advertisementsAPI.recordView('aid');
    expect(api.post).toHaveBeenCalledWith('/advertisements/aid/view/');
  });

  it('recordClick() POSTs /advertisements/{id}/click/', async () => {
    await advertisementsAPI.recordClick('aid');
    expect(api.post).toHaveBeenCalledWith('/advertisements/aid/click/');
  });

  it('list() GETs /advertisements/ with params', async () => {
    await advertisementsAPI.list({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/advertisements/', { params: { page: 1 } });
  });

  it('get() GETs /advertisements/{id}/', async () => {
    await advertisementsAPI.get('aid');
    expect(api.get).toHaveBeenCalledWith('/advertisements/aid/');
  });

  it('create() routes FormData through fetchUpload (POST), never axios', async () => {
    const fd = new FormData();
    await advertisementsAPI.create(fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/advertisements/', fd);
    // Garde-fou anti-régression : c'est le passage par axios qui causait ERR_NETWORK.
    expect(api.post).not.toHaveBeenCalled();
  });

  it('create() POSTs a plain object through axios, without multipart header', async () => {
    const data = { title: 'Ad' };
    await advertisementsAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/advertisements/', data);
    expect(fetchUploadMock).not.toHaveBeenCalled();
  });

  it('update() routes FormData through fetchUpload (PATCH), never axios', async () => {
    const fd = new FormData();
    await advertisementsAPI.update('aid', fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('PATCH', '/advertisements/aid/', fd);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('update() PATCHes a plain object through axios', async () => {
    const data = { title: 'Ad' };
    await advertisementsAPI.update('aid', data);
    expect(api.patch).toHaveBeenCalledWith('/advertisements/aid/', data);
    expect(fetchUploadMock).not.toHaveBeenCalled();
  });

  it('delete() DELETEs /advertisements/{id}/', async () => {
    await advertisementsAPI.delete('aid');
    expect(api.delete).toHaveBeenCalledWith('/advertisements/aid/');
  });
});
