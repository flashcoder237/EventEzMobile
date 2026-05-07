/**
 * Smoke tests pour auditAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { auditAPI } from '../admin';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('auditAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getLogs() GETs /audit/logs/ with params', async () => {
    await auditAPI.getLogs({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/audit/logs/', { params: { page: 1 } });
  });

  it('getLog() GETs /audit/logs/{id}/', async () => {
    await auditAPI.getLog('lid');
    expect(api.get).toHaveBeenCalledWith('/audit/logs/lid/');
  });

  it('getStatistics() GETs /audit/logs/statistics/ with params', async () => {
    await auditAPI.getStatistics({ start: '2026-01-01' });
    expect(api.get).toHaveBeenCalledWith('/audit/logs/statistics/', {
      params: { start: '2026-01-01' },
    });
  });

  it('getRecentLogs() GETs /audit/logs/recent/ with limit param', async () => {
    await auditAPI.getRecentLogs({ limit: 20 });
    expect(api.get).toHaveBeenCalledWith('/audit/logs/recent/', { params: { limit: 20 } });
  });
});
