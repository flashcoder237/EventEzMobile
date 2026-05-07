/**
 * Smoke tests pour usersAPI — vérifie URL + verbe HTTP + body shape.
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

import { usersAPI } from '../auth';
import { fetchUpload } from '../config';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

const fetchUploadMock = fetchUpload as jest.Mock;

describe('usersAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getUsers() GETs /users/ with params', async () => {
    await usersAPI.getUsers({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/users/', { params: { page: 1 } });
  });

  it('getUser() GETs /users/{id}/', async () => {
    await usersAPI.getUser('abc');
    expect(api.get).toHaveBeenCalledWith('/users/abc/');
  });

  it('getCurrentUser() GETs /users/me/', async () => {
    await usersAPI.getCurrentUser();
    expect(api.get).toHaveBeenCalledWith('/users/me/');
  });

  it('updateCurrentUser() PATCHes /users/me/', async () => {
    const data = { first_name: 'X' };
    await usersAPI.updateCurrentUser(data);
    expect(api.patch).toHaveBeenCalledWith('/users/me/', data);
  });

  it('updateProfile() PUTs /users/update_profile/', async () => {
    const data = { first_name: 'Y' };
    await usersAPI.updateProfile(data);
    expect(api.put).toHaveBeenCalledWith('/users/update_profile/', data);
  });

  it('updateProfileImage() calls fetchUpload PATCH /users/me/upload_profile_image/', async () => {
    const fd = new FormData();
    await usersAPI.updateProfileImage(fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('PATCH', '/users/me/upload_profile_image/', fd);
  });

  it('getUserSettings() GETs /users/me/settings/', async () => {
    await usersAPI.getUserSettings();
    expect(api.get).toHaveBeenCalledWith('/users/me/settings/');
  });

  it('blockUser() POSTs /users/{id}/block/', async () => {
    await usersAPI.blockUser(42);
    expect(api.post).toHaveBeenCalledWith('/users/42/block/');
  });

  it('unblockUser() POSTs /users/{id}/unblock/', async () => {
    await usersAPI.unblockUser('xyz');
    expect(api.post).toHaveBeenCalledWith('/users/xyz/unblock/');
  });

  it('listBlocked() GETs /users/blocked/', async () => {
    await usersAPI.listBlocked();
    expect(api.get).toHaveBeenCalledWith('/users/blocked/');
  });

  it('updateUserSettings() PUTs /users/me/settings/', async () => {
    const settings = { theme: 'dark' };
    await usersAPI.updateUserSettings(settings);
    expect(api.put).toHaveBeenCalledWith('/users/me/settings/', settings);
  });

  it('deleteAccount() POSTs /users/me/delete_account/', async () => {
    const data = { password: 'pwd', reason: 'r' };
    await usersAPI.deleteAccount(data);
    expect(api.post).toHaveBeenCalledWith('/users/me/delete_account/', data);
  });

  it('getOrganizers() GETs /users/organizers/ with params', async () => {
    await usersAPI.getOrganizers({ q: 'x' });
    expect(api.get).toHaveBeenCalledWith('/users/organizers/', { params: { q: 'x' } });
  });

  it('becomeOrganizer() POSTs /users/become_organizer/ with data', async () => {
    const data = { organizer_type: 'individual' as const };
    await usersAPI.becomeOrganizer(data);
    expect(api.post).toHaveBeenCalledWith('/users/become_organizer/', data);
  });

  it('becomeOrganizer() POSTs /users/become_organizer/ with empty body when no data', async () => {
    await usersAPI.becomeOrganizer();
    expect(api.post).toHaveBeenCalledWith('/users/become_organizer/', {});
  });

  it('changePassword() POSTs /users/change_password/', async () => {
    const data = { current_password: 'a', new_password: 'b' };
    await usersAPI.changePassword(data);
    expect(api.post).toHaveBeenCalledWith('/users/change_password/', data);
  });

  it('updateNotificationSettings() PATCHes /users/notification_settings/', async () => {
    const data = { email: true };
    await usersAPI.updateNotificationSettings(data);
    expect(api.patch).toHaveBeenCalledWith('/users/notification_settings/', data);
  });

  it('getUserAnalytics() GETs /users/analytics/', async () => {
    await usersAPI.getUserAnalytics();
    expect(api.get).toHaveBeenCalledWith('/users/analytics/');
  });

  it('updateUser() PATCHes /users/{id}/', async () => {
    const data = { role: 'organizer' };
    await usersAPI.updateUser('uid', data);
    expect(api.patch).toHaveBeenCalledWith('/users/uid/', data);
  });

  it('deleteUser() DELETEs /users/{id}/', async () => {
    await usersAPI.deleteUser('uid');
    expect(api.delete).toHaveBeenCalledWith('/users/uid/');
  });

  it('createUser() POSTs /users/create_user/', async () => {
    const data = { email: 'a@b.com' };
    await usersAPI.createUser(data);
    expect(api.post).toHaveBeenCalledWith('/users/create_user/', data);
  });

  it('getPendingVerification() GETs /users/pending_verification/', async () => {
    await usersAPI.getPendingVerification();
    expect(api.get).toHaveBeenCalledWith('/users/pending_verification/');
  });

  it('verifyProfile() POSTs /users/{id}/verify_profile/ with data', async () => {
    const data = { verified_status: true, note: 'ok' };
    await usersAPI.verifyProfile('uid', data);
    expect(api.post).toHaveBeenCalledWith('/users/uid/verify_profile/', data);
  });

  it('verifyProfile() POSTs /users/{id}/verify_profile/ with empty body when no data', async () => {
    await usersAPI.verifyProfile('uid');
    expect(api.post).toHaveBeenCalledWith('/users/uid/verify_profile/', {});
  });

  it('rejectProfile() POSTs /users/{id}/reject_profile/', async () => {
    const data = { reason: 'spam' };
    await usersAPI.rejectProfile('uid', data);
    expect(api.post).toHaveBeenCalledWith('/users/uid/reject_profile/', data);
  });

  it('followUser() POSTs /users/{id}/follow/ with preferences', async () => {
    const prefs = { notification_preference: 'all' as const };
    await usersAPI.followUser(7, prefs);
    expect(api.post).toHaveBeenCalledWith('/users/7/follow/', prefs);
  });

  it('followUser() POSTs /users/{id}/follow/ with empty body when no prefs', async () => {
    await usersAPI.followUser(7);
    expect(api.post).toHaveBeenCalledWith('/users/7/follow/', {});
  });

  it('unfollowUser() POSTs /users/{id}/unfollow/', async () => {
    await usersAPI.unfollowUser(7);
    expect(api.post).toHaveBeenCalledWith('/users/7/unfollow/');
  });

  it('isFollowingUser() GETs /users/{id}/is_following/', async () => {
    await usersAPI.isFollowingUser(7);
    expect(api.get).toHaveBeenCalledWith('/users/7/is_following/');
  });

  it('getUserFollowersCount() GETs /users/{id}/followers_count/', async () => {
    await usersAPI.getUserFollowersCount(7);
    expect(api.get).toHaveBeenCalledWith('/users/7/followers_count/');
  });

  it('updateUserFollowPreferences() PATCHes /users/{id}/update_follow_preferences/', async () => {
    const prefs = { notify_email: true };
    await usersAPI.updateUserFollowPreferences(7, prefs);
    expect(api.patch).toHaveBeenCalledWith('/users/7/update_follow_preferences/', prefs);
  });

  it('getFollowingUsers() GETs /users/following_users/', async () => {
    await usersAPI.getFollowingUsers();
    expect(api.get).toHaveBeenCalledWith('/users/following_users/');
  });
});
