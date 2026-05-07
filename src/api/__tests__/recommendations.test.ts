/**
 * Smoke tests pour recommendationsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { recommendationsAPI } from '../social';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('recommendationsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getRecommendations() GETs /recommendations/ with params', async () => {
    await recommendationsAPI.getRecommendations({ limit: 10, page: 2, page_size: 20 });
    expect(api.get).toHaveBeenCalledWith('/recommendations/', {
      params: { limit: 10, page: 2, page_size: 20 },
    });
  });

  it('recordInteraction() POSTs /recommendations/record_interaction/', async () => {
    const data = { event: 'eid', interaction_type: 'view' };
    await recommendationsAPI.recordInteraction(data);
    expect(api.post).toHaveBeenCalledWith('/recommendations/record_interaction/', data);
  });

  it('getSimilar() GETs /recommendations/{eventId}/similar/ with params', async () => {
    await recommendationsAPI.getSimilar('eid', { limit: 5 });
    expect(api.get).toHaveBeenCalledWith('/recommendations/eid/similar/', {
      params: { limit: 5 },
    });
  });
});
