/**
 * Smoke tests pour feedbacksAPI — vérifie URL + verbe HTTP + body shape.
 */

jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { feedbacksAPI } from '../feedback';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('feedbacksAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('getFeedbacks() GETs /feedbacks/ with params', async () => {
    await feedbacksAPI.getFeedbacks({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/feedbacks/', { params: { page: 1 } });
  });

  it('getFeedback() GETs /feedbacks/{id}/', async () => {
    await feedbacksAPI.getFeedback('fid');
    expect(api.get).toHaveBeenCalledWith('/feedbacks/fid/');
  });

  it('createFeedback() POSTs /feedbacks/', async () => {
    const data = { rating: 5, comment: 'Great' };
    await feedbacksAPI.createFeedback(data);
    expect(api.post).toHaveBeenCalledWith('/feedbacks/', data);
  });

  it('updateFeedback() PUTs /feedbacks/{id}/', async () => {
    const data = { rating: 4 };
    await feedbacksAPI.updateFeedback('fid', data);
    expect(api.put).toHaveBeenCalledWith('/feedbacks/fid/', data);
  });

  it('deleteFeedback() DELETEs /feedbacks/{id}/', async () => {
    await feedbacksAPI.deleteFeedback('fid');
    expect(api.delete).toHaveBeenCalledWith('/feedbacks/fid/');
  });

  it('getMyFeedback() GETs /feedbacks/my_feedback/', async () => {
    await feedbacksAPI.getMyFeedback();
    expect(api.get).toHaveBeenCalledWith('/feedbacks/my_feedback/');
  });

  it('getEventFeedbacks() GETs /feedbacks/ with event param', async () => {
    await feedbacksAPI.getEventFeedbacks('eid');
    expect(api.get).toHaveBeenCalledWith('/feedbacks/', { params: { event: 'eid' } });
  });
});
