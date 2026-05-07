/**
 * Smoke tests pour webhooksAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { webhooksAPI } from '../misc';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('webhooksAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getAll() GETs /webhooks/ with params', async () => {
    await webhooksAPI.getAll({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/webhooks/', { params: { page: 1 } });
  });

  it('getById() GETs /webhooks/{id}/', async () => {
    await webhooksAPI.getById('wid');
    expect(api.get).toHaveBeenCalledWith('/webhooks/wid/');
  });

  it('create() POSTs /webhooks/', async () => {
    const data = {
      url: 'https://hook.example.com',
      secret: 's3cr3t',
      event_types: ['event.created'],
    };
    await webhooksAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/webhooks/', data);
  });

  it('update() PATCHes /webhooks/{id}/', async () => {
    const data = { is_active: false };
    await webhooksAPI.update('wid', data);
    expect(api.patch).toHaveBeenCalledWith('/webhooks/wid/', data);
  });

  it('delete() DELETEs /webhooks/{id}/', async () => {
    await webhooksAPI.delete('wid');
    expect(api.delete).toHaveBeenCalledWith('/webhooks/wid/');
  });

  it('deliveries() GETs /webhooks/{id}/deliveries/', async () => {
    await webhooksAPI.deliveries('wid');
    expect(api.get).toHaveBeenCalledWith('/webhooks/wid/deliveries/');
  });

  it('test() POSTs /webhooks/{id}/test/', async () => {
    await webhooksAPI.test('wid');
    expect(api.post).toHaveBeenCalledWith('/webhooks/wid/test/');
  });

  it('toggleActive() POSTs /webhooks/{id}/toggle_active/', async () => {
    await webhooksAPI.toggleActive('wid');
    expect(api.post).toHaveBeenCalledWith('/webhooks/wid/toggle_active/');
  });

  it('retry() POSTs /webhook-deliveries/{id}/retry/', async () => {
    await webhooksAPI.retry('did');
    expect(api.post).toHaveBeenCalledWith('/webhook-deliveries/did/retry/');
  });

  it('stats() GETs /webhooks/stats/', async () => {
    await webhooksAPI.stats();
    expect(api.get).toHaveBeenCalledWith('/webhooks/stats/');
  });
});
