/**
 * Smoke tests pour floorPlansAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { floorPlansAPI } from '../misc';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('floorPlansAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getByEvent() GETs /floor-plans/by_event/ with event_id param', async () => {
    await floorPlansAPI.getByEvent('eid');
    expect(api.get).toHaveBeenCalledWith('/floor-plans/by_event/', { params: { event_id: 'eid' } });
  });

  it('getById() GETs /floor-plans/{id}/', async () => {
    await floorPlansAPI.getById('fid');
    expect(api.get).toHaveBeenCalledWith('/floor-plans/fid/');
  });
});
