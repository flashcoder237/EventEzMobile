/**
 * Smoke tests pour liveAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { liveAPI } from '../content';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('liveAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getQuestionsByEvent() GETs /live-questions/by_event/ with event_id', async () => {
    await liveAPI.getQuestionsByEvent('eid');
    expect(api.get).toHaveBeenCalledWith('/live-questions/by_event/', {
      params: { event_id: 'eid' },
    });
  });

  it('createQuestion() POSTs /live-questions/', async () => {
    const data = { event: 'eid', content: 'q?', is_anonymous: true };
    await liveAPI.createQuestion(data);
    expect(api.post).toHaveBeenCalledWith('/live-questions/', data);
  });

  it('upvoteQuestion() POSTs /live-questions/{id}/upvote/', async () => {
    await liveAPI.upvoteQuestion('qid');
    expect(api.post).toHaveBeenCalledWith('/live-questions/qid/upvote/');
  });

  it('getPollsByEvent() GETs /live-polls/by_event/ with event_id', async () => {
    await liveAPI.getPollsByEvent('eid');
    expect(api.get).toHaveBeenCalledWith('/live-polls/by_event/', {
      params: { event_id: 'eid' },
    });
  });

  it('getPollResults() GETs /live-polls/{id}/results/', async () => {
    await liveAPI.getPollResults('pid');
    expect(api.get).toHaveBeenCalledWith('/live-polls/pid/results/');
  });

  it('vote() POSTs /poll-votes/', async () => {
    const data = { poll: 'pid', option: 'oid' };
    await liveAPI.vote(data);
    expect(api.post).toHaveBeenCalledWith('/poll-votes/', data);
  });
});
