// ============================================
// EventEz Mobile API — Feedbacks, Flags & Validations
// ============================================

import api from './instance';

// ============================================
// FEEDBACKS API
// ============================================

export const feedbacksAPI = {
  getFeedbacks: (params?: any) =>
    api.get('/feedbacks/', { params }),

  getFeedback: (id: string) =>
    api.get(`/feedbacks/${id}/`),

  createFeedback: (data: any) =>
    api.post('/feedbacks/', data),

  updateFeedback: (id: string, data: any) =>
    api.put(`/feedbacks/${id}/`, data),

  deleteFeedback: (id: string) =>
    api.delete(`/feedbacks/${id}/`),

  getMyFeedback: () =>
    api.get('/feedbacks/my_feedback/'),

  getEventFeedbacks: (eventId: string) =>
    api.get('/feedbacks/', { params: { event: eventId } }),
};

// ============================================
// FLAGS API (Reports)
// ============================================

export const flagsAPI = {
  getFlags: (params?: any) =>
    api.get('/flags/', { params }),

  getFlag: (id: string) =>
    api.get(`/flags/${id}/`),

  createFlag: (data: any) =>
    api.post('/flags/', data),

  resolveFlag: (id: string, resolutionData: any) =>
    api.post(`/flags/${id}/resolve/`, resolutionData),

  getUnresolvedFlags: () =>
    api.get('/flags/unresolved/'),
};

// ============================================
// VALIDATIONS API
// ============================================

export const validationsAPI = {
  getValidations: (params?: any) =>
    api.get('/validations/', { params }),

  getValidation: (id: string) =>
    api.get(`/validations/${id}/`),

  createValidation: (data: any) =>
    api.post('/validations/', data),

  updateValidation: (id: string, data: any) =>
    api.put(`/validations/${id}/`, data),

  getEventStats: (eventId: string) =>
    api.get('/validations/event_stats/', { params: { event: eventId } }),
};
