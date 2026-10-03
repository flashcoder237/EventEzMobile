/**
 * Smoke tests pour les APIs exposées depuis `src/api/social.ts`.
 *
 * Couvre `socialAPI`, `invitationsAPI`, `referralsAPI`, `gamificationAPI`,
 * `recommendationsAPI` et `advertisementsAPI` colocalisées, afin que le
 * mutation testing (qui exécute uniquement `social.test.ts` pour `social.ts`)
 * détecte les altérations de verbe HTTP ou d'URL sur n'importe laquelle de
 * ces sous-APIs.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

jest.mock('../config', () => ({
  ...jest.requireActual('../config'),
  fetchUpload: jest.fn(() => Promise.resolve({ data: {} })),
}));

import {
  socialAPI,
  invitationsAPI,
  referralsAPI,
  gamificationAPI,
  recommendationsAPI,
  advertisementsAPI,
} from '../social';
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

describe('socialAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getFeed() GETs /social/feed/ with params', async () => {
    await socialAPI.getFeed({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/social/feed/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getMyFeed() GETs /social/feed/my_feed/', async () => {
    await socialAPI.getMyFeed();
    expect(api.get).toHaveBeenCalledWith('/social/feed/my_feed/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getEventFeed() GETs /social/feed/event_feed/ with event_id param', async () => {
    await socialAPI.getEventFeed('eid');
    expect(api.get).toHaveBeenCalledWith('/social/feed/event_feed/', {
      params: { event_id: 'eid' },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getConnections() GETs /social/connections/ with params', async () => {
    await socialAPI.getConnections({ status: 'pending' });
    expect(api.get).toHaveBeenCalledWith('/social/connections/', {
      params: { status: 'pending' },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getMyConnections() GETs /social/connections/my_connections/', async () => {
    await socialAPI.getMyConnections();
    expect(api.get).toHaveBeenCalledWith('/social/connections/my_connections/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getEventAttendees() GETs /social/connections/event_attendees/ with event_id param', async () => {
    await socialAPI.getEventAttendees('eid');
    expect(api.get).toHaveBeenCalledWith('/social/connections/event_attendees/', {
      params: { event_id: 'eid' },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('sendConnectionRequest() POSTs /social/connections/', async () => {
    const data = { receiver: 'u1', event: 'eid', message: 'hi' };
    await socialAPI.sendConnectionRequest(data);
    expect(api.post).toHaveBeenCalledWith('/social/connections/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('acceptConnection() POSTs /social/connections/{id}/accept/', async () => {
    await socialAPI.acceptConnection('cid');
    expect(api.post).toHaveBeenCalledWith('/social/connections/cid/accept/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('declineConnection() POSTs /social/connections/{id}/decline/', async () => {
    await socialAPI.declineConnection('cid');
    expect(api.post).toHaveBeenCalledWith('/social/connections/cid/decline/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('cancelConnection() POSTs /social/connections/{id}/cancel/', async () => {
    await socialAPI.cancelConnection('cid');
    expect(api.post).toHaveBeenCalledWith('/social/connections/cid/cancel/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });
});

describe('invitationsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getAll() GETs /invitations/ with params', async () => {
    await invitationsAPI.getAll({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/invitations/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getById() GETs /invitations/{id}/', async () => {
    await invitationsAPI.getById('inv1');
    expect(api.get).toHaveBeenCalledWith('/invitations/inv1/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('create() POSTs /invitations/', async () => {
    const data = { event: 'eid', invitee_email: 'a@b.com', invitee_name: 'A', message: 'hi' };
    await invitationsAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/invitations/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('bulkInvite() POSTs /invitations/ (backend create() gère le bulk)', async () => {
    const data = { event: 'eid', invitees: [{ email: 'a@b.com', name: 'A' }], message: 'hi' };
    await invitationsAPI.bulkInvite(data);
    expect(api.post).toHaveBeenCalledWith('/invitations/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('accept() POSTs /invitations/{id}/accept/', async () => {
    await invitationsAPI.accept('inv1');
    expect(api.post).toHaveBeenCalledWith('/invitations/inv1/accept/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('decline() POSTs /invitations/{id}/decline/', async () => {
    await invitationsAPI.decline('inv1');
    expect(api.post).toHaveBeenCalledWith('/invitations/inv1/decline/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('cancel() DELETEs /invitations/{id}/ (backend implémente cancel via destroy())', async () => {
    await invitationsAPI.cancel('inv1');
    expect(api.delete).toHaveBeenCalledWith('/invitations/inv1/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });

  it('getMyInvitations() GETs /invitations/my_invitations/', async () => {
    await invitationsAPI.getMyInvitations();
    expect(api.get).toHaveBeenCalledWith('/invitations/my_invitations/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('respondByToken() chaîne by_token → accept', async () => {
    api.get.mockResolvedValueOnce({ data: { id: 'inv1' } });
    await invitationsAPI.respondByToken('tok123', 'accept');
    expect(api.get).toHaveBeenCalledWith('/invitations/by_token/', {
      params: { token: 'tok123' },
    });
    expect(api.post).toHaveBeenCalledWith('/invitations/inv1/accept/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('respondByToken() chaîne by_token → decline', async () => {
    api.get.mockResolvedValueOnce({ data: { id: 'inv2' } });
    await invitationsAPI.respondByToken('tok456', 'decline');
    expect(api.get).toHaveBeenCalledWith('/invitations/by_token/', {
      params: { token: 'tok456' },
    });
    expect(api.post).toHaveBeenCalledWith('/invitations/inv2/decline/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});

describe('referralsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getCodes() GETs /referrals/codes/ with params', async () => {
    await referralsAPI.getCodes({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/referrals/codes/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getCode() GETs /referrals/codes/{id}/', async () => {
    await referralsAPI.getCode('cid');
    expect(api.get).toHaveBeenCalledWith('/referrals/codes/cid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('createCode() POSTs /referrals/codes/', async () => {
    const data = { code_type: 'general', commission_percentage: 10 };
    await referralsAPI.createCode(data);
    expect(api.post).toHaveBeenCalledWith('/referrals/codes/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('updateCode() PATCHes /referrals/codes/{id}/', async () => {
    const data = { commission_percentage: 15 };
    await referralsAPI.updateCode('cid', data);
    expect(api.patch).toHaveBeenCalledWith('/referrals/codes/cid/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expectOnly(api, 'patch');
  });

  it('deleteCode() DELETEs /referrals/codes/{id}/', async () => {
    await referralsAPI.deleteCode('cid');
    expect(api.delete).toHaveBeenCalledWith('/referrals/codes/cid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });

  it('getStats() GETs /referrals/codes/{id}/stats/', async () => {
    await referralsAPI.getStats('cid');
    expect(api.get).toHaveBeenCalledWith('/referrals/codes/cid/stats/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('trackClick() GETs /referrals/track/?code= (backend @api_view GET)', async () => {
    await referralsAPI.trackClick('ABC123');
    expect(api.get).toHaveBeenCalledWith('/referrals/track/', { params: { code: 'ABC123' } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });
});

describe('gamificationAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getBadges() GETs /gamification/badges/', async () => {
    await gamificationAPI.getBadges();
    expect(api.get).toHaveBeenCalledWith('/gamification/badges/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getMyBadges() GETs /gamification/user-badges/my_badges/', async () => {
    await gamificationAPI.getMyBadges();
    expect(api.get).toHaveBeenCalledWith('/gamification/user-badges/my_badges/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getPointsBalance() GETs /gamification/points/balance/', async () => {
    await gamificationAPI.getPointsBalance();
    expect(api.get).toHaveBeenCalledWith('/gamification/points/balance/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getPointsSummary() GETs /gamification/points/summary/', async () => {
    await gamificationAPI.getPointsSummary();
    expect(api.get).toHaveBeenCalledWith('/gamification/points/summary/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getLeaderboard() GETs /gamification/leaderboard/ with params', async () => {
    await gamificationAPI.getLeaderboard({ event: 'eid', period: 'week' });
    expect(api.get).toHaveBeenCalledWith('/gamification/leaderboard/', {
      params: { event: 'eid', period: 'week' },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getMyRank() GETs /gamification/leaderboard/my_rank/ with params', async () => {
    await gamificationAPI.getMyRank({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/gamification/leaderboard/my_rank/', {
      params: { event: 'eid' },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('getPointsHistory() GETs /gamification/points/', async () => {
    await gamificationAPI.getPointsHistory();
    expect(api.get).toHaveBeenCalledWith('/gamification/points/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });
});

describe('recommendationsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getRecommendations() GETs /recommendations/ with params', async () => {
    await recommendationsAPI.getRecommendations({ limit: 10, page: 2, page_size: 20 });
    expect(api.get).toHaveBeenCalledWith('/recommendations/', {
      params: { limit: 10, page: 2, page_size: 20 },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('recordInteraction() POSTs /recommendations/record_interaction/', async () => {
    const data = { event_id: 'eid', interaction_type: 'view' as const };
    await recommendationsAPI.recordInteraction(data);
    expect(api.post).toHaveBeenCalledWith('/recommendations/record_interaction/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('getSimilar() GETs /recommendations/{eventId}/similar/ with params', async () => {
    await recommendationsAPI.getSimilar('eid', { limit: 5 });
    expect(api.get).toHaveBeenCalledWith('/recommendations/eid/similar/', {
      params: { limit: 5 },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });
});

describe('advertisementsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => {
    resetMockApi();
    fetchUploadMock.mockClear();
  });

  it('getNearby() GETs /advertisements/nearby/ with params', async () => {
    await advertisementsAPI.getNearby({ country: 'CM', city: 'Douala' });
    expect(api.get).toHaveBeenCalledWith('/advertisements/nearby/', {
      params: { country: 'CM', city: 'Douala' },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('recordView() POSTs /advertisements/{id}/view/', async () => {
    await advertisementsAPI.recordView('aid');
    expect(api.post).toHaveBeenCalledWith('/advertisements/aid/view/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('recordClick() POSTs /advertisements/{id}/click/', async () => {
    await advertisementsAPI.recordClick('aid');
    expect(api.post).toHaveBeenCalledWith('/advertisements/aid/click/');
    expect(api.post).toHaveBeenCalledTimes(1);
    expectOnly(api, 'post');
  });

  it('list() GETs /advertisements/ with params', async () => {
    await advertisementsAPI.list({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/advertisements/', { params: { page: 1 } });
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  it('get() GETs /advertisements/{id}/', async () => {
    await advertisementsAPI.get('aid');
    expect(api.get).toHaveBeenCalledWith('/advertisements/aid/');
    expect(api.get).toHaveBeenCalledTimes(1);
    expectOnly(api, 'get');
  });

  // Les uploads multipart passent par fetchUpload (fetch natif), jamais par axios :
  // le FormData polyfillé de React Native est mal sérialisé par axios, et un
  // Content-Type forcé prive la requête de son boundary → ERR_NETWORK.
  it('create() routes FormData through fetchUpload, never axios', async () => {
    const fd = new FormData();
    await advertisementsAPI.create(fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('POST', '/advertisements/', fd);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('create() POSTs a plain object through axios, without multipart header', async () => {
    const data = { title: 'Ad' };
    await advertisementsAPI.create(data);
    expect(api.post).toHaveBeenCalledWith('/advertisements/', data);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(fetchUploadMock).not.toHaveBeenCalled();
    expectOnly(api, 'post');
  });

  it('update() routes FormData through fetchUpload, never axios', async () => {
    const fd = new FormData();
    await advertisementsAPI.update('aid', fd);
    expect(fetchUploadMock).toHaveBeenCalledWith('PATCH', '/advertisements/aid/', fd);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('update() PATCHes a plain object through axios', async () => {
    const data = { title: 'Ad' };
    await advertisementsAPI.update('aid', data);
    expect(api.patch).toHaveBeenCalledWith('/advertisements/aid/', data);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(fetchUploadMock).not.toHaveBeenCalled();
    expectOnly(api, 'patch');
  });

  it('delete() DELETEs /advertisements/{id}/', async () => {
    await advertisementsAPI.delete('aid');
    expect(api.delete).toHaveBeenCalledWith('/advertisements/aid/');
    expect(api.delete).toHaveBeenCalledTimes(1);
    expectOnly(api, 'delete');
  });
});
