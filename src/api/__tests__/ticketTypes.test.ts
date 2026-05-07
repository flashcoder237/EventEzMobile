/**
 * Smoke tests pour ticketTypesAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { ticketTypesAPI } from '../tickets';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('ticketTypesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getTicketTypes() GETs /ticket-types/ with params', async () => {
    await ticketTypesAPI.getTicketTypes({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/ticket-types/', { params: { event: 'eid' } });
  });

  it('getTicketType() GETs /ticket-types/{id}/', async () => {
    await ticketTypesAPI.getTicketType('tid');
    expect(api.get).toHaveBeenCalledWith('/ticket-types/tid/');
  });

  it('createTicketType() POSTs /ticket-types/', async () => {
    const data = { name: 'X', price: 10 };
    await ticketTypesAPI.createTicketType(data);
    expect(api.post).toHaveBeenCalledWith('/ticket-types/', data);
  });

  it('updateTicketType() PUTs /ticket-types/{id}/', async () => {
    const data = { name: 'Y' };
    await ticketTypesAPI.updateTicketType('tid', data);
    expect(api.put).toHaveBeenCalledWith('/ticket-types/tid/', data);
  });

  it('patchTicketType() PATCHes /ticket-types/{id}/', async () => {
    const data = { name: 'Z' };
    await ticketTypesAPI.patchTicketType('tid', data);
    expect(api.patch).toHaveBeenCalledWith('/ticket-types/tid/', data);
  });

  it('deleteTicketType() DELETEs /ticket-types/{id}/', async () => {
    await ticketTypesAPI.deleteTicketType('tid');
    expect(api.delete).toHaveBeenCalledWith('/ticket-types/tid/');
  });
});
