/**
 * Smoke tests pour registrationsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { registrationsAPI } from '../registrations';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('registrationsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getRegistrations() GETs /registrations/ with params', async () => {
    await registrationsAPI.getRegistrations({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/registrations/', { params: { page: 1 } });
  });

  it('getRegistration() GETs /registrations/{id}/', async () => {
    await registrationsAPI.getRegistration('rid');
    expect(api.get).toHaveBeenCalledWith('/registrations/rid/');
  });

  it('createRegistration() POSTs /registrations/', async () => {
    const data = { event: 'eid' };
    await registrationsAPI.createRegistration(data);
    expect(api.post).toHaveBeenCalledWith('/registrations/', data);
  });

  it('updateRegistration() PUTs /registrations/{id}/', async () => {
    const data = { status: 'x' };
    await registrationsAPI.updateRegistration('rid', data);
    expect(api.put).toHaveBeenCalledWith('/registrations/rid/', data);
  });

  it('patchRegistration() PATCHes /registrations/{id}/', async () => {
    const data = { status: 'x' };
    await registrationsAPI.patchRegistration('rid', data);
    expect(api.patch).toHaveBeenCalledWith('/registrations/rid/', data);
  });

  it('deleteRegistration() DELETEs /registrations/{id}/', async () => {
    await registrationsAPI.deleteRegistration('rid');
    expect(api.delete).toHaveBeenCalledWith('/registrations/rid/');
  });

  it('getMyRegistrations() GETs /registrations/my_registrations/', async () => {
    await registrationsAPI.getMyRegistrations();
    expect(api.get).toHaveBeenCalledWith('/registrations/my_registrations/');
  });

  it('searchRegistrations() GETs /registrations/search/ with params', async () => {
    await registrationsAPI.searchRegistrations({ q: 'x' });
    expect(api.get).toHaveBeenCalledWith('/registrations/search/', { params: { q: 'x' } });
  });

  it('getByUser() GETs /registrations/by_user/ with params', async () => {
    await registrationsAPI.getByUser({ user_id: 'uid' });
    expect(api.get).toHaveBeenCalledWith('/registrations/by_user/', { params: { user_id: 'uid' } });
  });

  it('generateQrCodes() POSTs /registrations/{id}/generate_qr_codes/', async () => {
    await registrationsAPI.generateQrCodes('rid');
    expect(api.post).toHaveBeenCalledWith('/registrations/rid/generate_qr_codes/');
  });

  it('getAccessibleSessions() GETs /registrations/{id}/accessible-sessions/', async () => {
    await registrationsAPI.getAccessibleSessions('rid');
    expect(api.get).toHaveBeenCalledWith('/registrations/rid/accessible-sessions/');
  });

  it('bulkGenerateTickets() POSTs /registrations/bulk_generate_tickets/ with ids', async () => {
    await registrationsAPI.bulkGenerateTickets(['a', 'b']);
    expect(api.post).toHaveBeenCalledWith('/registrations/bulk_generate_tickets/', {
      registration_ids: ['a', 'b'],
    });
  });

  it('validateRegistration() POSTs /registrations/{id}/validate/', async () => {
    await registrationsAPI.validateRegistration('rid');
    expect(api.post).toHaveBeenCalledWith('/registrations/rid/validate/');
  });

  it('cancelRegistration() POSTs /registrations/{id}/cancel/', async () => {
    await registrationsAPI.cancelRegistration('rid');
    expect(api.post).toHaveBeenCalledWith('/registrations/rid/cancel/');
  });

  it('updateTickets() POSTs /registrations/{id}/update_tickets/ with tickets', async () => {
    const tickets = [{ ticket_type: 1, quantity: 2 }];
    await registrationsAPI.updateTickets('rid', tickets);
    expect(api.post).toHaveBeenCalledWith('/registrations/rid/update_tickets/', { tickets });
  });

  it('addTickets() POSTs /registrations/{id}/add_tickets/ with tickets', async () => {
    const tickets = [{ ticket_type: 1, quantity: 2, discount_code: 'X' }];
    await registrationsAPI.addTickets('rid', tickets);
    expect(api.post).toHaveBeenCalledWith('/registrations/rid/add_tickets/', { tickets });
  });

  it('checkIn() POSTs /registrations/{id}/check_in/', async () => {
    await registrationsAPI.checkIn('rid');
    expect(api.post).toHaveBeenCalledWith('/registrations/rid/check_in/');
  });

  it('verifyTicket() POSTs /registrations/verify_ticket/ with code', async () => {
    await registrationsAPI.verifyTicket('CODE');
    expect(api.post).toHaveBeenCalledWith('/registrations/verify_ticket/', { code: 'CODE' });
  });

  it('verifyAndCheckIn() POSTs /registrations/verify_and_check_in/ with code and auto_check_in', async () => {
    await registrationsAPI.verifyAndCheckIn('CODE');
    expect(api.post).toHaveBeenCalledWith('/registrations/verify_and_check_in/', {
      code: 'CODE',
      auto_check_in: true,
    });
  });

  it('verifyAndCheckIn() honors autoCheckIn=false', async () => {
    await registrationsAPI.verifyAndCheckIn('CODE', false);
    expect(api.post).toHaveBeenCalledWith('/registrations/verify_and_check_in/', {
      code: 'CODE',
      auto_check_in: false,
    });
  });

  it('verifyAndCheckInTicket() POSTs /registrations/verify_and_check_in_ticket/', async () => {
    await registrationsAPI.verifyAndCheckInTicket('CODE');
    expect(api.post).toHaveBeenCalledWith('/registrations/verify_and_check_in_ticket/', {
      code: 'CODE',
      auto_check_in: true,
    });
  });

  it('bulkCheckIn() POSTs /registrations/bulk_check_in/ with ids', async () => {
    await registrationsAPI.bulkCheckIn(['a', 'b']);
    expect(api.post).toHaveBeenCalledWith('/registrations/bulk_check_in/', {
      registration_ids: ['a', 'b'],
    });
  });

  it('getRegistrationStats() GETs /registrations/stats/ with event_id', async () => {
    await registrationsAPI.getRegistrationStats('eid');
    expect(api.get).toHaveBeenCalledWith('/registrations/stats/', { params: { event_id: 'eid' } });
  });

  it('resendConfirmation() POSTs /registrations/{id}/resend_confirmation/', async () => {
    await registrationsAPI.resendConfirmation('rid');
    expect(api.post).toHaveBeenCalledWith('/registrations/rid/resend_confirmation/');
  });

  it('sendEmail() POSTs /registrations/send_email/ with payload', async () => {
    const data = { registration_ids: ['a'], subject: 's', message: 'm' };
    await registrationsAPI.sendEmail(data);
    expect(api.post).toHaveBeenCalledWith('/registrations/send_email/', data);
  });

  it('getPendingApproval() GETs /registrations/pending_approval/ with params', async () => {
    await registrationsAPI.getPendingApproval({ event_id: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/registrations/pending_approval/', {
      params: { event_id: 'eid' },
    });
  });

  it('approveRegistration() POSTs /registrations/{id}/approve/ with note', async () => {
    await registrationsAPI.approveRegistration('rid', 'ok');
    expect(api.post).toHaveBeenCalledWith('/registrations/rid/approve/', { note: 'ok' });
  });

  it('approveRegistration() POSTs /registrations/{id}/approve/ with empty note when omitted', async () => {
    await registrationsAPI.approveRegistration('rid');
    expect(api.post).toHaveBeenCalledWith('/registrations/rid/approve/', { note: '' });
  });

  it('rejectRegistration() POSTs /registrations/{id}/reject/ with reason', async () => {
    await registrationsAPI.rejectRegistration('rid', 'spam');
    expect(api.post).toHaveBeenCalledWith('/registrations/rid/reject/', { reason: 'spam' });
  });

  it('bulkApprove() POSTs /registrations/bulk_approve/ with ids and note', async () => {
    await registrationsAPI.bulkApprove(['a', 'b'], 'ok');
    expect(api.post).toHaveBeenCalledWith('/registrations/bulk_approve/', {
      registration_ids: ['a', 'b'],
      note: 'ok',
    });
  });

  it('bulkApprove() POSTs /registrations/bulk_approve/ with empty note when omitted', async () => {
    await registrationsAPI.bulkApprove(['a']);
    expect(api.post).toHaveBeenCalledWith('/registrations/bulk_approve/', {
      registration_ids: ['a'],
      note: '',
    });
  });

  it('bulkReject() POSTs /registrations/bulk_reject/ with ids and reason', async () => {
    await registrationsAPI.bulkReject(['a', 'b'], 'spam');
    expect(api.post).toHaveBeenCalledWith('/registrations/bulk_reject/', {
      registration_ids: ['a', 'b'],
      reason: 'spam',
    });
  });
});
