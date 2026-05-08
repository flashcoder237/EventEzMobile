/**
 * Smoke tests pour les APIs exposées depuis `src/api/events.ts`.
 *
 * Couvre toutes les fonctions exportées par ce module source — `eventsAPI`,
 * `eventTemplatesAPI`, `categoriesAPI` et `tagsAPI` — afin que le mutation
 * testing (qui exécute uniquement `events.test.ts` pour `events.ts`) puisse
 * détecter les altérations de verbe HTTP ou d'URL sur n'importe laquelle
 * de ces sous-APIs.
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

import { eventsAPI, eventTemplatesAPI, categoriesAPI, tagsAPI } from '../events';
import { fetchUpload } from '../config';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

const fetchUploadMock = fetchUpload as jest.Mock;

describe('eventsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getEvents() GETs /events/ with params', async () => {
    await eventsAPI.getEvents({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/events/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getEvent() GETs /events/{id}/', async () => {
    await eventsAPI.getEvent('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('createEvent() POSTs /events/ when JSON body', async () => {
    const data = { title: 'X' };
    await eventsAPI.createEvent(data);
    expect(api.post).toHaveBeenCalledWith('/events/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('createEvent() calls fetchUpload POST /events/ when FormData', async () => {
    const fd = new FormData();
    await eventsAPI.createEvent(fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/events/', fd);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('updateEvent() PUTs /events/{id}/ when JSON body', async () => {
    const data = { title: 'X' };
    await eventsAPI.updateEvent('eid', data);
    expect(api.put).toHaveBeenCalledWith('/events/eid/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('updateEvent() calls fetchUpload PATCH /events/{id}/ when FormData', async () => {
    const fd = new FormData();
    await eventsAPI.updateEvent('eid', fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('PATCH', '/events/eid/', fd);
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('patchEvent() PATCHes /events/{id}/', async () => {
    const data = { title: 'X' };
    await eventsAPI.patchEvent('eid', data);
    expect(api.patch).toHaveBeenCalledWith('/events/eid/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deleteEvent() DELETEs /events/{id}/', async () => {
    await eventsAPI.deleteEvent('eid');
    expect(api.delete).toHaveBeenCalledWith('/events/eid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('getFeaturedEvents() GETs /events/featured/ with params', async () => {
    await eventsAPI.getFeaturedEvents({ limit: 5 });
    expect(api.get).toHaveBeenCalledWith('/events/featured/', { params: { limit: 5 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('getMyEvents() GETs /events/my_events/', async () => {
    await eventsAPI.getMyEvents();
    expect(api.get).toHaveBeenCalledWith('/events/my_events/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('uploadImages() calls fetchUpload POST /events/{id}/upload_images/', async () => {
    const fd = new FormData();
    await eventsAPI.uploadImages('eid', fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/events/eid/upload_images/', fd);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('publishEvent() POSTs /events/{id}/publish/', async () => {
    await eventsAPI.publishEvent('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/publish/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('cancelEvent() POSTs /events/{id}/cancel/ with reason', async () => {
    await eventsAPI.cancelEvent('eid', 'r');
    expect(api.post).toHaveBeenCalledWith('/events/eid/cancel/', { reason: 'r' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('duplicateEvent() POSTs /events/{id}/duplicate/', async () => {
    await eventsAPI.duplicateEvent('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/duplicate/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('verifyAccessCode() POSTs /events/{id}/verify_access_code/', async () => {
    await eventsAPI.verifyAccessCode('eid', 'CODE');
    expect(api.post).toHaveBeenCalledWith('/events/eid/verify_access_code/', { access_code: 'CODE' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('submitForValidation() POSTs /events/{id}/submit_for_validation/', async () => {
    await eventsAPI.submitForValidation('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/submit_for_validation/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('validateEvent() POSTs /events/{id}/validate_event/', async () => {
    await eventsAPI.validateEvent('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/validate_event/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('rejectEvent() POSTs /events/{id}/reject_event/ with rejection_reason', async () => {
    await eventsAPI.rejectEvent('eid', 'bad');
    expect(api.post).toHaveBeenCalledWith('/events/eid/reject_event/', { rejection_reason: 'bad' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('requestChanges() POSTs /events/{id}/request-changes/ with note', async () => {
    await eventsAPI.requestChanges('eid', 'fix me');
    expect(api.post).toHaveBeenCalledWith('/events/eid/request-changes/', { note: 'fix me' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('getInternalNotes() GETs /events/{id}/internal-notes/', async () => {
    await eventsAPI.getInternalNotes('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/internal-notes/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('saveInternalNotes() POSTs /events/{id}/internal-notes/ with notes', async () => {
    await eventsAPI.saveInternalNotes('eid', 'note');
    expect(api.post).toHaveBeenCalledWith('/events/eid/internal-notes/', { notes: 'note' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('getPendingValidation() GETs /events/pending_validation/', async () => {
    await eventsAPI.getPendingValidation();
    expect(api.get).toHaveBeenCalledWith('/events/pending_validation/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('followEvent() POSTs /events/{id}/follow/ with preferences', async () => {
    const prefs = { notification_preference: 'all' as const };
    await eventsAPI.followEvent('eid', prefs);
    expect(api.post).toHaveBeenCalledWith('/events/eid/follow/', prefs);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('followEvent() POSTs /events/{id}/follow/ with empty body when no prefs', async () => {
    await eventsAPI.followEvent('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/follow/', {});
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('unfollowEvent() POSTs /events/{id}/unfollow/', async () => {
    await eventsAPI.unfollowEvent('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/unfollow/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('updateFollowPreferences() PATCHes /events/{id}/update_follow_preferences/', async () => {
    const prefs = { notify_email: true };
    await eventsAPI.updateFollowPreferences('eid', prefs);
    expect(api.patch).toHaveBeenCalledWith('/events/eid/update_follow_preferences/', prefs);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('isFollowing() GETs /events/{id}/is_following/', async () => {
    await eventsAPI.isFollowing('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/is_following/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('getFollowingEvents() GETs /events/following/', async () => {
    await eventsAPI.getFollowingEvents();
    expect(api.get).toHaveBeenCalledWith('/events/following/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('getFollowersCount() GETs /events/{id}/followers_count/', async () => {
    await eventsAPI.getFollowersCount('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/followers_count/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('getNearbyEvents() GETs /events/nearby/ with lat/lng', async () => {
    await eventsAPI.getNearbyEvents(1.5, 2.5);
    expect(api.get).toHaveBeenCalledWith('/events/nearby/', { params: { lat: 1.5, lng: 2.5 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('getNearbyEvents() GETs /events/nearby/ with radius and limit', async () => {
    await eventsAPI.getNearbyEvents(1.5, 2.5, 10, 20);
    expect(api.get).toHaveBeenCalledWith('/events/nearby/', {
      params: { lat: 1.5, lng: 2.5, radius: 10, limit: 20 },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('getCities() GETs /events/cities/ with params', async () => {
    await eventsAPI.getCities({ search: 'pa' });
    expect(api.get).toHaveBeenCalledWith('/events/cities/', { params: { search: 'pa' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('getMapEvents() GETs /events/map_events/ with params', async () => {
    await eventsAPI.getMapEvents({ city: 'paris' });
    expect(api.get).toHaveBeenCalledWith('/events/map_events/', { params: { city: 'paris' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('searchEvents() GETs /events/ with search param', async () => {
    await eventsAPI.searchEvents('q');
    expect(api.get).toHaveBeenCalledWith('/events/', { params: { search: 'q' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('exportIcal() GETs /events/{id}/export-ical/ with arraybuffer responseType', async () => {
    await eventsAPI.exportIcal('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/export-ical/', { responseType: 'arraybuffer' });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('getGoogleCalendarLink() GETs /events/{id}/google-calendar-link/', async () => {
    await eventsAPI.getGoogleCalendarLink('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/google-calendar-link/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('createRecurrence() POSTs /events/{id}/create_recurrence/', async () => {
    const data = { rule: 'WEEKLY' };
    await eventsAPI.createRecurrence('eid', data);
    expect(api.post).toHaveBeenCalledWith('/events/eid/create_recurrence/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('getInstances() GETs /events/{id}/instances/ with params', async () => {
    await eventsAPI.getInstances('eid', { from: 'x' });
    expect(api.get).toHaveBeenCalledWith('/events/eid/instances/', { params: { from: 'x' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('getFormFields() GETs /form-fields/ with event param', async () => {
    await eventsAPI.getFormFields('eid');
    expect(api.get).toHaveBeenCalledWith('/form-fields/', { params: { event: 'eid' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('createFormField() POSTs /form-fields/', async () => {
    const data = { label: 'X' };
    await eventsAPI.createFormField(data);
    expect(api.post).toHaveBeenCalledWith('/form-fields/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('updateFormField() PUTs /form-fields/{id}/', async () => {
    const data = { label: 'Y' };
    await eventsAPI.updateFormField(7, data);
    expect(api.put).toHaveBeenCalledWith('/form-fields/7/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deleteFormField() DELETEs /form-fields/{id}/', async () => {
    await eventsAPI.deleteFormField(7);
    expect(api.delete).toHaveBeenCalledWith('/form-fields/7/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('updateFormFields() POSTs /events/{id}/update_form_fields/', async () => {
    const data = { fields: [] };
    await eventsAPI.updateFormFields('eid', data);
    expect(api.post).toHaveBeenCalledWith('/events/eid/update_form_fields/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('requestFeature() POSTs /events/{id}/request_feature/ with data', async () => {
    const data = { reason: 'r' };
    await eventsAPI.requestFeature('eid', data);
    expect(api.post).toHaveBeenCalledWith('/events/eid/request_feature/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('requestFeature() POSTs /events/{id}/request_feature/ with empty body when no data', async () => {
    await eventsAPI.requestFeature('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/request_feature/', {});
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// EVENT TEMPLATES — colocated to ensure mutation testing covers events.ts in
// full (le runner exécute `events.test.ts` quand il mute `events.ts`).
// ===========================================================================
describe('eventTemplatesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getAll() GETs /event-templates/ with params', async () => {
    await eventTemplatesAPI.getAll({ type: 'concert' });
    expect(api.get).toHaveBeenCalledWith('/event-templates/', { params: { type: 'concert' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getById() GETs /event-templates/{id}/', async () => {
    await eventTemplatesAPI.getById('tid');
    expect(api.get).toHaveBeenCalledWith('/event-templates/tid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// CATEGORIES — colocated for the same reason. Voir explication ci-dessus.
// ===========================================================================
describe('categoriesAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getCategories() GETs /categories/ with params', async () => {
    await categoriesAPI.getCategories({ active: true });
    expect(api.get).toHaveBeenCalledWith('/categories/', { params: { active: true } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getCategory() GETs /categories/{id}/', async () => {
    await categoriesAPI.getCategory(7);
    expect(api.get).toHaveBeenCalledWith('/categories/7/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('createCategory() POSTs /categories/', async () => {
    const data = { name: 'X' };
    await categoriesAPI.createCategory(data);
    expect(api.post).toHaveBeenCalledWith('/categories/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('updateCategory() PUTs /categories/{id}/', async () => {
    const data = { name: 'Y' };
    await categoriesAPI.updateCategory(7, data);
    expect(api.put).toHaveBeenCalledWith('/categories/7/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deleteCategory() DELETEs /categories/{id}/', async () => {
    await categoriesAPI.deleteCategory(7);
    expect(api.delete).toHaveBeenCalledWith('/categories/7/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('getCategoryEvents() GETs /categories/{id}/events/', async () => {
    await categoriesAPI.getCategoryEvents(7);
    expect(api.get).toHaveBeenCalledWith('/categories/7/events/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('toggleActive() POSTs /categories/{id}/toggle_active/', async () => {
    await categoriesAPI.toggleActive(7);
    expect(api.post).toHaveBeenCalledWith('/categories/7/toggle_active/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('uploadImage() calls fetchUpload POST /categories/{id}/upload_image/', async () => {
    const fd = new FormData();
    await categoriesAPI.uploadImage(7, fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/categories/7/upload_image/', fd);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('uploadDefaultEventImage() calls fetchUpload POST /categories/{id}/upload_default_event_image/', async () => {
    const fd = new FormData();
    await categoriesAPI.uploadDefaultEventImage(7, fd);
    expect(fetchUploadMock).toHaveBeenCalledWith(
      'POST',
      '/categories/7/upload_default_event_image/',
      fd,
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// TAGS — colocated for the same reason.
// ===========================================================================
describe('tagsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getTags() GETs /tags/ with params', async () => {
    await tagsAPI.getTags({ q: 'x' });
    expect(api.get).toHaveBeenCalledWith('/tags/', { params: { q: 'x' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getTag() GETs /tags/{id}/', async () => {
    await tagsAPI.getTag(7);
    expect(api.get).toHaveBeenCalledWith('/tags/7/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
