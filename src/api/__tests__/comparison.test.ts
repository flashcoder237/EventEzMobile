/**
 * Smoke tests pour comparisonAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { comparisonAPI } from '../misc';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('comparisonAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('compare() GETs /events/compare/ with comma-joined ids', async () => {
    await comparisonAPI.compare(['e1', 'e2', 'e3']);
    expect(api.get).toHaveBeenCalledWith('/events/compare/', { params: { ids: 'e1,e2,e3' } });
  });
});
