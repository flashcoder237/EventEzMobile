// ============================================
// EventEz Mobile API — System Status / Incidents
// ============================================

import api from './instance';

export const statusAPI = {
  // Public
  getSnapshot: () => api.get('/status/'),
  getServices: () => api.get('/status/services/'),
  getHistory: (days?: number) =>
    api.get('/status/incidents/', { params: days ? { days } : undefined }),
  getIncident: (id: string) => api.get(`/status/incidents/${id}/`),

  // Admin CRUD
  listAdmin: (params?: any) => api.get('/admin/incidents/', { params }),
  getAdmin: (id: string) => api.get(`/admin/incidents/${id}/`),
  create: (data: any) => api.post('/admin/incidents/', data),
  update: (id: string, data: any) => api.patch(`/admin/incidents/${id}/`, data),
  delete: (id: string) => api.delete(`/admin/incidents/${id}/`),
  addUpdate: (id: string, data: { status: string; message: string }) =>
    api.post(`/admin/incidents/${id}/updates/`, data),
  resolve: (id: string, message?: string) =>
    api.post(`/admin/incidents/${id}/resolve/`, message ? { message } : {}),
};
