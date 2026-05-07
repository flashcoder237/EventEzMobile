/**
 * Smoke tests pour volunteersAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { volunteersAPI } from '../misc';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('volunteersAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getRoles() GETs /volunteer-roles/ with params', async () => {
    await volunteersAPI.getRoles({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/volunteer-roles/', { params: { event: 'eid' } });
  });

  it('createRole() POSTs /volunteer-roles/', async () => {
    const data = { event: 'eid', title: 'Helper' };
    await volunteersAPI.createRole(data);
    expect(api.post).toHaveBeenCalledWith('/volunteer-roles/', data);
  });

  it('updateRole() PATCHes /volunteer-roles/{id}/', async () => {
    const data = { title: 'Lead' };
    await volunteersAPI.updateRole('rid', data);
    expect(api.patch).toHaveBeenCalledWith('/volunteer-roles/rid/', data);
  });

  it('deleteRole() DELETEs /volunteer-roles/{id}/', async () => {
    await volunteersAPI.deleteRole('rid');
    expect(api.delete).toHaveBeenCalledWith('/volunteer-roles/rid/');
  });

  it('apply() POSTs /volunteer-applications/', async () => {
    const data = { role: 'rid', motivation: 'help' };
    await volunteersAPI.apply(data);
    expect(api.post).toHaveBeenCalledWith('/volunteer-applications/', data);
  });

  it('getMyApplications() GETs /volunteer-applications/my_applications/', async () => {
    await volunteersAPI.getMyApplications();
    expect(api.get).toHaveBeenCalledWith('/volunteer-applications/my_applications/');
  });

  it('withdrawApplication() POSTs /volunteer-applications/{id}/withdraw/', async () => {
    await volunteersAPI.withdrawApplication('aid');
    expect(api.post).toHaveBeenCalledWith('/volunteer-applications/aid/withdraw/');
  });

  it('acceptApplication() POSTs /volunteer-applications/{id}/accept/', async () => {
    await volunteersAPI.acceptApplication('aid');
    expect(api.post).toHaveBeenCalledWith('/volunteer-applications/aid/accept/');
  });

  it('rejectApplication() POSTs /volunteer-applications/{id}/reject/ with reason', async () => {
    await volunteersAPI.rejectApplication('aid', 'no fit');
    expect(api.post).toHaveBeenCalledWith('/volunteer-applications/aid/reject/', { reason: 'no fit' });
  });

  it('getMyTasks() GETs /volunteer-tasks/my_tasks/', async () => {
    await volunteersAPI.getMyTasks();
    expect(api.get).toHaveBeenCalledWith('/volunteer-tasks/my_tasks/');
  });

  it('completeTask() POSTs /volunteer-tasks/{id}/complete/', async () => {
    await volunteersAPI.completeTask('tid');
    expect(api.post).toHaveBeenCalledWith('/volunteer-tasks/tid/complete/');
  });
});
