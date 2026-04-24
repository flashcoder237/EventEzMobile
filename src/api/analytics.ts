// ============================================
// EventEz Mobile API — Analytics
// ============================================

import api from './instance';

// ============================================
// ANALYTICS API
// ============================================

export const analyticsAPI = {
  // AnalyticsViewSet actions
  getDashboardSummary: (params?: any) =>
    api.get('/analytics/dashboard_summary/', { params }),

  getEventAnalytics: (params?: any) =>
    api.get('/analytics/events/', { params }),

  getEventRegistrations: (params?: any) =>
    api.get('/analytics/event_registrations/', { params }),

  predictAttendance: (params?: { event_id: string }) =>
    api.get('/analytics/predict_attendance/', { params }),

  getRegistrationAnalytics: (params?: any) =>
    api.get('/analytics/registrations/', { params }),

  getRevenueAnalytics: (params?: any) =>
    api.get('/analytics/revenue/', { params }),

  getUserAnalytics: (params?: any) =>
    api.get('/analytics/users/', { params }),

  // Dashboards
  getDashboards: (params?: any) =>
    api.get('/analytics/dashboards/', { params }),

  getDashboard: (id: string) =>
    api.get(`/analytics/dashboards/${id}/`),

  createDashboard: (data: any) =>
    api.post('/analytics/dashboards/', data),

  updateDashboard: (id: string, data: any) =>
    api.put(`/analytics/dashboards/${id}/`, data),

  deleteDashboard: (id: string) =>
    api.delete(`/analytics/dashboards/${id}/`),

  getDashboardWidgets: (id: string) =>
    api.get(`/analytics/dashboards/${id}/widgets/`),

  // Dashboard Widgets
  getWidgets: (params?: any) =>
    api.get('/analytics/dashboard-widgets/', { params }),

  getWidget: (id: string) =>
    api.get(`/analytics/dashboard-widgets/${id}/`),

  createWidget: (data: any) =>
    api.post('/analytics/dashboard-widgets/', data),

  updateWidget: (id: string, data: any) =>
    api.put(`/analytics/dashboard-widgets/${id}/`, data),

  deleteWidget: (id: string) =>
    api.delete(`/analytics/dashboard-widgets/${id}/`),

  // Reports
  getReports: (params?: any) =>
    api.get('/analytics/reports/', { params }),

  getReport: (id: string) =>
    api.get(`/analytics/reports/${id}/`),

  createReport: (data: any) =>
    api.post('/analytics/reports/', data),

  updateReport: (id: string, data: any) =>
    api.put(`/analytics/reports/${id}/`, data),

  deleteReport: (id: string) =>
    api.delete(`/analytics/reports/${id}/`),

  // Export — use `useExport()` hook instead (needs arraybuffer + file write + share)
  // Endpoint path kept for reference: GET /analytics/reports/{id}/export/?format=csv|xlsx|pdf

  generateReport: (data: any) =>
    api.post('/analytics/reports/generate/', data),
};
