/**
 * Smoke tests pour analyticsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { analyticsAPI } from '../analytics';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('analyticsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getDashboardSummary() GETs /analytics/dashboard_summary/ with params', async () => {
    await analyticsAPI.getDashboardSummary({ range: '7d' });
    expect(api.get).toHaveBeenCalledWith('/analytics/dashboard_summary/', { params: { range: '7d' } });
  });

  it('getEventAnalytics() GETs /analytics/events/ with params', async () => {
    await analyticsAPI.getEventAnalytics({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/analytics/events/', { params: { event: 'eid' } });
  });

  it('getEventRegistrations() GETs /analytics/event_registrations/ with params', async () => {
    await analyticsAPI.getEventRegistrations({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/analytics/event_registrations/', { params: { event: 'eid' } });
  });

  it('predictAttendance() GETs /analytics/predict_attendance/ with params', async () => {
    await analyticsAPI.predictAttendance({ event_id: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/analytics/predict_attendance/', { params: { event_id: 'eid' } });
  });

  it('getRegistrationAnalytics() GETs /analytics/registrations/ with params', async () => {
    await analyticsAPI.getRegistrationAnalytics({ range: '30d' });
    expect(api.get).toHaveBeenCalledWith('/analytics/registrations/', { params: { range: '30d' } });
  });

  it('getRevenueAnalytics() GETs /analytics/revenue/ with params', async () => {
    await analyticsAPI.getRevenueAnalytics({ range: '30d' });
    expect(api.get).toHaveBeenCalledWith('/analytics/revenue/', { params: { range: '30d' } });
  });

  it('getUserAnalytics() GETs /analytics/users/ with params', async () => {
    await analyticsAPI.getUserAnalytics({ range: '30d' });
    expect(api.get).toHaveBeenCalledWith('/analytics/users/', { params: { range: '30d' } });
  });

  it('getDashboards() GETs /analytics/dashboards/ with params', async () => {
    await analyticsAPI.getDashboards({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/analytics/dashboards/', { params: { page: 1 } });
  });

  it('getDashboard() GETs /analytics/dashboards/{id}/', async () => {
    await analyticsAPI.getDashboard('did');
    expect(api.get).toHaveBeenCalledWith('/analytics/dashboards/did/');
  });

  it('createDashboard() POSTs /analytics/dashboards/', async () => {
    const data = { name: 'D1' };
    await analyticsAPI.createDashboard(data);
    expect(api.post).toHaveBeenCalledWith('/analytics/dashboards/', data);
  });

  it('updateDashboard() PUTs /analytics/dashboards/{id}/', async () => {
    const data = { name: 'D2' };
    await analyticsAPI.updateDashboard('did', data);
    expect(api.put).toHaveBeenCalledWith('/analytics/dashboards/did/', data);
  });

  it('deleteDashboard() DELETEs /analytics/dashboards/{id}/', async () => {
    await analyticsAPI.deleteDashboard('did');
    expect(api.delete).toHaveBeenCalledWith('/analytics/dashboards/did/');
  });

  it('getDashboardWidgets() GETs /analytics/dashboards/{id}/widgets/', async () => {
    await analyticsAPI.getDashboardWidgets('did');
    expect(api.get).toHaveBeenCalledWith('/analytics/dashboards/did/widgets/');
  });

  it('getWidgets() GETs /analytics/dashboard-widgets/ with params', async () => {
    await analyticsAPI.getWidgets({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/analytics/dashboard-widgets/', { params: { page: 1 } });
  });

  it('getWidget() GETs /analytics/dashboard-widgets/{id}/', async () => {
    await analyticsAPI.getWidget('wid');
    expect(api.get).toHaveBeenCalledWith('/analytics/dashboard-widgets/wid/');
  });

  it('createWidget() POSTs /analytics/dashboard-widgets/', async () => {
    const data = { type: 'chart' };
    await analyticsAPI.createWidget(data);
    expect(api.post).toHaveBeenCalledWith('/analytics/dashboard-widgets/', data);
  });

  it('updateWidget() PUTs /analytics/dashboard-widgets/{id}/', async () => {
    const data = { type: 'table' };
    await analyticsAPI.updateWidget('wid', data);
    expect(api.put).toHaveBeenCalledWith('/analytics/dashboard-widgets/wid/', data);
  });

  it('deleteWidget() DELETEs /analytics/dashboard-widgets/{id}/', async () => {
    await analyticsAPI.deleteWidget('wid');
    expect(api.delete).toHaveBeenCalledWith('/analytics/dashboard-widgets/wid/');
  });

  it('getReports() GETs /analytics/reports/ with params', async () => {
    await analyticsAPI.getReports({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/analytics/reports/', { params: { page: 1 } });
  });

  it('getReport() GETs /analytics/reports/{id}/', async () => {
    await analyticsAPI.getReport('rid');
    expect(api.get).toHaveBeenCalledWith('/analytics/reports/rid/');
  });

  it('createReport() POSTs /analytics/reports/', async () => {
    const data = { name: 'R1' };
    await analyticsAPI.createReport(data);
    expect(api.post).toHaveBeenCalledWith('/analytics/reports/', data);
  });

  it('updateReport() PUTs /analytics/reports/{id}/', async () => {
    const data = { name: 'R2' };
    await analyticsAPI.updateReport('rid', data);
    expect(api.put).toHaveBeenCalledWith('/analytics/reports/rid/', data);
  });

  it('deleteReport() DELETEs /analytics/reports/{id}/', async () => {
    await analyticsAPI.deleteReport('rid');
    expect(api.delete).toHaveBeenCalledWith('/analytics/reports/rid/');
  });

  it('generateReport() POSTs /analytics/reports/generate/', async () => {
    const data = { name: 'gen' };
    await analyticsAPI.generateReport(data);
    expect(api.post).toHaveBeenCalledWith('/analytics/reports/generate/', data);
  });
});
