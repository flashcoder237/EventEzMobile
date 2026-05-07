/**
 * Smoke tests pour eventsAPI — vérifie URL + verbe HTTP + body shape.
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

import { eventsAPI } from '../events';
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
  });

  it('getEvent() GETs /events/{id}/', async () => {
    await eventsAPI.getEvent('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/');
  });

  it('createEvent() POSTs /events/ when JSON body', async () => {
    const data = { title: 'X' };
    await eventsAPI.createEvent(data);
    expect(api.post).toHaveBeenCalledWith('/events/', data);
  });

  it('createEvent() calls fetchUpload POST /events/ when FormData', async () => {
    const fd = new FormData();
    await eventsAPI.createEvent(fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/events/', fd);
  });

  it('updateEvent() PUTs /events/{id}/ when JSON body', async () => {
    const data = { title: 'X' };
    await eventsAPI.updateEvent('eid', data);
    expect(api.put).toHaveBeenCalledWith('/events/eid/', data);
  });

  it('updateEvent() calls fetchUpload PATCH /events/{id}/ when FormData', async () => {
    const fd = new FormData();
    await eventsAPI.updateEvent('eid', fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('PATCH', '/events/eid/', fd);
  });

  it('patchEvent() PATCHes /events/{id}/', async () => {
    const data = { title: 'X' };
    await eventsAPI.patchEvent('eid', data);
    expect(api.patch).toHaveBeenCalledWith('/events/eid/', data);
  });

  it('deleteEvent() DELETEs /events/{id}/', async () => {
    await eventsAPI.deleteEvent('eid');
    expect(api.delete).toHaveBeenCalledWith('/events/eid/');
  });

  it('getFeaturedEvents() GETs /events/featured/ with params', async () => {
    await eventsAPI.getFeaturedEvents({ limit: 5 });
    expect(api.get).toHaveBeenCalledWith('/events/featured/', { params: { limit: 5 } });
  });

  it('getMyEvents() GETs /events/my_events/', async () => {
    await eventsAPI.getMyEvents();
    expect(api.get).toHaveBeenCalledWith('/events/my_events/');
  });

  it('uploadImages() calls fetchUpload POST /events/{id}/upload_images/', async () => {
    const fd = new FormData();
    await eventsAPI.uploadImages('eid', fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/events/eid/upload_images/', fd);
  });

  it('publishEvent() POSTs /events/{id}/publish/', async () => {
    await eventsAPI.publishEvent('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/publish/');
  });

  it('cancelEvent() POSTs /events/{id}/cancel/ with reason', async () => {
    await eventsAPI.cancelEvent('eid', 'r');
    expect(api.post).toHaveBeenCalledWith('/events/eid/cancel/', { reason: 'r' });
  });

  it('duplicateEvent() POSTs /events/{id}/duplicate/', async () => {
    await eventsAPI.duplicateEvent('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/duplicate/');
  });

  it('verifyAccessCode() POSTs /events/{id}/verify_access_code/', async () => {
    await eventsAPI.verifyAccessCode('eid', 'CODE');
    expect(api.post).toHaveBeenCalledWith('/events/eid/verify_access_code/', { access_code: 'CODE' });
  });

  it('submitForValidation() POSTs /events/{id}/submit_for_validation/', async () => {
    await eventsAPI.submitForValidation('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/submit_for_validation/');
  });

  it('validateEvent() POSTs /events/{id}/validate_event/', async () => {
    await eventsAPI.validateEvent('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/validate_event/');
  });

  it('rejectEvent() POSTs /events/{id}/reject_event/ with rejection_reason', async () => {
    await eventsAPI.rejectEvent('eid', 'bad');
    expect(api.post).toHaveBeenCalledWith('/events/eid/reject_event/', { rejection_reason: 'bad' });
  });

  it('requestChanges() POSTs /events/{id}/request-changes/ with note', async () => {
    await eventsAPI.requestChanges('eid', 'fix me');
    expect(api.post).toHaveBeenCalledWith('/events/eid/request-changes/', { note: 'fix me' });
  });

  it('getInternalNotes() GETs /events/{id}/internal-notes/', async () => {
    await eventsAPI.getInternalNotes('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/internal-notes/');
  });

  it('saveInternalNotes() POSTs /events/{id}/internal-notes/ with notes', async () => {
    await eventsAPI.saveInternalNotes('eid', 'note');
    expect(api.post).toHaveBeenCalledWith('/events/eid/internal-notes/', { notes: 'note' });
  });

  it('getPendingValidation() GETs /events/pending_validation/', async () => {
    await eventsAPI.getPendingValidation();
    expect(api.get).toHaveBeenCalledWith('/events/pending_validation/');
  });

  it('followEvent() POSTs /events/{id}/follow/ with preferences', async () => {
    const prefs = { notification_preference: 'all' as const };
    await eventsAPI.followEvent('eid', prefs);
    expect(api.post).toHaveBeenCalledWith('/events/eid/follow/', prefs);
  });

  it('followEvent() POSTs /events/{id}/follow/ with empty body when no prefs', async () => {
    await eventsAPI.followEvent('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/follow/', {});
  });

  it('unfollowEvent() POSTs /events/{id}/unfollow/', async () => {
    await eventsAPI.unfollowEvent('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/unfollow/');
  });

  it('updateFollowPreferences() PATCHes /events/{id}/update_follow_preferences/', async () => {
    const prefs = { notify_email: true };
    await eventsAPI.updateFollowPreferences('eid', prefs);
    expect(api.patch).toHaveBeenCalledWith('/events/eid/update_follow_preferences/', prefs);
  });

  it('isFollowing() GETs /events/{id}/is_following/', async () => {
    await eventsAPI.isFollowing('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/is_following/');
  });

  it('getFollowingEvents() GETs /events/following/', async () => {
    await eventsAPI.getFollowingEvents();
    expect(api.get).toHaveBeenCalledWith('/events/following/');
  });

  it('getFollowersCount() GETs /events/{id}/followers_count/', async () => {
    await eventsAPI.getFollowersCount('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/followers_count/');
  });

  it('getNearbyEvents() GETs /events/nearby/ with lat/lng', async () => {
    await eventsAPI.getNearbyEvents(1.5, 2.5);
    expect(api.get).toHaveBeenCalledWith('/events/nearby/', { params: { lat: 1.5, lng: 2.5 } });
  });

  it('getNearbyEvents() GETs /events/nearby/ with radius and limit', async () => {
    await eventsAPI.getNearbyEvents(1.5, 2.5, 10, 20);
    expect(api.get).toHaveBeenCalledWith('/events/nearby/', {
      params: { lat: 1.5, lng: 2.5, radius: 10, limit: 20 },
    });
  });

  it('getCities() GETs /events/cities/ with params', async () => {
    await eventsAPI.getCities({ search: 'pa' });
    expect(api.get).toHaveBeenCalledWith('/events/cities/', { params: { search: 'pa' } });
  });

  it('getMapEvents() GETs /events/map_events/ with params', async () => {
    await eventsAPI.getMapEvents({ city: 'paris' });
    expect(api.get).toHaveBeenCalledWith('/events/map_events/', { params: { city: 'paris' } });
  });

  it('searchEvents() GETs /events/ with search param', async () => {
    await eventsAPI.searchEvents('q');
    expect(api.get).toHaveBeenCalledWith('/events/', { params: { search: 'q' } });
  });

  it('exportIcal() GETs /events/{id}/export-ical/ with arraybuffer responseType', async () => {
    await eventsAPI.exportIcal('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/export-ical/', { responseType: 'arraybuffer' });
  });

  it('getGoogleCalendarLink() GETs /events/{id}/google-calendar-link/', async () => {
    await eventsAPI.getGoogleCalendarLink('eid');
    expect(api.get).toHaveBeenCalledWith('/events/eid/google-calendar-link/');
  });

  it('createRecurrence() POSTs /events/{id}/create_recurrence/', async () => {
    const data = { rule: 'WEEKLY' };
    await eventsAPI.createRecurrence('eid', data);
    expect(api.post).toHaveBeenCalledWith('/events/eid/create_recurrence/', data);
  });

  it('getInstances() GETs /events/{id}/instances/ with params', async () => {
    await eventsAPI.getInstances('eid', { from: 'x' });
    expect(api.get).toHaveBeenCalledWith('/events/eid/instances/', { params: { from: 'x' } });
  });

  it('getFormFields() GETs /form-fields/ with event param', async () => {
    await eventsAPI.getFormFields('eid');
    expect(api.get).toHaveBeenCalledWith('/form-fields/', { params: { event: 'eid' } });
  });

  it('createFormField() POSTs /form-fields/', async () => {
    const data = { label: 'X' };
    await eventsAPI.createFormField(data);
    expect(api.post).toHaveBeenCalledWith('/form-fields/', data);
  });

  it('updateFormField() PUTs /form-fields/{id}/', async () => {
    const data = { label: 'Y' };
    await eventsAPI.updateFormField(7, data);
    expect(api.put).toHaveBeenCalledWith('/form-fields/7/', data);
  });

  it('deleteFormField() DELETEs /form-fields/{id}/', async () => {
    await eventsAPI.deleteFormField(7);
    expect(api.delete).toHaveBeenCalledWith('/form-fields/7/');
  });

  it('updateFormFields() POSTs /events/{id}/update_form_fields/', async () => {
    const data = { fields: [] };
    await eventsAPI.updateFormFields('eid', data);
    expect(api.post).toHaveBeenCalledWith('/events/eid/update_form_fields/', data);
  });

  it('requestFeature() POSTs /events/{id}/request_feature/ with data', async () => {
    const data = { reason: 'r' };
    await eventsAPI.requestFeature('eid', data);
    expect(api.post).toHaveBeenCalledWith('/events/eid/request_feature/', data);
  });

  it('requestFeature() POSTs /events/{id}/request_feature/ with empty body when no data', async () => {
    await eventsAPI.requestFeature('eid');
    expect(api.post).toHaveBeenCalledWith('/events/eid/request_feature/', {});
  });
});
