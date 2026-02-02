/**
 * Mocks pour l'API Client
 * Simule les appels API pour les tests
 */

import {
  mockUser,
  mockOrganizer,
  mockEvents,
  mockEvent,
  mockCategories,
  mockTicketTypes,
  mockRegistration,
  mockRegistrations,
  mockTicketPurchase,
  mockPayment,
  mockNotifications,
  mockConversation,
  mockMessages,
  mockFeedbacks,
  mockWaitlistEntry,
  mockDiscount,
  mockWallet,
  mockPaginatedResponse,
} from './mockData';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

// ============================================
// AUTH API MOCKS
// ============================================

export const mockAuthAPI = {
  login: jest.fn().mockResolvedValue({
    data: {
      access: 'mock-access-token',
      refresh: 'mock-refresh-token',
      user: mockUser,
    },
  }),
  register: jest.fn().mockResolvedValue({
    data: mockUser,
  }),
  registerOrganizer: jest.fn().mockResolvedValue({
    data: mockOrganizer,
  }),
  refreshToken: jest.fn().mockResolvedValue({
    data: { access: 'new-access-token' },
  }),
  requestPasswordReset: jest.fn().mockResolvedValue({
    data: { message: 'Email envoyé' },
  }),
  logout: jest.fn().mockResolvedValue(undefined),
};

// ============================================
// USERS API MOCKS
// ============================================

export const mockUsersAPI = {
  getCurrentUser: jest.fn().mockResolvedValue({ data: mockUser }),
  updateCurrentUser: jest.fn().mockResolvedValue({ data: mockUser }),
  updateProfile: jest.fn().mockResolvedValue({ data: mockUser }),
  updateProfileImage: jest.fn().mockResolvedValue({ data: mockUser }),
  getUserSettings: jest.fn().mockResolvedValue({
    data: {
      email_notifications: true,
      push_notifications: true,
    },
  }),
  updateUserSettings: jest.fn().mockResolvedValue({ data: {} }),
  changePassword: jest.fn().mockResolvedValue({ data: { message: 'Mot de passe changé' } }),
  becomeOrganizer: jest.fn().mockResolvedValue({ data: mockOrganizer }),
  getOrganizers: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse([mockOrganizer]),
  }),
};

// ============================================
// EVENTS API MOCKS
// ============================================

export const mockEventsAPI = {
  getEvents: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockEvents),
  }),
  getEvent: jest.fn().mockResolvedValue({ data: mockEvent }),
  createEvent: jest.fn().mockResolvedValue({ data: mockEvent }),
  updateEvent: jest.fn().mockResolvedValue({ data: mockEvent }),
  deleteEvent: jest.fn().mockResolvedValue({ data: {} }),
  getFeaturedEvents: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockEvents.filter(e => e.is_featured)),
  }),
  getMyEvents: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockEvents),
  }),
  publishEvent: jest.fn().mockResolvedValue({ data: { ...mockEvent, status: 'submitted' } }),
  cancelEvent: jest.fn().mockResolvedValue({ data: { ...mockEvent, status: 'cancelled' } }),
  duplicateEvent: jest.fn().mockResolvedValue({ data: { ...mockEvent, id: 'event-copy' } }),
  submitForValidation: jest.fn().mockResolvedValue({ data: { ...mockEvent, status: 'submitted' } }),
  followEvent: jest.fn().mockResolvedValue({ data: { is_following: true } }),
  unfollowEvent: jest.fn().mockResolvedValue({ data: { is_following: false } }),
  isFollowing: jest.fn().mockResolvedValue({ data: { is_following: false } }),
  getFollowingEvents: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockEvents),
  }),
  getFollowersCount: jest.fn().mockResolvedValue({ data: { followers_count: 42 } }),
  getNearbyEvents: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockEvents),
  }),
  getMapEvents: jest.fn().mockResolvedValue({ data: mockEvents }),
  searchEvents: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockEvents),
  }),
};

// ============================================
// CATEGORIES API MOCKS
// ============================================

export const mockCategoriesAPI = {
  getCategories: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockCategories),
  }),
  getCategory: jest.fn().mockResolvedValue({ data: mockCategories[0] }),
  getCategoryEvents: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockEvents),
  }),
};

// ============================================
// TICKET TYPES API MOCKS
// ============================================

