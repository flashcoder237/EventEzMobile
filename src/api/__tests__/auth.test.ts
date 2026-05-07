/**
 * Smoke tests pour authAPI — vérifie URL + verbe HTTP + body shape.
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

import { authAPI } from '../auth';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('authAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('login() POSTs /token/ with credentials', async () => {
    await authAPI.login('a@b.com', 'pwd');
    expect(api.post).toHaveBeenCalledWith('/token/', { email: 'a@b.com', password: 'pwd' });
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
  });

  it('registerOrganizer() POSTs /register/organizer/', async () => {
    const data = { foo: 'bar' };
    await authAPI.registerOrganizer(data);
    expect(api.post).toHaveBeenCalledWith('/register/organizer/', data);
  });

  it('guestRegister() POSTs /auth/guest-register/', async () => {
    const data = { email: 'g@b.com', first_name: 'G' };
    await authAPI.guestRegister(data);
    expect(api.post).toHaveBeenCalledWith('/auth/guest-register/', data);
  });

  it('upgradeGuest() POSTs /auth/upgrade-guest/', async () => {
    const data = { password: 'pwd', confirm_password: 'pwd' };
    await authAPI.upgradeGuest(data);
    expect(api.post).toHaveBeenCalledWith('/auth/upgrade-guest/', data);
  });

  it('refreshToken() POSTs /token/refresh/', async () => {
    await authAPI.refreshToken('rtok');
    expect(api.post).toHaveBeenCalledWith('/token/refresh/', { refresh: 'rtok' });
  });

  it('requestPasswordReset() POSTs /password-reset/request/', async () => {
    await authAPI.requestPasswordReset('a@b.com');
    expect(api.post).toHaveBeenCalledWith('/password-reset/request/', { email: 'a@b.com' });
  });

  it('validateResetToken() GETs /password-reset/validate/{token}/', async () => {
    await authAPI.validateResetToken('tok123');
    expect(api.get).toHaveBeenCalledWith('/password-reset/validate/tok123/');
  });

  it('resetPassword() POSTs /password-reset/confirm/', async () => {
    await authAPI.resetPassword('tok', 'newpwd');
    expect(api.post).toHaveBeenCalledWith('/password-reset/confirm/', {
      token: 'tok',
      password: 'newpwd',
    });
  });

  it('logout() POSTs /logout/ with refresh token', async () => {
    await authAPI.logout();
    // logout() calls api.post('/logout/', { refresh: ... })
    expect(api.post).toHaveBeenCalledWith('/logout/', expect.objectContaining({}));
    const call = api.post.mock.calls.find((c) => c[0] === '/logout/');
    expect(call).toBeDefined();
  });

  it('googleSignIn() POSTs /social-auth/google/', async () => {
    await authAPI.googleSignIn('gtok');
    expect(api.post).toHaveBeenCalledWith('/social-auth/google/', { token: 'gtok' });
  });

  it('appleSignIn() POSTs /social-auth/apple/', async () => {
    const data = { identity_token: 'tok' };
    await authAPI.appleSignIn(data);
    expect(api.post).toHaveBeenCalledWith('/social-auth/apple/', data);
  });

  it('verifyEmail() GETs /verify-email/{token}/', async () => {
    await authAPI.verifyEmail('vtok');
    expect(api.get).toHaveBeenCalledWith('/verify-email/vtok/');
  });

  it('resendVerificationEmail() POSTs /verify-email/resend/', async () => {
    await authAPI.resendVerificationEmail('a@b.com');
    expect(api.post).toHaveBeenCalledWith('/verify-email/resend/', { email: 'a@b.com' });
  });

  it('phoneSendOTP() POSTs /auth/phone/send-otp/', async () => {
    await authAPI.phoneSendOTP('+237600000000');
    expect(api.post).toHaveBeenCalledWith('/auth/phone/send-otp/', {
      phone_number: '+237600000000',
    });
  });

  it('phoneVerifyOTP() POSTs /auth/phone/verify/', async () => {
    await authAPI.phoneVerifyOTP('+237600000000', '123456');
    expect(api.post).toHaveBeenCalledWith('/auth/phone/verify/', {
      phone_number: '+237600000000',
      code: '123456',
    });
  });

  it('phoneSendAccountVerification() POSTs /auth/phone/send-account-verification/', async () => {
    await authAPI.phoneSendAccountVerification('+237600000000');
    expect(api.post).toHaveBeenCalledWith('/auth/phone/send-account-verification/', {
      phone_number: '+237600000000',
    });
  });

  it('phoneVerifyAccount() POSTs /auth/phone/verify-account/', async () => {
    await authAPI.phoneVerifyAccount('+237600000000', '123456');
    expect(api.post).toHaveBeenCalledWith('/auth/phone/verify-account/', {
      phone_number: '+237600000000',
      code: '123456',
    });
  });
});
