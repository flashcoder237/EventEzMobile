/**
 * Smoke tests pour categoriesAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

jest.mock('../config', () => ({
  __esModule: true,
  API_BASE_URL: 'http://test.local/api',
  SERVER_BASE_URL: 'http://test.local',
  ACCESS_TOKEN_KEY: 'eventez_access_token',
  REFRESH_TOKEN_KEY: 'eventez_refresh_token',
  getMediaUrl: jest.fn(),
  fetchUpload: jest.fn(() => Promise.resolve({ data: {} })),
}));

import { categoriesAPI } from '../events';
import { fetchUpload } from '../config';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

const fetchUploadMock = fetchUpload as jest.Mock;

describe('categoriesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getCategories() GETs /categories/ with params', async () => {
    await categoriesAPI.getCategories({ active: true });
    expect(api.get).toHaveBeenCalledWith('/categories/', { params: { active: true } });
  });

  it('getCategory() GETs /categories/{id}/', async () => {
    await categoriesAPI.getCategory(7);
    expect(api.get).toHaveBeenCalledWith('/categories/7/');
  });

  it('createCategory() POSTs /categories/', async () => {
    const data = { name: 'X' };
    await categoriesAPI.createCategory(data);
    expect(api.post).toHaveBeenCalledWith('/categories/', data);
  });

  it('updateCategory() PUTs /categories/{id}/', async () => {
    const data = { name: 'Y' };
    await categoriesAPI.updateCategory(7, data);
    expect(api.put).toHaveBeenCalledWith('/categories/7/', data);
  });

  it('deleteCategory() DELETEs /categories/{id}/', async () => {
    await categoriesAPI.deleteCategory(7);
    expect(api.delete).toHaveBeenCalledWith('/categories/7/');
  });

  it('getCategoryEvents() GETs /categories/{id}/events/', async () => {
    await categoriesAPI.getCategoryEvents(7);
    expect(api.get).toHaveBeenCalledWith('/categories/7/events/');
  });

  it('toggleActive() POSTs /categories/{id}/toggle_active/', async () => {
    await categoriesAPI.toggleActive(7);
    expect(api.post).toHaveBeenCalledWith('/categories/7/toggle_active/');
  });

  it('uploadImage() calls fetchUpload POST /categories/{id}/upload_image/', async () => {
    const fd = new FormData();
    await categoriesAPI.uploadImage(7, fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/categories/7/upload_image/', fd);
  });

  it('uploadDefaultEventImage() calls fetchUpload POST /categories/{id}/upload_default_event_image/', async () => {
    const fd = new FormData();
    await categoriesAPI.uploadDefaultEventImage(7, fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/categories/7/upload_default_event_image/', fd);
  });
});
