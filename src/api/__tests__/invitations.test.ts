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

  it('bulkInvite() POSTs /invitations/bulk_invite/', async () => {
    const data = { event: 'eid', invitees: [{ email: 'a@b.com', name: 'A' }], message: 'hi' };
    await invitationsAPI.bulkInvite(data);
    expect(api.post).toHaveBeenCalledWith('/invitations/bulk_invite/', data);
  });

  it('accept() POSTs /invitations/{id}/accept/', async () => {
    await invitationsAPI.accept('inv1');
    expect(api.post).toHaveBeenCalledWith('/invitations/inv1/accept/');
  });

  it('decline() POSTs /invitations/{id}/decline/', async () => {
    await invitationsAPI.decline('inv1');
    expect(api.post).toHaveBeenCalledWith('/invitations/inv1/decline/');
  });

  it('cancel() POSTs /invitations/{id}/cancel/', async () => {
    await invitationsAPI.cancel('inv1');
    expect(api.post).toHaveBeenCalledWith('/invitations/inv1/cancel/');
  });

  it('getMyInvitations() GETs /invitations/my_invitations/', async () => {
    await invitationsAPI.getMyInvitations();
    expect(api.get).toHaveBeenCalledWith('/invitations/my_invitations/');
  });

  it('respondByToken() POSTs /invitations/respond_by_token/ with token+action', async () => {
    await invitationsAPI.respondByToken('tok123', 'accept');
    expect(api.post).toHaveBeenCalledWith('/invitations/respond_by_token/', {
      token: 'tok123',
      action: 'accept',
    });
  });
});
