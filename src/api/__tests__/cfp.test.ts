/**
 * Smoke tests pour cfpAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { cfpAPI } from '../content';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('cfpAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getAll() GETs /call-for-papers/ with params', async () => {
    await cfpAPI.getAll({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/call-for-papers/', { params: { page: 1 } });
  });

  it('getById() GETs /call-for-papers/{id}/', async () => {
    await cfpAPI.getById('cid');
    expect(api.get).toHaveBeenCalledWith('/call-for-papers/cid/');
  });

  it('submitProposal() POSTs /talk-proposals/', async () => {
    const data = { title: 'Talk', abstract: 'desc' };
    await cfpAPI.submitProposal(data);
    expect(api.post).toHaveBeenCalledWith('/talk-proposals/', data);
  });

  it('getMyProposals() GETs /talk-proposals/my_proposals/', async () => {
    await cfpAPI.getMyProposals();
    expect(api.get).toHaveBeenCalledWith('/talk-proposals/my_proposals/');
  });

  it('getProposal() GETs /talk-proposals/{id}/', async () => {
    await cfpAPI.getProposal('pid');
    expect(api.get).toHaveBeenCalledWith('/talk-proposals/pid/');
  });
});
