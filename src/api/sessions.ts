// ============================================
// EventEz Mobile API — Sessions, Speakers & Tracks
// ============================================

import api from './instance';
import { fetchUpload } from './config';

// ============================================
// SESSIONS API (Agenda)
// ============================================

export const sessionsAPI = {
  // CRUD de base
  getSessions: (params?: any) =>
    api.get('/sessions/', { params }),

  getSession: (id: string) =>
    api.get(`/sessions/${id}/`),

  createSession: (data: any) =>
    api.post('/sessions/', data),

  updateSession: (id: string, data: any) =>
    api.put(`/sessions/${id}/`, data),

  deleteSession: (id: string) =>
    api.delete(`/sessions/${id}/`),

  // Calendrier et mes sessions
  getCalendar: (params?: any) =>
    api.get('/sessions/calendar/', { params }),

  getMySessions: () =>
    api.get('/sessions/my_sessions/'),

  // Inscription aux sessions
  registerToSession: (id: string) =>
    api.post(`/sessions/${id}/register/`),

  unregisterFromSession: (id: string) =>
    api.post(`/sessions/${id}/unregister/`),

  // Présence
  markAttended: (id: string, data?: { user_id?: string }) =>
    api.post(`/sessions/${id}/mark_attended/`, data || {}),

  // Participants
  getAttendees: (id: string) =>
    api.get(`/sessions/${id}/attendees/`),

  // Statistiques
  getStatistics: (id: string) =>
    api.get(`/sessions/${id}/statistics/`),

  // Ressources
  addResource: (id: string, resourceData: any) =>
    api.post(`/sessions/${id}/add_resource/`, resourceData),

  // Liste d'attente session
  joinWaitlist: (id: string) =>
    api.post(`/sessions/${id}/join_waitlist/`),

  getWaitlistStatus: (id: string) =>
    api.get(`/sessions/${id}/waitlist_status/`),

  leaveWaitlist: (id: string) =>
    api.post(`/sessions/${id}/leave_waitlist/`),
};

// ============================================
// SESSION REGISTRATIONS API
// ============================================

export const sessionRegistrationsAPI = {
  getSessionRegistrations: (params?: any) =>
    api.get('/session-registrations/', { params }),

  getSessionRegistration: (id: string) =>
    api.get(`/session-registrations/${id}/`),

  createSessionRegistration: (data: any) =>
    api.post('/session-registrations/', data),

  updateSessionRegistration: (id: string, data: any) =>
    api.put(`/session-registrations/${id}/`, data),

  deleteSessionRegistration: (id: string) =>
    api.delete(`/session-registrations/${id}/`),
};

// ============================================
// SESSION RESOURCES API
// ============================================

export const sessionResourcesAPI = {
  getSessionResources: (params?: any) =>
    api.get('/session-resources/', { params }),

  getSessionResource: (id: string) =>
    api.get(`/session-resources/${id}/`),

  createSessionResource: (data: any) =>
    api.post('/session-resources/', data),

  updateSessionResource: (id: string, data: any) =>
    api.put(`/session-resources/${id}/`, data),

  deleteSessionResource: (id: string) =>
    api.delete(`/session-resources/${id}/`),

  downloadResource: (id: string) =>
    api.post(`/session-resources/${id}/download/`),
};

// ============================================
// SPEAKERS API
// ============================================

export const speakersAPI = {
  // CRUD de base
  getSpeakers: (params?: any) =>
    api.get('/speakers/', { params }),

  getSpeaker: (id: string) =>
    api.get(`/speakers/${id}/`),

  createSpeaker: (data: any) =>
    api.post('/speakers/', data),

  updateSpeaker: (id: string, data: any) =>
    api.put(`/speakers/${id}/`, data),

  patchSpeaker: (id: string, data: any) =>
    api.patch(`/speakers/${id}/`, data),

  deleteSpeaker: (id: string) =>
    api.delete(`/speakers/${id}/`),

  // Sessions du speaker
  getSpeakerSessions: (id: string) =>
    api.get(`/speakers/${id}/sessions/`),

  uploadPhoto: (id: string, formData: FormData) =>
    fetchUpload('PATCH', `/speakers/${id}/`, formData),
};

// ============================================
// TRACKS API
// ============================================

export const tracksAPI = {
  getTracks: (params?: any) =>
    api.get('/tracks/', { params }),

  getTrack: (id: string) =>
    api.get(`/tracks/${id}/`),

  createTrack: (data: any) =>
    api.post('/tracks/', data),

  updateTrack: (id: string, data: any) =>
    api.put(`/tracks/${id}/`, data),

  deleteTrack: (id: string) =>
    api.delete(`/tracks/${id}/`),
};
