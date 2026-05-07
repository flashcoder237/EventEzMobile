/**
 * Smoke tests pour treasuryAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { treasuryAPI } from '../admin';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('treasuryAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  describe('Overview & Wallet', () => {
    it('getOverview() GETs /admin/treasury/overview/', async () => {
      await treasuryAPI.getOverview();
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/overview/');
    });

    it('getWallet() GETs /admin/treasury/wallet/', async () => {
      await treasuryAPI.getWallet();
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/wallet/');
    });

    it('recomputeWallet() POSTs /admin/treasury/wallet/recompute/', async () => {
      await treasuryAPI.recomputeWallet();
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/wallet/recompute/');
    });
  });

  describe('Transactions', () => {
    it('getTransactions() GETs /admin/treasury/transactions/ with params', async () => {
      await treasuryAPI.getTransactions({ page: 1 });
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/transactions/', { params: { page: 1 } });
    });

    it('getTransaction() GETs /admin/treasury/transactions/{id}/', async () => {
      await treasuryAPI.getTransaction('tid');
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/transactions/tid/');
    });

    it('createTransaction() POSTs /admin/treasury/transactions/', async () => {
      const data = { amount: 100 };
      await treasuryAPI.createTransaction(data);
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/transactions/', data);
    });
  });

  describe('Staff', () => {
    it('getStaffMembers() GETs /admin/treasury/staff/ with params', async () => {
      await treasuryAPI.getStaffMembers({ page: 1 });
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/staff/', { params: { page: 1 } });
    });

    it('getStaffMember() GETs /admin/treasury/staff/{id}/', async () => {
      await treasuryAPI.getStaffMember('sid');
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/staff/sid/');
    });

    it('createStaffMember() POSTs /admin/treasury/staff/', async () => {
      const data = { name: 'X' };
      await treasuryAPI.createStaffMember(data);
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/staff/', data);
    });

    it('updateStaffMember() PATCHes /admin/treasury/staff/{id}/', async () => {
      const data = { name: 'Y' };
      await treasuryAPI.updateStaffMember('sid', data);
      expect(api.patch).toHaveBeenCalledWith('/admin/treasury/staff/sid/', data);
    });

    it('deleteStaffMember() DELETEs /admin/treasury/staff/{id}/', async () => {
      await treasuryAPI.deleteStaffMember('sid');
      expect(api.delete).toHaveBeenCalledWith('/admin/treasury/staff/sid/');
    });
  });

  describe('Staff Payments', () => {
    it('getStaffPayments() GETs /admin/treasury/staff-payments/ with params', async () => {
      await treasuryAPI.getStaffPayments({ page: 1 });
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/staff-payments/', { params: { page: 1 } });
    });

    it('createStaffPayment() POSTs /admin/treasury/staff-payments/', async () => {
      const data = { staff: 'sid', amount: 100 };
      await treasuryAPI.createStaffPayment(data);
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/staff-payments/', data);
    });

    it('generatePayroll() POSTs /admin/treasury/staff-payments/generate_payroll/', async () => {
      const data = { month: 5, year: 2026 };
      await treasuryAPI.generatePayroll(data);
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/staff-payments/generate_payroll/', data);
    });
  });

  describe('Expenses', () => {
    it('getExpenses() GETs /admin/treasury/expenses/ with params', async () => {
      await treasuryAPI.getExpenses({ page: 1 });
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/expenses/', { params: { page: 1 } });
    });

    it('getExpense() GETs /admin/treasury/expenses/{id}/', async () => {
      await treasuryAPI.getExpense('eid');
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/expenses/eid/');
    });

    it('createExpense() POSTs /admin/treasury/expenses/', async () => {
      const data = { amount: 50 };
      await treasuryAPI.createExpense(data);
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/expenses/', data);
    });

    it('updateExpense() PATCHes /admin/treasury/expenses/{id}/', async () => {
      const data = { amount: 75 };
      await treasuryAPI.updateExpense('eid', data);
      expect(api.patch).toHaveBeenCalledWith('/admin/treasury/expenses/eid/', data);
    });

    it('deleteExpense() DELETEs /admin/treasury/expenses/{id}/', async () => {
      await treasuryAPI.deleteExpense('eid');
      expect(api.delete).toHaveBeenCalledWith('/admin/treasury/expenses/eid/');
    });

    it('approveExpense() POSTs /admin/treasury/expenses/{id}/approve/', async () => {
      await treasuryAPI.approveExpense('eid');
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/expenses/eid/approve/');
    });

    it('rejectExpense() POSTs /admin/treasury/expenses/{id}/reject/ with reason', async () => {
      await treasuryAPI.rejectExpense('eid', 'no');
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/expenses/eid/reject/', { reason: 'no' });
    });
  });

  describe('Shareholders', () => {
    it('getShareholders() GETs /admin/treasury/shareholders/ with params', async () => {
      await treasuryAPI.getShareholders({ page: 1 });
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/shareholders/', { params: { page: 1 } });
    });

    it('getShareholder() GETs /admin/treasury/shareholders/{id}/', async () => {
      await treasuryAPI.getShareholder('sid');
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/shareholders/sid/');
    });

    it('createShareholder() POSTs /admin/treasury/shareholders/', async () => {
      const data = { name: 'A' };
      await treasuryAPI.createShareholder(data);
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/shareholders/', data);
    });

    it('updateShareholder() PATCHes /admin/treasury/shareholders/{id}/', async () => {
      const data = { name: 'B' };
      await treasuryAPI.updateShareholder('sid', data);
      expect(api.patch).toHaveBeenCalledWith('/admin/treasury/shareholders/sid/', data);
    });

    it('deleteShareholder() DELETEs /admin/treasury/shareholders/{id}/', async () => {
      await treasuryAPI.deleteShareholder('sid');
      expect(api.delete).toHaveBeenCalledWith('/admin/treasury/shareholders/sid/');
    });
  });

  describe('Dividends', () => {
    it('getDividends() GETs /admin/treasury/dividends/ with params', async () => {
      await treasuryAPI.getDividends({ page: 1 });
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/dividends/', { params: { page: 1 } });
    });

    it('getDividend() GETs /admin/treasury/dividends/{id}/', async () => {
      await treasuryAPI.getDividend('did');
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/dividends/did/');
    });

    it('createDividend() POSTs /admin/treasury/dividends/', async () => {
      const data = { period_start: '2026-01-01' };
      await treasuryAPI.createDividend(data);
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/dividends/', data);
    });

    it('approveDividend() POSTs /admin/treasury/dividends/{id}/approve/', async () => {
      await treasuryAPI.approveDividend('did');
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/dividends/did/approve/');
    });

    it('distributeDividend() POSTs /admin/treasury/dividends/{id}/distribute/', async () => {
      await treasuryAPI.distributeDividend('did');
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/dividends/did/distribute/');
    });

    it('previewDividend() POSTs /admin/treasury/dividends/preview/', async () => {
      const data = { period_start: '2026-01-01', period_end: '2026-01-31', distribution_percentage: 50 };
      await treasuryAPI.previewDividend(data);
      expect(api.post).toHaveBeenCalledWith('/admin/treasury/dividends/preview/', data);
    });
  });

  describe('Reports', () => {
    it('getProfitLoss() GETs /admin/treasury/reports/profit-loss/ with params', async () => {
      await treasuryAPI.getProfitLoss({ start_date: '2026-01-01' });
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/reports/profit-loss/', {
        params: { start_date: '2026-01-01' },
      });
    });

    it('getFinancialSummary() GETs /admin/treasury/reports/summary/ with params', async () => {
      await treasuryAPI.getFinancialSummary({ year: 2026 });
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/reports/summary/', { params: { year: 2026 } });
    });

    it('getMonthlyReport() GETs /admin/treasury/reports/monthly/ with params', async () => {
      await treasuryAPI.getMonthlyReport({ month: 5, year: 2026 });
      expect(api.get).toHaveBeenCalledWith('/admin/treasury/reports/monthly/', {
        params: { month: 5, year: 2026 },
      });
    });
  });
});
