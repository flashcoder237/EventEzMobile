/**
 * Smoke tests pour les APIs exposées depuis `src/api/notifications.ts`.
 *
 * Couvre `notificationsAPI` et `notificationTemplatesAPI` colocalisées, afin
 * que le mutation testing (qui exécute uniquement `notifications.test.ts` pour
 * `notifications.ts`) détecte les altérations de verbe HTTP ou d'URL sur
 * n'importe laquelle de ces sous-APIs.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { notificationsAPI, notificationTemplatesAPI } from '../notifications';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

const expectOnly = (
  api: ReturnType<typeof getMockedApi>,
  used: 'get' | 'post' | 'put' | 'patch' | 'delete',
) => {
  const verbs: Array<'get' | 'post' | 'put' | 'patch' | 'delete'> = [
    'get',
    'post',
    'put',
    'patch',
    'delete',
  ];
  for (const verb of verbs) {
    if (verb !== used) expect(api[verb]).not.toHaveBeenCalled();
  }
};

describe('notificationsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getNotifications() GETs /notifications/ with params', async () => {
    await notificationsAPI.getNotifications({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/notifications/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getNotification() GETs /notifications/{id}/', async () => {
    await notificationsAPI.getNotification('nid');
    expect(api.get).toHaveBeenCalledWith('/notifications/nid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('deleteNotification() DELETEs /notifications/{id}/', async () => {
    await notificationsAPI.deleteNotification('nid');
    expect(api.delete).toHaveBeenCalledWith('/notifications/nid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });

  it('markAsRead() POSTs /notifications/{id}/mark_as_read/', async () => {
    await notificationsAPI.markAsRead('nid');
    expect(api.post).toHaveBeenCalledWith('/notifications/nid/mark_as_read/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('markAllAsRead() POSTs /notifications/mark_all_as_read/', async () => {
    await notificationsAPI.markAllAsRead();
    expect(api.post).toHaveBeenCalledWith('/notifications/mark_all_as_read/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('deleteMultiple() POSTs /notifications/delete_multiple/ with notification_ids', async () => {
    await notificationsAPI.deleteMultiple(['a', 'b']);
    expect(api.post).toHaveBeenCalledWith('/notifications/delete_multiple/', {
      notification_ids: ['a', 'b'],
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('sendNotification() POSTs /notifications/send/', async () => {
    const data = { title: 't', message: 'm', user_ids: ['u1'] };
    await notificationsAPI.sendNotification(data);
    expect(api.post).toHaveBeenCalledWith('/notifications/send/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('scheduleNotification() POSTs /notifications/schedule/', async () => {
    const data = { title: 't', message: 'm', scheduled_time: '2026-01-01T00:00:00Z' };
    await notificationsAPI.scheduleNotification(data);
    expect(api.post).toHaveBeenCalledWith('/notifications/schedule/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('getScheduledNotifications() GETs /notifications/scheduled/', async () => {
    await notificationsAPI.getScheduledNotifications();
    expect(api.get).toHaveBeenCalledWith('/notifications/scheduled/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('cancelScheduledNotification() POSTs /notifications/{id}/cancel_scheduled/', async () => {
    await notificationsAPI.cancelScheduledNotification('nid');
    expect(api.post).toHaveBeenCalledWith('/notifications/nid/cancel_scheduled/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('getNotificationStatistics() GETs /notifications/statistics/ with params', async () => {
    await notificationsAPI.getNotificationStatistics({ range: '7d' });
    expect(api.get).toHaveBeenCalledWith('/notifications/statistics/', {
      params: { range: '7d' },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('updatePreferences() PATCHes /notifications/preferences/', async () => {
    const data = { email_enabled: true };
    await notificationsAPI.updatePreferences(data);
    expect(api.patch).toHaveBeenCalledWith('/notifications/preferences/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expectOnly(api, 'patch');
  });

  it('registerDevice() POSTs /notifications/register-device/', async () => {
    const data = {
      push_token: 'tok',
      device_type: 'android' as const,
      device_name: 'Pixel',
    };
    await notificationsAPI.registerDevice(data);
    expect(api.post).toHaveBeenCalledWith('/notifications/register-device/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('unregisterDevice() POSTs /notifications/unregister-device/ with push_token', async () => {
    await notificationsAPI.unregisterDevice('tok');
    expect(api.post).toHaveBeenCalledWith('/notifications/unregister-device/', {
      push_token: 'tok',
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('getDevices() GETs /notifications/devices/', async () => {
    await notificationsAPI.getDevices();
    expect(api.get).toHaveBeenCalledWith('/notifications/devices/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });
});

describe('notificationTemplatesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getTemplates() GETs /notification-templates/ with params', async () => {
    await notificationTemplatesAPI.getTemplates({ active: true });
    expect(api.get).toHaveBeenCalledWith('/notification-templates/', {
      params: { active: true },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getTemplate() GETs /notification-templates/{id}/', async () => {
    await notificationTemplatesAPI.getTemplate('tid');
    expect(api.get).toHaveBeenCalledWith('/notification-templates/tid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('createTemplate() POSTs /notification-templates/', async () => {
    const data = { name: 't' };
    await notificationTemplatesAPI.createTemplate(data);
    expect(api.post).toHaveBeenCalledWith('/notification-templates/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('updateTemplate() PUTs /notification-templates/{id}/', async () => {
    const data = { name: 't2' };
    await notificationTemplatesAPI.updateTemplate('tid', data);
    expect(api.put).toHaveBeenCalledWith('/notification-templates/tid/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expectOnly(api, 'put');
  });

  it('deleteTemplate() DELETEs /notification-templates/{id}/', async () => {
    await notificationTemplatesAPI.deleteTemplate('tid');
    expect(api.delete).toHaveBeenCalledWith('/notification-templates/tid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });
});
