jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { invoicesAPI } from '../payments';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('invoicesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getInvoices(params) → GET /invoices/', async () => {
    await invoicesAPI.getInvoices({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/invoices/', { params: { page: 1 } });
  });

  it('getInvoice(id) → GET /invoices/:id/', async () => {
    await invoicesAPI.getInvoice('inv-1');
    expect(api.get).toHaveBeenCalledWith('/invoices/inv-1/');
  });

  it('downloadPdf(id) → GET /invoices/:id/download_pdf/', async () => {
    await invoicesAPI.downloadPdf('inv-1');
    expect(api.get).toHaveBeenCalledWith('/invoices/inv-1/download_pdf/');
  });
});
