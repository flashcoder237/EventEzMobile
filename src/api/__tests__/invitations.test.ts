/**
 * Smoke tests pour invitationsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { invitationsAPI } from '../social';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('invitationsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getAll() GETs /invitations/ with params', async () => {
    await invitationsAPI.getAll({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/invitations/', { params: { page: 1 } });
  });

  it('getById() GETs /invitations/{id}/', async () => {
    await invitationsAPI.getById('inv1');
    expect(api.get).toHaveBeenCalledWith('/invitations/inv1/');
  });

  it('create() POSTs /invitations/', async () => {
    const data = { event: 'eid', invitee_email: 'a@b.com', invitee_name: 'A', message: 'hi' };
    await invitationsAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/invitations/', data);
  });

  it('bulkInvite() POSTs /invitations/ (backend create() gère le bulk via BulkInvitationCreateSerializer)', async () => {
    const data = { event: 'eid', invitees: [{ email: 'a@b.com', name: 'A' }], message: 'hi' };
    await invitationsAPI.bulkInvite(data);
    expect(api.post).toHaveBeenCalledWith('/invitations/', data);
  });

  it('accept() POSTs /invitations/{id}/accept/', async () => {
    await invitationsAPI.accept('inv1');
    expect(api.post).toHaveBeenCalledWith('/invitations/inv1/accept/');
  });

  it('decline() POSTs /invitations/{id}/decline/', async () => {
    await invitationsAPI.decline('inv1');
    expect(api.post).toHaveBeenCalledWith('/invitations/inv1/decline/');
  });

  it('cancel() DELETE /invitations/{id}/ (backend implémente cancel via destroy())', async () => {
    await invitationsAPI.cancel('inv1');
    expect(api.delete).toHaveBeenCalledWith('/invitations/inv1/');
  });

  it('getMyInvitations() GETs /invitations/my_invitations/', async () => {
    await invitationsAPI.getMyInvitations();
    expect(api.get).toHaveBeenCalledWith('/invitations/my_invitations/');
  });

  it('respondByToken() chaîne by_token → accept/decline (pas d\'endpoint single-shot backend)', async () => {
    api.get.mockResolvedValueOnce({ data: { id: 'inv1' } });
    await invitationsAPI.respondByToken('tok123', 'accept');
    expect(api.get).toHaveBeenCalledWith('/invitations/by_token/', { params: { token: 'tok123' } });
    expect(api.post).toHaveBeenCalledWith('/invitations/inv1/accept/');
  });
});
