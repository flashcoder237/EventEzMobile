/**
 * Smoke tests pour validationsAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { validationsAPI } from '../feedback';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('validationsAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getValidations() GETs /validations/ with params', async () => {
    await validationsAPI.getValidations({ status: 'pending' });
    expect(api.get).toHaveBeenCalledWith('/validations/', { params: { status: 'pending' } });
  });

  it('getValidation() GETs /validations/{id}/', async () => {
    await validationsAPI.getValidation('vid');
    expect(api.get).toHaveBeenCalledWith('/validations/vid/');
  });

  it('createValidation() POSTs /validations/', async () => {
    const data = { event: 'eid', status: 'approved' };
    await validationsAPI.createValidation(data);
    expect(api.post).toHaveBeenCalledWith('/validations/', data);
  });

  it('updateValidation() PUTs /validations/{id}/', async () => {
    const data = { status: 'rejected' };
    await validationsAPI.updateValidation('vid', data);
    expect(api.put).toHaveBeenCalledWith('/validations/vid/', data);
  });

  it('getEventStats() GETs /validations/event_stats/ with event param', async () => {
    await validationsAPI.getEventStats('eid');
    expect(api.get).toHaveBeenCalledWith('/validations/event_stats/', { params: { event: 'eid' } });
  });
});
