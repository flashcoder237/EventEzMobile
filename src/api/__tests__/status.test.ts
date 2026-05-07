/**
 * Smoke tests pour statusAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { statusAPI } from '../status';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('statusAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getSnapshot() GETs /status/', async () => {
    await statusAPI.getSnapshot();
    expect(api.get).toHaveBeenCalledWith('/status/');
  });

  it('getServices() GETs /status/services/', async () => {
    await statusAPI.getServices();
    expect(api.get).toHaveBeenCalledWith('/status/services/');
  });

  it('getHistory() GETs /status/incidents/ with days param', async () => {
    await statusAPI.getHistory(30);
    expect(api.get).toHaveBeenCalledWith('/status/incidents/', { params: { days: 30 } });
  });

  it('getHistory() without days passes undefined params', async () => {
    await statusAPI.getHistory();
    expect(api.get).toHaveBeenCalledWith('/status/incidents/', { params: undefined });
  });

  it('getIncident() GETs /status/incidents/{id}/', async () => {
    await statusAPI.getIncident('iid');
    expect(api.get).toHaveBeenCalledWith('/status/incidents/iid/');
  });

  it('listAdmin() GETs /admin/incidents/ with params', async () => {
    await statusAPI.listAdmin({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/admin/incidents/', { params: { page: 1 } });
  });

  it('getAdmin() GETs /admin/incidents/{id}/', async () => {
    await statusAPI.getAdmin('iid');
    expect(api.get).toHaveBeenCalledWith('/admin/incidents/iid/');
  });

  it('create() POSTs /admin/incidents/', async () => {
    const data = { title: 'Incident' };
    await statusAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/admin/incidents/', data);
  });

  it('update() PATCHes /admin/incidents/{id}/', async () => {
    const data = { status: 'resolved' };
    await statusAPI.update('iid', data);
    expect(api.patch).toHaveBeenCalledWith('/admin/incidents/iid/', data);
  });

  it('delete() DELETEs /admin/incidents/{id}/', async () => {
    await statusAPI.delete('iid');
    expect(api.delete).toHaveBeenCalledWith('/admin/incidents/iid/');
  });

  it('addUpdate() POSTs /admin/incidents/{id}/updates/', async () => {
    const data = { status: 'investigating', message: 'Looking' };
    await statusAPI.addUpdate('iid', data);
    expect(api.post).toHaveBeenCalledWith('/admin/incidents/iid/updates/', data);
  });

  it('resolve() POSTs /admin/incidents/{id}/resolve/ with message', async () => {
    await statusAPI.resolve('iid', 'Fixed');
    expect(api.post).toHaveBeenCalledWith('/admin/incidents/iid/resolve/', { message: 'Fixed' });
  });

  it('resolve() without message POSTs empty body', async () => {
    await statusAPI.resolve('iid');
    expect(api.post).toHaveBeenCalledWith('/admin/incidents/iid/resolve/', {});
  });
});
