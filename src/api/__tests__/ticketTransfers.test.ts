jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { ticketTransfersAPI } from '../tickets';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('ticketTransfersAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getTransfers(params) → GET /ticket-transfers/', async () => {
    await ticketTransfersAPI.getTransfers({ page: 2 });
    expect(api.get).toHaveBeenCalledWith('/ticket-transfers/', { params: { page: 2 } });
  });

  it('getSentTransfers() → GET /ticket-transfers/sent/', async () => {
    await ticketTransfersAPI.getSentTransfers();
    expect(api.get).toHaveBeenCalledWith('/ticket-transfers/sent/');
  });

  it('getReceivedTransfers() → GET /ticket-transfers/received/', async () => {
    await ticketTransfersAPI.getReceivedTransfers();
    expect(api.get).toHaveBeenCalledWith('/ticket-transfers/received/');
  });

  it('getPendingTransfers() → GET /ticket-transfers/pending/', async () => {
    await ticketTransfersAPI.getPendingTransfers();
    expect(api.get).toHaveBeenCalledWith('/ticket-transfers/pending/');
  });

  it('createTransfer(data) → POST /ticket-transfers/', async () => {
    const data = {
      ticket_purchase: 1,
      recipient_email: 'a@b.com',
      recipient_name: 'Alice',
      quantity: 1,
      message: 'Enjoy!',
    };
    await ticketTransfersAPI.createTransfer(data);
    expect(api.post).toHaveBeenCalledWith('/ticket-transfers/', data);
  });

  it('acceptTransfer(id) → POST /ticket-transfers/:id/accept/', async () => {
    await ticketTransfersAPI.acceptTransfer('5');
    expect(api.post).toHaveBeenCalledWith('/ticket-transfers/5/accept/');
  });

  it('declineTransfer(id) → POST /ticket-transfers/:id/decline/', async () => {
    await ticketTransfersAPI.declineTransfer('5');
    expect(api.post).toHaveBeenCalledWith('/ticket-transfers/5/decline/');
  });

  it('cancelTransfer(id) → POST /ticket-transfers/:id/cancel/', async () => {
    await ticketTransfersAPI.cancelTransfer('5');
    expect(api.post).toHaveBeenCalledWith('/ticket-transfers/5/cancel/');
  });

  it('acceptByToken(token) → POST /ticket-transfers/accept_by_token/', async () => {
    await ticketTransfersAPI.acceptByToken('tok-abc');
    expect(api.post).toHaveBeenCalledWith('/ticket-transfers/accept_by_token/', { token: 'tok-abc' });
  });

  it('declineByToken(token) → POST /ticket-transfers/decline_by_token/', async () => {
    await ticketTransfersAPI.declineByToken('tok-abc');
    expect(api.post).toHaveBeenCalledWith('/ticket-transfers/decline_by_token/', { token: 'tok-abc' });
  });

  it('getByToken(token) → GET /ticket-transfers/by_token/ with token param', async () => {
    await ticketTransfersAPI.getByToken('tok-abc');
    expect(api.get).toHaveBeenCalledWith('/ticket-transfers/by_token/', { params: { token: 'tok-abc' } });
  });
});