export const mockTicketTypesAPI = {
  getTicketTypes: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockTicketTypes),
  }),
  getTicketType: jest.fn().mockResolvedValue({ data: mockTicketTypes[0] }),
  createTicketType: jest.fn().mockResolvedValue({ data: mockTicketTypes[0] }),
  updateTicketType: jest.fn().mockResolvedValue({ data: mockTicketTypes[0] }),
  deleteTicketType: jest.fn().mockResolvedValue({ data: {} }),
};

// ============================================
// REGISTRATIONS API MOCKS
// ============================================

export const mockRegistrationsAPI = {
  getRegistrations: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockRegistrations),
  }),
  getRegistration: jest.fn().mockResolvedValue({ data: mockRegistration }),
  createRegistration: jest.fn().mockResolvedValue({ data: mockRegistration }),
  updateRegistration: jest.fn().mockResolvedValue({ data: mockRegistration }),
  deleteRegistration: jest.fn().mockResolvedValue({ data: {} }),
  getMyRegistrations: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockRegistrations),
  }),
  cancelRegistration: jest.fn().mockResolvedValue({
    data: { ...mockRegistration, status: 'cancelled' },
  }),
  checkIn: jest.fn().mockResolvedValue({
    data: { ...mockRegistration, is_checked_in: true },
  }),
  verifyTicket: jest.fn().mockResolvedValue({ data: mockRegistration }),
  getPendingApproval: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockRegistrations.filter(r => r.status === 'pending')),
  }),
  approveRegistration: jest.fn().mockResolvedValue({
    data: { ...mockRegistration, status: 'confirmed' },
  }),
  rejectRegistration: jest.fn().mockResolvedValue({
    data: { ...mockRegistration, status: 'rejected' },
  }),
};

// ============================================
// TICKET PURCHASES API MOCKS
// ============================================

export const mockTicketPurchasesAPI = {
  getTicketPurchases: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse([mockTicketPurchase]),
  }),
  getTicketPurchase: jest.fn().mockResolvedValue({ data: mockTicketPurchase }),
  createTicketPurchase: jest.fn().mockResolvedValue({ data: mockTicketPurchase }),
  getMyTickets: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse([mockTicketPurchase]),
  }),
  checkIn: jest.fn().mockResolvedValue({
    data: { ...mockTicketPurchase, is_checked_in: true },
  }),
};

// ============================================
// PAYMENTS API MOCKS
// ============================================

export const mockPaymentsAPI = {
  getPayments: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse([mockPayment]),
  }),
  getPayment: jest.fn().mockResolvedValue({ data: mockPayment }),
  createPayment: jest.fn().mockResolvedValue({ data: mockPayment }),
  initializePayment: jest.fn().mockResolvedValue({
    data: { ...mockPayment, status: 'processing', redirect_url: 'https://payment.com' },
  }),
  verifyPayment: jest.fn().mockResolvedValue({
    data: { ...mockPayment, status: 'completed' },
  }),
  processMtnMoney: jest.fn().mockResolvedValue({
    data: { ...mockPayment, status: 'processing' },
  }),
  processOrangeMoney: jest.fn().mockResolvedValue({
    data: { ...mockPayment, status: 'processing' },
  }),
};

// ============================================
// NOTIFICATIONS API MOCKS
// ============================================

export const mockNotificationsAPI = {
  getNotifications: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockNotifications),
  }),
  getNotification: jest.fn().mockResolvedValue({ data: mockNotifications[0] }),
  markAsRead: jest.fn().mockResolvedValue({ data: { ...mockNotifications[0], is_read: true } }),
  markAllAsRead: jest.fn().mockResolvedValue({ data: { count: mockNotifications.length } }),
  deleteNotification: jest.fn().mockResolvedValue({ data: {} }),
  deleteMultiple: jest.fn().mockResolvedValue({ data: {} }),
};

// ============================================
// MESSAGES API MOCKS
// ============================================

export const mockMessagesAPI = {
  getConversations: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse([mockConversation]),
  }),
  getConversation: jest.fn().mockResolvedValue({ data: mockConversation }),
  createConversation: jest.fn().mockResolvedValue({ data: mockConversation }),
  updateConversation: jest.fn().mockResolvedValue({ data: mockConversation }),
  deleteConversation: jest.fn().mockResolvedValue({ data: {} }),
  archiveConversation: jest.fn().mockResolvedValue({ data: { ...mockConversation, is_archived: true } }),
  getMessages: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockMessages),
  }),
  sendMessage: jest.fn().mockResolvedValue({ data: mockMessages[0] }),
  updateMessage: jest.fn().mockResolvedValue({ data: mockMessages[0] }),
  deleteMessage: jest.fn().mockResolvedValue({ data: {} }),
  markMessageAsRead: jest.fn().mockResolvedValue({ data: { ...mockMessages[0], is_read: true } }),
  markConversationAsRead: jest.fn().mockResolvedValue({ data: {} }),
  uploadAttachment: jest.fn().mockResolvedValue({
    data: { id: 'attachment-1', file: 'https://example.com/file.jpg' },
  }),
  addReaction: jest.fn().mockResolvedValue({ data: {} }),
  removeReaction: jest.fn().mockResolvedValue({ data: {} }),
};

