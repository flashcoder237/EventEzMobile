/**
 * Smoke tests pour notificationsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { notificationsAPI } from '../notifications';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('notificationsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getNotifications() GETs /notifications/ with params', async () => {
    await notificationsAPI.getNotifications({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/notifications/', { params: { page: 1 } });
  });

  it('getNotification() GETs /notifications/{id}/', async () => {
    await notificationsAPI.getNotification('nid');
    expect(api.get).toHaveBeenCalledWith('/notifications/nid/');
  });

  it('deleteNotification() DELETEs /notifications/{id}/', async () => {
    await notificationsAPI.deleteNotification('nid');
    expect(api.delete).toHaveBeenCalledWith('/notifications/nid/');
  });

  it('markAsRead() POSTs /notifications/{id}/mark_as_read/', async () => {
    await notificationsAPI.markAsRead('nid');
    expect(api.post).toHaveBeenCalledWith('/notifications/nid/mark_as_read/');
  });

  it('markAllAsRead() POSTs /notifications/mark_all_as_read/', async () => {
    await notificationsAPI.markAllAsRead();
    expect(api.post).toHaveBeenCalledWith('/notifications/mark_all_as_read/');
  });

  it('deleteMultiple() POSTs /notifications/delete_multiple/ with notification_ids', async () => {
    await notificationsAPI.deleteMultiple(['a', 'b']);
    expect(api.post).toHaveBeenCalledWith('/notifications/delete_multiple/', {
      notification_ids: ['a', 'b'],
    });
  });

  it('sendNotification() POSTs /notifications/send/', async () => {
    const data = { title: 't', message: 'm', user_ids: ['u1'] };
    await notificationsAPI.sendNotification(data);
    expect(api.post).toHaveBeenCalledWith('/notifications/send/', data);
  });

  it('scheduleNotification() POSTs /notifications/schedule/', async () => {
    const data = { title: 't', message: 'm', scheduled_time: '2026-01-01T00:00:00Z' };
    await notificationsAPI.scheduleNotification(data);
    expect(api.post).toHaveBeenCalledWith('/notifications/schedule/', data);
  });

  it('getScheduledNotifications() GETs /notifications/scheduled/', async () => {
    await notificationsAPI.getScheduledNotifications();
    expect(api.get).toHaveBeenCalledWith('/notifications/scheduled/');
  });

  it('cancelScheduledNotification() POSTs /notifications/{id}/cancel_scheduled/', async () => {
    await notificationsAPI.cancelScheduledNotification('nid');
    expect(api.post).toHaveBeenCalledWith('/notifications/nid/cancel_scheduled/');
  });

  it('getNotificationStatistics() GETs /notifications/statistics/ with params', async () => {
    await notificationsAPI.getNotificationStatistics({ range: '7d' });
    expect(api.get).toHaveBeenCalledWith('/notifications/statistics/', { params: { range: '7d' } });
  });

  it('updatePreferences() PATCHes /notifications/preferences/', async () => {
    const data = { email_enabled: true };
    await notificationsAPI.updatePreferences(data);
    expect(api.patch).toHaveBeenCalledWith('/notifications/preferences/', data);
  });

  it('registerDevice() POSTs /notifications/register-device/', async () => {
    const data = {
      push_token: 'tok',
      device_type: 'android' as const,
      device_name: 'Pixel',
    };
    await notificationsAPI.registerDevice(data);
    expect(api.post).toHaveBeenCalledWith('/notifications/register-device/', data);
  });

  it('unregisterDevice() POSTs /notifications/unregister-device/ with push_token', async () => {
    await notificationsAPI.unregisterDevice('tok');
    expect(api.post).toHaveBeenCalledWith('/notifications/unregister-device/', { push_token: 'tok' });
  });

  it('getDevices() GETs /notifications/devices/', async () => {
    await notificationsAPI.getDevices();
    expect(api.get).toHaveBeenCalledWith('/notifications/devices/');
  });
});
