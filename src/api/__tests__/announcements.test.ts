/**
 * Smoke tests pour announcementsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { announcementsAPI } from '../announcements';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('announcementsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getActive() GETs /announcements/active/', async () => {
    await announcementsAPI.getActive();
    expect(api.get).toHaveBeenCalledWith('/announcements/active/');
  });

  it('list() GETs /admin/announcements/ with params', async () => {
    await announcementsAPI.list({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/admin/announcements/', { params: { page: 1 } });
  });

  it('get() GETs /admin/announcements/{id}/', async () => {
    await announcementsAPI.get('aid');
    expect(api.get).toHaveBeenCalledWith('/admin/announcements/aid/');
  });

  it('create() POSTs /admin/announcements/', async () => {
    const data = { title: 'T', message: 'M' };
    await announcementsAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/admin/announcements/', data);
  });

  it('update() PATCHes /admin/announcements/{id}/', async () => {
    const data = { title: 'New' };
    await announcementsAPI.update('aid', data);
    expect(api.patch).toHaveBeenCalledWith('/admin/announcements/aid/', data);
  });

  it('delete() DELETEs /admin/announcements/{id}/', async () => {
    await announcementsAPI.delete('aid');
    expect(api.delete).toHaveBeenCalledWith('/admin/announcements/aid/');
  });
});
