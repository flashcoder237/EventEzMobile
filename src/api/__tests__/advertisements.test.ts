/**
 * Smoke tests pour advertisementsAPI — vérifie URL + verbe HTTP + body shape.
 * create/update peuvent recevoir FormData (multipart) — on vérifie que le
 * header Content-Type est positionné en conséquence.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { advertisementsAPI } from '../social';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('advertisementsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

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

  it('create() POSTs /advertisements/ with multipart header for FormData', async () => {
    const fd = new FormData();
    await advertisementsAPI.create(fd);
    expect(api.post).toHaveBeenCalledWith('/advertisements/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('create() POSTs /advertisements/ without multipart header for plain object', async () => {
    const data = { title: 'Ad' };
    await advertisementsAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/advertisements/', data, { headers: undefined });
  });

  it('update() PATCHs /advertisements/{id}/ with multipart header for FormData', async () => {
    const fd = new FormData();
    await advertisementsAPI.update('aid', fd);
    expect(api.patch).toHaveBeenCalledWith('/advertisements/aid/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('delete() DELETEs /advertisements/{id}/', async () => {
    await advertisementsAPI.delete('aid');
    expect(api.delete).toHaveBeenCalledWith('/advertisements/aid/');
  });
});
