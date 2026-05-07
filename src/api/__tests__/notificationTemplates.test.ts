/**
 * Smoke tests pour notificationTemplatesAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { notificationTemplatesAPI } from '../notifications';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('notificationTemplatesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getTemplates() GETs /notification-templates/ with params', async () => {
    await notificationTemplatesAPI.getTemplates({ active: true });
    expect(api.get).toHaveBeenCalledWith('/notification-templates/', { params: { active: true } });
  });

  it('getTemplate() GETs /notification-templates/{id}/', async () => {
    await notificationTemplatesAPI.getTemplate('tid');
    expect(api.get).toHaveBeenCalledWith('/notification-templates/tid/');
  });

  it('createTemplate() POSTs /notification-templates/', async () => {
    const data = { name: 't' };
    await notificationTemplatesAPI.createTemplate(data);
    expect(api.post).toHaveBeenCalledWith('/notification-templates/', data);
  });

  it('updateTemplate() PUTs /notification-templates/{id}/', async () => {
    const data = { name: 't2' };
    await notificationTemplatesAPI.updateTemplate('tid', data);
    expect(api.put).toHaveBeenCalledWith('/notification-templates/tid/', data);
  });

  it('deleteTemplate() DELETEs /notification-templates/{id}/', async () => {
    await notificationTemplatesAPI.deleteTemplate('tid');
    expect(api.delete).toHaveBeenCalledWith('/notification-templates/tid/');
  });
});
