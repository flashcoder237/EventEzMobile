/**
 * Smoke tests pour les APIs exposées depuis `src/api/auth.ts`.
 *
 * Couvre `authAPI`, `usersAPI` et `verificationAPI` colocalisées, afin que le
 * mutation testing (qui exécute uniquement `auth.test.ts` pour `auth.ts`)
 * détecte les altérations de verbe HTTP ou d'URL sur n'importe laquelle de
 * ces sous-APIs.
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

import { authAPI, usersAPI, verificationAPI } from '../auth';
import { fetchUpload } from '../config';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

const fetchUploadMock = fetchUpload as jest.Mock;

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

describe('authAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('login() POSTs /token/ with credentials', async () => {
    await authAPI.login('a@b.com', 'pwd');
    expect(api.post).toHaveBeenCalledWith('/token/', { email: 'a@b.com', password: 'pwd' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('register() POSTs /register/', async () => {
    const data = {
      email: 'a@b.com',
      username: 'u',
      password: 'pwd',
      confirm_password: 'pwd',
      first_name: 'X',
      last_name: 'Y',
    };
    await authAPI.register(data);
    expect(api.post).toHaveBeenCalledWith('/register/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('registerOrganizer() POSTs /register/organizer/', async () => {
    const data = { foo: 'bar' };
    await authAPI.registerOrganizer(data);
    expect(api.post).toHaveBeenCalledWith('/register/organizer/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('guestRegister() POSTs /auth/guest-register/', async () => {
    const data = { email: 'g@b.com', first_name: 'G' };
    await authAPI.guestRegister(data);
    expect(api.post).toHaveBeenCalledWith('/auth/guest-register/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('upgradeGuest() POSTs /auth/upgrade-guest/', async () => {
    const data = { password: 'pwd', confirm_password: 'pwd' };
    await authAPI.upgradeGuest(data);
    expect(api.post).toHaveBeenCalledWith('/auth/upgrade-guest/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('refreshToken() POSTs /token/refresh/', async () => {
    await authAPI.refreshToken('rtok');
    expect(api.post).toHaveBeenCalledWith('/token/refresh/', { refresh: 'rtok' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('requestPasswordReset() POSTs /password-reset/request/', async () => {
    await authAPI.requestPasswordReset('a@b.com');
    expect(api.post).toHaveBeenCalledWith('/password-reset/request/', { email: 'a@b.com' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('validateResetToken() GETs /password-reset/validate/{token}/', async () => {
    await authAPI.validateResetToken('tok123');
    expect(api.get).toHaveBeenCalledWith('/password-reset/validate/tok123/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('resetPassword() POSTs /password-reset/confirm/', async () => {
    await authAPI.resetPassword('tok', 'newpwd');
    expect(api.post).toHaveBeenCalledWith('/password-reset/confirm/', {
      token: 'tok',
      password: 'newpwd',
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('logout() POSTs /logout/ with refresh token', async () => {
    await authAPI.logout();
    expect(api.post).toHaveBeenCalledWith('/logout/', { refresh: 'mock-refresh-token' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('googleSignIn() POSTs /social-auth/google/', async () => {
    await authAPI.googleSignIn('gtok');
    expect(api.post).toHaveBeenCalledWith('/social-auth/google/', { token: 'gtok' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('appleSignIn() POSTs /social-auth/apple/', async () => {
    const data = { identity_token: 'tok' };
    await authAPI.appleSignIn(data);
    expect(api.post).toHaveBeenCalledWith('/social-auth/apple/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('verifyEmail() GETs /verify-email/{token}/', async () => {
    await authAPI.verifyEmail('vtok');
    expect(api.get).toHaveBeenCalledWith('/verify-email/vtok/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('resendVerificationEmail() POSTs /verify-email/resend/', async () => {
    await authAPI.resendVerificationEmail('a@b.com');
    expect(api.post).toHaveBeenCalledWith('/verify-email/resend/', { email: 'a@b.com' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('phoneSendOTP() POSTs /auth/phone/send-otp/', async () => {
    await authAPI.phoneSendOTP('+237600000000');
    expect(api.post).toHaveBeenCalledWith('/auth/phone/send-otp/', {
      phone_number: '+237600000000',
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('phoneVerifyOTP() POSTs /auth/phone/verify/', async () => {
    await authAPI.phoneVerifyOTP('+237600000000', '123456');
    expect(api.post).toHaveBeenCalledWith('/auth/phone/verify/', {
      phone_number: '+237600000000',
      code: '123456',
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('phoneSendAccountVerification() POSTs /auth/phone/send-account-verification/', async () => {
    await authAPI.phoneSendAccountVerification('+237600000000');
    expect(api.post).toHaveBeenCalledWith('/auth/phone/send-account-verification/', {
      phone_number: '+237600000000',
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('phoneVerifyAccount() POSTs /auth/phone/verify-account/', async () => {
    await authAPI.phoneVerifyAccount('+237600000000', '123456');
    expect(api.post).toHaveBeenCalledWith('/auth/phone/verify-account/', {
      phone_number: '+237600000000',
      code: '123456',
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });
});

describe('usersAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getUsers() GETs /users/ with params', async () => {
    await usersAPI.getUsers({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/users/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getUser() GETs /users/{id}/', async () => {
    await usersAPI.getUser('abc');
    expect(api.get).toHaveBeenCalledWith('/users/abc/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getCurrentUser() GETs /users/me/', async () => {
    await usersAPI.getCurrentUser();
    expect(api.get).toHaveBeenCalledWith('/users/me/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('updateCurrentUser() PATCHes /users/me/', async () => {
    const data = { first_name: 'X' };
    await usersAPI.updateCurrentUser(data);
    expect(api.patch).toHaveBeenCalledWith('/users/me/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expectOnly(api, 'patch');
  });

  it('updateProfile() PUTs /users/update_profile/', async () => {
    const data = { first_name: 'Y' };
    await usersAPI.updateProfile(data);
    expect(api.put).toHaveBeenCalledWith('/users/update_profile/', data);
    expect(api.put).toHaveBeenCalledTimes(1);
    expectOnly(api, 'put');
  });

  it('updateProfileImage() calls fetchUpload PATCH /users/me/upload_profile_image/', async () => {
    const fd = new FormData();
    await usersAPI.updateProfileImage(fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('PATCH', '/users/me/upload_profile_image/', fd);
    expect(fetchUploadMock).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getUserSettings() GETs /users/me/settings/', async () => {
    await usersAPI.getUserSettings();
    expect(api.get).toHaveBeenCalledWith('/users/me/settings/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('blockUser() POSTs /users/{id}/block/', async () => {
    await usersAPI.blockUser(42);
    expect(api.post).toHaveBeenCalledWith('/users/42/block/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('unblockUser() POSTs /users/{id}/unblock/', async () => {
    await usersAPI.unblockUser('xyz');
    expect(api.post).toHaveBeenCalledWith('/users/xyz/unblock/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('listBlocked() GETs /users/blocked/', async () => {
    await usersAPI.listBlocked();
    expect(api.get).toHaveBeenCalledWith('/users/blocked/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('updateUserSettings() PUTs /users/me/settings/', async () => {
    const settings = { theme: 'dark' };
    await usersAPI.updateUserSettings(settings);
    expect(api.put).toHaveBeenCalledWith('/users/me/settings/', settings);
    expect(api.put).toHaveBeenCalledTimes(1);
    expectOnly(api, 'put');
  });

  it('deleteAccount() POSTs /users/me/delete_account/', async () => {
    const data = { password: 'pwd', reason: 'r' };
    await usersAPI.deleteAccount(data);
    expect(api.post).toHaveBeenCalledWith('/users/me/delete_account/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('getOrganizers() GETs /users/organizers/ with params', async () => {
    await usersAPI.getOrganizers({ q: 'x' });
    expect(api.get).toHaveBeenCalledWith('/users/organizers/', { params: { q: 'x' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('becomeOrganizer() POSTs /users/become_organizer/ with data', async () => {
    const data = { organizer_type: 'individual' as const };
    await usersAPI.becomeOrganizer(data);
    expect(api.post).toHaveBeenCalledWith('/users/become_organizer/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('becomeOrganizer() POSTs /users/become_organizer/ with empty body when no data', async () => {
    await usersAPI.becomeOrganizer();
    expect(api.post).toHaveBeenCalledWith('/users/become_organizer/', {});
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('changePassword() POSTs /users/change_password/', async () => {
    const data = { current_password: 'a', new_password: 'b' };
    await usersAPI.changePassword(data);
    expect(api.post).toHaveBeenCalledWith('/users/change_password/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('updateNotificationSettings() PATCHes /users/notification_settings/', async () => {
    const data = { email: true };
    await usersAPI.updateNotificationSettings(data);
    expect(api.patch).toHaveBeenCalledWith('/users/notification_settings/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expectOnly(api, 'patch');
  });

  it('getUserAnalytics() GETs /users/analytics/', async () => {
    await usersAPI.getUserAnalytics();
    expect(api.get).toHaveBeenCalledWith('/users/analytics/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('updateUser() PATCHes /users/{id}/', async () => {
    const data = { role: 'organizer' };
    await usersAPI.updateUser('uid', data);
    expect(api.patch).toHaveBeenCalledWith('/users/uid/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expectOnly(api, 'patch');
  });

  it('deleteUser() DELETEs /users/{id}/', async () => {
    await usersAPI.deleteUser('uid');
    expect(api.delete).toHaveBeenCalledWith('/users/uid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });

  it('createUser() POSTs /users/create_user/', async () => {
    const data = { email: 'a@b.com' };
    await usersAPI.createUser(data);
    expect(api.post).toHaveBeenCalledWith('/users/create_user/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('getPendingVerification() GETs /users/pending_verification/', async () => {
    await usersAPI.getPendingVerification();
    expect(api.get).toHaveBeenCalledWith('/users/pending_verification/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('verifyProfile() POSTs /users/{id}/verify_profile/ with data', async () => {
    const data = { verified_status: true, note: 'ok' };
    await usersAPI.verifyProfile('uid', data);
    expect(api.post).toHaveBeenCalledWith('/users/uid/verify_profile/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('verifyProfile() POSTs /users/{id}/verify_profile/ with empty body when no data', async () => {
    await usersAPI.verifyProfile('uid');
    expect(api.post).toHaveBeenCalledWith('/users/uid/verify_profile/', {});
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('rejectProfile() POSTs /users/{id}/reject_profile/', async () => {
    const data = { reason: 'spam' };
    await usersAPI.rejectProfile('uid', data);
    expect(api.post).toHaveBeenCalledWith('/users/uid/reject_profile/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('followUser() POSTs /users/{id}/follow/ with preferences', async () => {
    const prefs = { notification_preference: 'all' as const };
    await usersAPI.followUser(7, prefs);
    expect(api.post).toHaveBeenCalledWith('/users/7/follow/', prefs);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('followUser() POSTs /users/{id}/follow/ with empty body when no prefs', async () => {
    await usersAPI.followUser(7);
    expect(api.post).toHaveBeenCalledWith('/users/7/follow/', {});
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('unfollowUser() POSTs /users/{id}/unfollow/', async () => {
    await usersAPI.unfollowUser(7);
    expect(api.post).toHaveBeenCalledWith('/users/7/unfollow/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('isFollowingUser() GETs /users/{id}/is_following/', async () => {
    await usersAPI.isFollowingUser(7);
    expect(api.get).toHaveBeenCalledWith('/users/7/is_following/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getUserFollowersCount() GETs /users/{id}/followers_count/', async () => {
    await usersAPI.getUserFollowersCount(7);
    expect(api.get).toHaveBeenCalledWith('/users/7/followers_count/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('updateUserFollowPreferences() PATCHes /users/{id}/update_follow_preferences/', async () => {
    const prefs = { notify_email: true };
    await usersAPI.updateUserFollowPreferences(7, prefs);
    expect(api.patch).toHaveBeenCalledWith('/users/7/update_follow_preferences/', prefs);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expectOnly(api, 'patch');
  });

  it('getFollowingUsers() GETs /users/following_users/', async () => {
    await usersAPI.getFollowingUsers();
    expect(api.get).toHaveBeenCalledWith('/users/following_users/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });
});

describe('verificationAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('submit() calls fetchUpload POST /verifications/submit/', async () => {
    const fd = new FormData();
    await verificationAPI.submit(fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/verifications/submit/', fd);
    expect(fetchUploadMock).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('getMyRequest() GETs /verifications/my_request/', async () => {
    await verificationAPI.getMyRequest();
    expect(api.get).toHaveBeenCalledWith('/verifications/my_request/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getPending() GETs /verifications/pending/', async () => {
    await verificationAPI.getPending();
    expect(api.get).toHaveBeenCalledWith('/verifications/pending/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('approve() POSTs /verifications/{id}/approve/', async () => {
    await verificationAPI.approve(42);
    expect(api.post).toHaveBeenCalledWith('/verifications/42/approve/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('reject() POSTs /verifications/{id}/reject/ with reason', async () => {
    await verificationAPI.reject(42, 'spam');
    expect(api.post).toHaveBeenCalledWith('/verifications/42/reject/', { reason: 'spam' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });
});
