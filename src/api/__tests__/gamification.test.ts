/**
 * Smoke tests pour gamificationAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { gamificationAPI } from '../social';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('gamificationAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getBadges() GETs /gamification/badges/', async () => {
    await gamificationAPI.getBadges();
    expect(api.get).toHaveBeenCalledWith('/gamification/badges/');
  });

  it('getMyBadges() GETs /gamification/user-badges/my_badges/', async () => {
    await gamificationAPI.getMyBadges();
    expect(api.get).toHaveBeenCalledWith('/gamification/user-badges/my_badges/');
  });

  it('getPointsBalance() GETs /gamification/points/balance/', async () => {
    await gamificationAPI.getPointsBalance();
    expect(api.get).toHaveBeenCalledWith('/gamification/points/balance/');
  });

  it('getPointsSummary() GETs /gamification/points/summary/', async () => {
    await gamificationAPI.getPointsSummary();
    expect(api.get).toHaveBeenCalledWith('/gamification/points/summary/');
  });

  it('getLeaderboard() GETs /gamification/leaderboard/ with params', async () => {
    await gamificationAPI.getLeaderboard({ event: 'eid', period: 'week' });
    expect(api.get).toHaveBeenCalledWith('/gamification/leaderboard/', {
      params: { event: 'eid', period: 'week' },
    });
  });

  it('getMyRank() GETs /gamification/leaderboard/my_rank/ with params', async () => {
    await gamificationAPI.getMyRank({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/gamification/leaderboard/my_rank/', {
      params: { event: 'eid' },
    });
  });

  it('getPointsHistory() GETs /gamification/points/', async () => {
    await gamificationAPI.getPointsHistory();
    expect(api.get).toHaveBeenCalledWith('/gamification/points/');
  });
});