// ============================================
// FEEDBACKS API MOCKS
// ============================================

export const mockFeedbacksAPI = {
  getFeedbacks: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockFeedbacks),
  }),
  getFeedback: jest.fn().mockResolvedValue({ data: mockFeedbacks[0] }),
  createFeedback: jest.fn().mockResolvedValue({ data: mockFeedbacks[0] }),
  updateFeedback: jest.fn().mockResolvedValue({ data: mockFeedbacks[0] }),
  deleteFeedback: jest.fn().mockResolvedValue({ data: {} }),
  getEventFeedbacks: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse(mockFeedbacks),
  }),
};

// ============================================
// WAITLIST API MOCKS
// ============================================

export const mockWaitlistAPI = {
  getWaitlist: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse([mockWaitlistEntry]),
  }),
  getWaitlistEntry: jest.fn().mockResolvedValue({ data: mockWaitlistEntry }),
  joinWaitlist: jest.fn().mockResolvedValue({ data: mockWaitlistEntry }),
  cancelWaitlist: jest.fn().mockResolvedValue({ data: {} }),
  getMyWaitlist: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse([mockWaitlistEntry]),
  }),
};

// ============================================
// DISCOUNTS API MOCKS
// ============================================

export const mockDiscountsAPI = {
  getDiscounts: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse([mockDiscount]),
  }),
  getDiscount: jest.fn().mockResolvedValue({ data: mockDiscount }),
  createDiscount: jest.fn().mockResolvedValue({ data: mockDiscount }),
  validateDiscount: jest.fn().mockResolvedValue({ data: mockDiscount }),
};

// ============================================
// WALLET API MOCKS
// ============================================

export const mockWalletAPI = {
  getMyWallet: jest.fn().mockResolvedValue({ data: mockWallet }),
  updateBankDetails: jest.fn().mockResolvedValue({ data: mockWallet }),
  getTransactions: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse([]),
  }),
  getPendingEarnings: jest.fn().mockResolvedValue({
    data: mockPaginatedResponse([]),
  }),
  getStats: jest.fn().mockResolvedValue({
    data: {
      available_balance: 150000,
      pending_balance: 25000,
      total_earnings: 500000,
    },
  }),
};

// ============================================
// ANALYTICS API MOCKS
// ============================================

export const mockAnalyticsAPI = {
  getDashboardSummary: jest.fn().mockResolvedValue({
    data: {
      event_summary: { total_events: 10, active_events: 5 },
      registration_summary: { total_registrations: 100 },
      revenue_summary: { total_revenue: 500000 },
    },
  }),
  getEventAnalytics: jest.fn().mockResolvedValue({
    data: {
      event_id: 'event-1',
      views: 500,
      registrations: 75,
      revenue: 375000,
      conversion_rate: 15,
    },
  }),
};

// ============================================
// MOCK API CLIENT
// ============================================

export const mockApiClient = {
  authAPI: mockAuthAPI,
  usersAPI: mockUsersAPI,
  eventsAPI: mockEventsAPI,
  categoriesAPI: mockCategoriesAPI,
  ticketTypesAPI: mockTicketTypesAPI,
  registrationsAPI: mockRegistrationsAPI,
  ticketPurchasesAPI: mockTicketPurchasesAPI,
  paymentsAPI: mockPaymentsAPI,
  notificationsAPI: mockNotificationsAPI,
  messagesAPI: mockMessagesAPI,
  feedbacksAPI: mockFeedbacksAPI,
  waitlistAPI: mockWaitlistAPI,
  discountsAPI: mockDiscountsAPI,
  walletAPI: mockWalletAPI,
  analyticsAPI: mockAnalyticsAPI,
};

// Helper pour réinitialiser tous les mocks
export const resetAllMocks = () => {
  Object.values(mockApiClient).forEach(api => {
    Object.values(api).forEach(fn => {
      if (typeof fn === 'function' && fn.mockClear) {
        fn.mockClear();
      }
    });
  });
};
