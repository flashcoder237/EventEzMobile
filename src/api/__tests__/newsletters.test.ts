/**
 * Smoke tests pour newslettersAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { newslettersAPI } from '../content';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('newslettersAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getAll() GETs /newsletters/ with params', async () => {
    await newslettersAPI.getAll({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/newsletters/', { params: { page: 1 } });
  });

  it('getById() GETs /newsletters/{id}/', async () => {
    await newslettersAPI.getById('nid');
    expect(api.get).toHaveBeenCalledWith('/newsletters/nid/');
  });

  it('create() POSTs /newsletters/', async () => {
    const data = { title: 'New' };
    await newslettersAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/newsletters/', data);
  });

  it('update() PATCHs /newsletters/{id}/', async () => {
    const data = { title: 'Updated' };
    await newslettersAPI.update('nid', data);
    expect(api.patch).toHaveBeenCalledWith('/newsletters/nid/', data);
  });

  it('delete() DELETEs /newsletters/{id}/', async () => {
    await newslettersAPI.delete('nid');
    expect(api.delete).toHaveBeenCalledWith('/newsletters/nid/');
  });

  it('sendNow() POSTs /newsletters/{id}/send_now/', async () => {
    await newslettersAPI.sendNow('nid');
    expect(api.post).toHaveBeenCalledWith('/newsletters/nid/send_now/');
  });

  it('schedule() POSTs /newsletters/{id}/schedule/ with scheduled_at', async () => {
    await newslettersAPI.schedule('nid', '2026-06-01T10:00:00Z');
    expect(api.post).toHaveBeenCalledWith('/newsletters/nid/schedule/', {
      scheduled_at: '2026-06-01T10:00:00Z',
    });
  });

  it('getSubscribers() GETs /subscribers/ with params', async () => {
    await newslettersAPI.getSubscribers({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/subscribers/', { params: { page: 1 } });
  });

  it('subscribe() POSTs /subscribers/subscribe/', async () => {
    const data = { email: 'a@b.com', name: 'A' };
    await newslettersAPI.subscribe(data);
    expect(api.post).toHaveBeenCalledWith('/subscribers/subscribe/', data);
  });

  it('unsubscribe() POSTs /subscribers/unsubscribe/ with token', async () => {
    await newslettersAPI.unsubscribe('tok123');
    expect(api.post).toHaveBeenCalledWith('/subscribers/unsubscribe/', { token: 'tok123' });
  });
});
