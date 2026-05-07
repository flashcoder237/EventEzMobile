/**
 * Smoke tests pour sponsorsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { sponsorsAPI } from '../content';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('sponsorsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getPackages() GETs /sponsor-packages/ with params', async () => {
    await sponsorsAPI.getPackages({ event: 'eid' });
    expect(api.get).toHaveBeenCalledWith('/sponsor-packages/', { params: { event: 'eid' } });
  });

  it('getSponsors() GETs /event-sponsors/ with params', async () => {
    await sponsorsAPI.getSponsors({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/event-sponsors/', { params: { page: 1 } });
  });

  it('getSponsor() GETs /event-sponsors/{id}/', async () => {
    await sponsorsAPI.getSponsor('sid');
    expect(api.get).toHaveBeenCalledWith('/event-sponsors/sid/');
  });

  it('getByEvent() GETs /event-sponsors/by-event/ with event_id', async () => {
    await sponsorsAPI.getByEvent('eid');
    expect(api.get).toHaveBeenCalledWith('/event-sponsors/by-event/', {
      params: { event_id: 'eid' },
    });
  });

  it('trackClick() POSTs /event-sponsors/{id}/track-click/', async () => {
    await sponsorsAPI.trackClick('sid');
    expect(api.post).toHaveBeenCalledWith('/event-sponsors/sid/track-click/');
  });

  it('confirm() POSTs /event-sponsors/{id}/confirm/', async () => {
    await sponsorsAPI.confirm('sid');
    expect(api.post).toHaveBeenCalledWith('/event-sponsors/sid/confirm/');
  });
});
