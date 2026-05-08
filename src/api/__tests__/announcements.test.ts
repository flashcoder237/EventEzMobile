/**
 * Smoke tests pour les APIs exposées depuis `src/api/announcements.ts`.
 *
 * Couvre `announcementsAPI` et `clientReleaseAPI` colocalisées, afin que le
 * mutation testing (qui exécute uniquement `announcements.test.ts` pour
 * `announcements.ts`) détecte les mutations sur l'une ou l'autre.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { announcementsAPI, clientReleaseAPI } from '../announcements';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('announcementsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getActive() GETs /announcements/active/', async () => {
    await announcementsAPI.getActive();
    expect(api.get).toHaveBeenCalledWith('/announcements/active/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('list() GETs /admin/announcements/ with params', async () => {
    await announcementsAPI.list({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/admin/announcements/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('get() GETs /admin/announcements/{id}/', async () => {
    await announcementsAPI.get('aid');
    expect(api.get).toHaveBeenCalledWith('/admin/announcements/aid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('create() POSTs /admin/announcements/', async () => {
    const data = { title: 'T', message: 'M' };
    await announcementsAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/admin/announcements/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('update() PATCHes /admin/announcements/{id}/', async () => {
    const data = { title: 'New' };
    await announcementsAPI.update('aid', data);
    expect(api.patch).toHaveBeenCalledWith('/admin/announcements/aid/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('delete() DELETEs /admin/announcements/{id}/', async () => {
    await announcementsAPI.delete('aid');
    expect(api.delete).toHaveBeenCalledWith('/admin/announcements/aid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('clientReleaseAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('get() GETs /admin/client-release-requirement/', async () => {
    await clientReleaseAPI.get();
    expect(api.get).toHaveBeenCalledWith('/admin/client-release-requirement/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('update() PATCHes /admin/client-release-requirement/', async () => {
    const data = { mobile_min_supported_version: '1.2.0' };
    await clientReleaseAPI.update(data);
    expect(api.patch).toHaveBeenCalledWith('/admin/client-release-requirement/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
