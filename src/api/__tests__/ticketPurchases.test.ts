/**
 * Smoke tests pour ticketPurchasesAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { ticketPurchasesAPI } from '../tickets';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('ticketPurchasesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getTicketPurchases() GETs /ticket-purchases/ with params', async () => {
    await ticketPurchasesAPI.getTicketPurchases({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/ticket-purchases/', { params: { page: 1 } });
  });

  it('getTicketPurchase() GETs /ticket-purchases/{id}/', async () => {
    await ticketPurchasesAPI.getTicketPurchase('pid');
    expect(api.get).toHaveBeenCalledWith('/ticket-purchases/pid/');
  });

  it('createTicketPurchase() POSTs /ticket-purchases/', async () => {
    const data = { ticket_type: 1, quantity: 2 };
    await ticketPurchasesAPI.createTicketPurchase(data);
    expect(api.post).toHaveBeenCalledWith('/ticket-purchases/', data);
  });

  it('updateTicketPurchase() PUTs /ticket-purchases/{id}/', async () => {
    const data = { quantity: 3 };
    await ticketPurchasesAPI.updateTicketPurchase('pid', data);
    expect(api.put).toHaveBeenCalledWith('/ticket-purchases/pid/', data);
  });

  it('checkIn() POSTs /ticket-purchases/{id}/check_in/', async () => {
    await ticketPurchasesAPI.checkIn('pid');
    expect(api.post).toHaveBeenCalledWith('/ticket-purchases/pid/check_in/');
  });

  it('getMyTickets() GETs /ticket-purchases/', async () => {
    await ticketPurchasesAPI.getMyTickets();
    expect(api.get).toHaveBeenCalledWith('/ticket-purchases/');
  });

  it('getMyPurchases() GETs /ticket-purchases/my_purchases/', async () => {
    await ticketPurchasesAPI.getMyPurchases();
    expect(api.get).toHaveBeenCalledWith('/ticket-purchases/my_purchases/');
  });
});
