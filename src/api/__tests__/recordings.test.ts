/**
 * Smoke tests pour recordingsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { recordingsAPI } from '../content';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('recordingsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getByEvent() GETs /recordings/by_event/ with event_id', async () => {
    await recordingsAPI.getByEvent('eid');
    expect(api.get).toHaveBeenCalledWith('/recordings/by_event/', {
      params: { event_id: 'eid' },
    });
  });

  it('getById() GETs /recordings/{id}/', async () => {
    await recordingsAPI.getById('rid');
    expect(api.get).toHaveBeenCalledWith('/recordings/rid/');
  });

  it('incrementView() POSTs /recordings/{id}/increment_view/', async () => {
    await recordingsAPI.incrementView('rid');
    expect(api.post).toHaveBeenCalledWith('/recordings/rid/increment_view/');
  });
});
