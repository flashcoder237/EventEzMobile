/**
 * Smoke tests pour seatingAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { seatingAPI } from '../misc';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('seatingAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  describe('Plans', () => {
    it('getPlans() GETs /seating-plans/ with params', async () => {
      await seatingAPI.getPlans({ event: 'eid' });
      expect(api.get).toHaveBeenCalledWith('/seating-plans/', { params: { event: 'eid' } });
    });

    it('getPlan() GETs /seating-plans/{id}/', async () => {
      await seatingAPI.getPlan('pid');
      expect(api.get).toHaveBeenCalledWith('/seating-plans/pid/');
    });

    it('createPlan() POSTs /seating-plans/', async () => {
      const data = { event: 'eid', name: 'Plan' };
      await seatingAPI.createPlan(data);
      expect(api.post).toHaveBeenCalledWith('/seating-plans/', data);
    });

    it('updatePlan() PATCHes /seating-plans/{id}/', async () => {
      const data = { name: 'New' };
      await seatingAPI.updatePlan('pid', data);
      expect(api.patch).toHaveBeenCalledWith('/seating-plans/pid/', data);
    });

    it('deletePlan() DELETEs /seating-plans/{id}/', async () => {
      await seatingAPI.deletePlan('pid');
      expect(api.delete).toHaveBeenCalledWith('/seating-plans/pid/');
    });

    it('getAvailableSeats() GETs /seating-plans/{id}/available_seats/', async () => {
      await seatingAPI.getAvailableSeats('pid');
      expect(api.get).toHaveBeenCalledWith('/seating-plans/pid/available_seats/');
    });
  });

  describe('Zones', () => {
    it('getZones() GETs /seating-zones/ with params', async () => {
      await seatingAPI.getZones({ seating_plan: 'pid' });
      expect(api.get).toHaveBeenCalledWith('/seating-zones/', { params: { seating_plan: 'pid' } });
    });

    it('createZone() POSTs /seating-zones/', async () => {
      const data = { seating_plan: 'pid', name: 'VIP' };
      await seatingAPI.createZone(data);
      expect(api.post).toHaveBeenCalledWith('/seating-zones/', data);
    });

    it('updateZone() PATCHes /seating-zones/{id}/', async () => {
      const data = { name: 'Standard' };
      await seatingAPI.updateZone('zid', data);
      expect(api.patch).toHaveBeenCalledWith('/seating-zones/zid/', data);
    });

    it('deleteZone() DELETEs /seating-zones/{id}/', async () => {
      await seatingAPI.deleteZone('zid');
      expect(api.delete).toHaveBeenCalledWith('/seating-zones/zid/');
    });
  });

  describe('Reservations', () => {
    it('createReservation() POSTs /seat-reservations/', async () => {
      const data = { seating_plan: 'pid', zone: 'zid', seat_label: 'A1' };
      await seatingAPI.createReservation(data);
      expect(api.post).toHaveBeenCalledWith('/seat-reservations/', data);
    });

    it('confirmReservation() POSTs /seat-reservations/{id}/confirm/', async () => {
      await seatingAPI.confirmReservation('rid');
      expect(api.post).toHaveBeenCalledWith('/seat-reservations/rid/confirm/');
    });

    it('cancelReservation() POSTs /seat-reservations/{id}/cancel/', async () => {
      await seatingAPI.cancelReservation('rid');
      expect(api.post).toHaveBeenCalledWith('/seat-reservations/rid/cancel/');
    });

    it('getMyReservations() GETs /seat-reservations/my_reservations/', async () => {
      await seatingAPI.getMyReservations();
      expect(api.get).toHaveBeenCalledWith('/seat-reservations/my_reservations/');
    });
  });
});
