/**
 * Smoke tests pour aiAssistAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { aiAssistAPI } from '../misc';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('aiAssistAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('generate() POSTs /ai-assist/generate/', async () => {
    await aiAssistAPI.generate('prompt text', 'sess1');
    expect(api.post).toHaveBeenCalledWith('/ai-assist/generate/', {
      prompt: 'prompt text',
      session_id: 'sess1',
    });
  });

  it('description() POSTs /ai-assist/description/', async () => {
    await aiAssistAPI.description('Title', 'kw', 'billetterie', 'cat', 'sess1');
    expect(api.post).toHaveBeenCalledWith('/ai-assist/description/', {
      title: 'Title',
      keywords: 'kw',
      event_type: 'billetterie',
      category: 'cat',
      session_id: 'sess1',
    });
  });

  it('suggestCategory() POSTs /ai-assist/suggest-category/', async () => {
    const cats = [{ id: 1 }];
    const tags = [{ id: 2 }];
    await aiAssistAPI.suggestCategory('T', 'D', cats, tags, 'sess1');
    expect(api.post).toHaveBeenCalledWith('/ai-assist/suggest-category/', {
      title: 'T',
      description: 'D',
      categories: cats,
      tags: tags,
      session_id: 'sess1',
    });
  });

  it('optimizeTitle() POSTs /ai-assist/optimize-title/', async () => {
    await aiAssistAPI.optimizeTitle('T', 'billetterie', 'cat', 'sess1');
    expect(api.post).toHaveBeenCalledWith('/ai-assist/optimize-title/', {
      title: 'T',
      event_type: 'billetterie',
      category: 'cat',
      session_id: 'sess1',
    });
  });

  it('seo() POSTs /ai-assist/seo/', async () => {
    await aiAssistAPI.seo('T', 'D', 'cat', 'Douala', 'sess1');
    expect(api.post).toHaveBeenCalledWith('/ai-assist/seo/', {
      title: 'T',
      description: 'D',
      category: 'cat',
      location: 'Douala',
      session_id: 'sess1',
    });
  });

  it('pricing() POSTs /ai-assist/pricing/', async () => {
    await aiAssistAPI.pricing('billetterie', 'cat', 'Douala', '100', 'desc', 'sess1');
    expect(api.post).toHaveBeenCalledWith('/ai-assist/pricing/', {
      event_type: 'billetterie',
      category: 'cat',
      city: 'Douala',
      capacity: '100',
      description: 'desc',
      session_id: 'sess1',
    });
  });

  it('usage() GETs /ai-assist/usage/ with session_id param', async () => {
    await aiAssistAPI.usage('sess1');
    expect(api.get).toHaveBeenCalledWith('/ai-assist/usage/', { params: { session_id: 'sess1' } });
  });
});
