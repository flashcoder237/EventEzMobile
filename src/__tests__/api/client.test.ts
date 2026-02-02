/**
 * Tests pour le client API
 * Vérifie la configuration et les fonctions du client Axios
 */

import * as SecureStore from 'expo-secure-store';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  authAPI,
  usersAPI,
  eventsAPI,
  categoriesAPI,
  registrationsAPI,
  ticketPurchasesAPI,
  paymentsAPI,
  notificationsAPI,
  messagesAPI,
  feedbacksAPI,
  waitlistAPI,
  discountsAPI,
  walletAPI,
  analyticsAPI,
} from '../../api/client';

// Mock SecureStore
jest.mock('expo-secure-store');
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

// Mock axios
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
  };
});

describe('Token Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setTokens', () => {
    it('should store access and refresh tokens', async () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      await setTokens(accessToken, refreshToken);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'eventez_access_token',
        accessToken
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'eventez_refresh_token',
        refreshToken
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearTokens', () => {
    it('should remove both tokens from storage', async () => {
      await clearTokens();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('eventez_access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('eventez_refresh_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAccessToken', () => {
    it('should retrieve access token from storage', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('stored-access-token');

      const token = await getAccessToken();

      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('eventez_access_token');
      expect(token).toBe('stored-access-token');
    });

    it('should return null when no token exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const token = await getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('should retrieve refresh token from storage', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('stored-refresh-token');

      const token = await getRefreshToken();

      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('eventez_refresh_token');
      expect(token).toBe('stored-refresh-token');
    });
  });
});

describe('Auth API', () => {
  describe('authAPI.login', () => {
    it('should have login method', () => {
      expect(authAPI.login).toBeDefined();
      expect(typeof authAPI.login).toBe('function');
    });
  });

  describe('authAPI.register', () => {
    it('should have register method', () => {
      expect(authAPI.register).toBeDefined();
      expect(typeof authAPI.register).toBe('function');
    });
  });

  describe('authAPI.registerOrganizer', () => {
    it('should have registerOrganizer method', () => {
      expect(authAPI.registerOrganizer).toBeDefined();
      expect(typeof authAPI.registerOrganizer).toBe('function');
    });
  });

  describe('authAPI.refreshToken', () => {
    it('should have refreshToken method', () => {
      expect(authAPI.refreshToken).toBeDefined();
      expect(typeof authAPI.refreshToken).toBe('function');
    });
  });

  describe('authAPI.requestPasswordReset', () => {
    it('should have requestPasswordReset method', () => {
      expect(authAPI.requestPasswordReset).toBeDefined();
      expect(typeof authAPI.requestPasswordReset).toBe('function');
    });
  });

  describe('authAPI.logout', () => {
    it('should have logout method', () => {
      expect(authAPI.logout).toBeDefined();
      expect(typeof authAPI.logout).toBe('function');
    });

    it('should clear tokens on logout', async () => {
      await authAPI.logout();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('eventez_access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('eventez_refresh_token');
    });
  });
});

describe('Users API', () => {
  it('should have all user methods', () => {
    expect(usersAPI.getUsers).toBeDefined();
    expect(usersAPI.getUser).toBeDefined();
    expect(usersAPI.getCurrentUser).toBeDefined();
    expect(usersAPI.updateCurrentUser).toBeDefined();
    expect(usersAPI.updateProfile).toBeDefined();
    expect(usersAPI.updateProfileImage).toBeDefined();
    expect(usersAPI.getUserSettings).toBeDefined();
    expect(usersAPI.updateUserSettings).toBeDefined();
    expect(usersAPI.changePassword).toBeDefined();
    expect(usersAPI.becomeOrganizer).toBeDefined();
    expect(usersAPI.getOrganizers).toBeDefined();
  });
});

describe('Events API', () => {
  it('should have all event methods', () => {
    expect(eventsAPI.getEvents).toBeDefined();
    expect(eventsAPI.getEvent).toBeDefined();
    expect(eventsAPI.createEvent).toBeDefined();
    expect(eventsAPI.updateEvent).toBeDefined();
    expect(eventsAPI.deleteEvent).toBeDefined();
    expect(eventsAPI.getFeaturedEvents).toBeDefined();
    expect(eventsAPI.getMyEvents).toBeDefined();
    expect(eventsAPI.publishEvent).toBeDefined();
    expect(eventsAPI.cancelEvent).toBeDefined();
    expect(eventsAPI.duplicateEvent).toBeDefined();
    expect(eventsAPI.followEvent).toBeDefined();
    expect(eventsAPI.unfollowEvent).toBeDefined();
    expect(eventsAPI.isFollowing).toBeDefined();
    expect(eventsAPI.getFollowingEvents).toBeDefined();
    expect(eventsAPI.getNearbyEvents).toBeDefined();
    expect(eventsAPI.getMapEvents).toBeDefined();
    expect(eventsAPI.searchEvents).toBeDefined();
  });
});

describe('Categories API', () => {
  it('should have all category methods', () => {
    expect(categoriesAPI.getCategories).toBeDefined();
    expect(categoriesAPI.getCategory).toBeDefined();
    expect(categoriesAPI.createCategory).toBeDefined();
    expect(categoriesAPI.updateCategory).toBeDefined();
    expect(categoriesAPI.deleteCategory).toBeDefined();
    expect(categoriesAPI.getCategoryEvents).toBeDefined();
  });
});

describe('Registrations API', () => {
  it('should have all registration methods', () => {
    expect(registrationsAPI.getRegistrations).toBeDefined();
    expect(registrationsAPI.getRegistration).toBeDefined();
    expect(registrationsAPI.createRegistration).toBeDefined();
    expect(registrationsAPI.updateRegistration).toBeDefined();
    expect(registrationsAPI.deleteRegistration).toBeDefined();
    expect(registrationsAPI.getMyRegistrations).toBeDefined();
    expect(registrationsAPI.cancelRegistration).toBeDefined();
    expect(registrationsAPI.checkIn).toBeDefined();
    expect(registrationsAPI.verifyTicket).toBeDefined();
    expect(registrationsAPI.getPendingApproval).toBeDefined();
    expect(registrationsAPI.approveRegistration).toBeDefined();
    expect(registrationsAPI.rejectRegistration).toBeDefined();
  });
});

describe('Ticket Purchases API', () => {
  it('should have all ticket purchase methods', () => {
    expect(ticketPurchasesAPI.getTicketPurchases).toBeDefined();
    expect(ticketPurchasesAPI.getTicketPurchase).toBeDefined();
    expect(ticketPurchasesAPI.createTicketPurchase).toBeDefined();
    expect(ticketPurchasesAPI.updateTicketPurchase).toBeDefined();
    expect(ticketPurchasesAPI.checkIn).toBeDefined();
    expect(ticketPurchasesAPI.getMyTickets).toBeDefined();
  });
});

describe('Payments API', () => {
  it('should have all payment methods', () => {
    expect(paymentsAPI.getPayments).toBeDefined();
    expect(paymentsAPI.getPayment).toBeDefined();
    expect(paymentsAPI.createPayment).toBeDefined();
    expect(paymentsAPI.initializePayment).toBeDefined();
    expect(paymentsAPI.verifyPayment).toBeDefined();
    expect(paymentsAPI.processMtnMoney).toBeDefined();
    expect(paymentsAPI.processOrangeMoney).toBeDefined();
  });
});

describe('Notifications API', () => {
  it('should have all notification methods', () => {
    expect(notificationsAPI.getNotifications).toBeDefined();
    expect(notificationsAPI.getNotification).toBeDefined();
    expect(notificationsAPI.deleteNotification).toBeDefined();
    expect(notificationsAPI.markAsRead).toBeDefined();
    expect(notificationsAPI.markAllAsRead).toBeDefined();
    expect(notificationsAPI.deleteMultiple).toBeDefined();
    expect(notificationsAPI.sendNotification).toBeDefined();
  });
});

describe('Messages API', () => {
  it('should have all message methods', () => {
    expect(messagesAPI.getConversations).toBeDefined();
    expect(messagesAPI.getConversation).toBeDefined();
    expect(messagesAPI.createConversation).toBeDefined();
    expect(messagesAPI.updateConversation).toBeDefined();
    expect(messagesAPI.deleteConversation).toBeDefined();
    expect(messagesAPI.archiveConversation).toBeDefined();
    expect(messagesAPI.getMessages).toBeDefined();
    expect(messagesAPI.sendMessage).toBeDefined();
    expect(messagesAPI.updateMessage).toBeDefined();
    expect(messagesAPI.deleteMessage).toBeDefined();
    expect(messagesAPI.markMessageAsRead).toBeDefined();
    expect(messagesAPI.markConversationAsRead).toBeDefined();
    expect(messagesAPI.uploadAttachment).toBeDefined();
    expect(messagesAPI.addReaction).toBeDefined();
    expect(messagesAPI.removeReaction).toBeDefined();
  });
});

describe('Feedbacks API', () => {
  it('should have all feedback methods', () => {
    expect(feedbacksAPI.getFeedbacks).toBeDefined();
    expect(feedbacksAPI.getFeedback).toBeDefined();
    expect(feedbacksAPI.createFeedback).toBeDefined();
    expect(feedbacksAPI.updateFeedback).toBeDefined();
    expect(feedbacksAPI.deleteFeedback).toBeDefined();
    expect(feedbacksAPI.getEventFeedbacks).toBeDefined();
  });
});

describe('Waitlist API', () => {
  it('should have all waitlist methods', () => {
    expect(waitlistAPI.getWaitlist).toBeDefined();
    expect(waitlistAPI.getWaitlistEntry).toBeDefined();
    expect(waitlistAPI.joinWaitlist).toBeDefined();
    expect(waitlistAPI.cancelWaitlist).toBeDefined();
    expect(waitlistAPI.getMyWaitlist).toBeDefined();
    expect(waitlistAPI.notifyEntry).toBeDefined();
    expect(waitlistAPI.notifyBatch).toBeDefined();
  });
});

describe('Discounts API', () => {
  it('should have all discount methods', () => {
    expect(discountsAPI.getDiscounts).toBeDefined();
    expect(discountsAPI.getDiscount).toBeDefined();
    expect(discountsAPI.createDiscount).toBeDefined();
    expect(discountsAPI.updateDiscount).toBeDefined();
    expect(discountsAPI.deleteDiscount).toBeDefined();
    expect(discountsAPI.validateDiscount).toBeDefined();
  });
});

describe('Wallet API', () => {
  it('should have all wallet methods', () => {
    expect(walletAPI.getMyWallet).toBeDefined();
    expect(walletAPI.updateBankDetails).toBeDefined();
    expect(walletAPI.getTransactions).toBeDefined();
    expect(walletAPI.getPendingEarnings).toBeDefined();
    expect(walletAPI.getStats).toBeDefined();
  });
});

describe('Analytics API', () => {
  it('should have all analytics methods', () => {
    expect(analyticsAPI.getDashboardSummary).toBeDefined();
    expect(analyticsAPI.getEventAnalytics).toBeDefined();
    expect(analyticsAPI.getRegistrationAnalytics).toBeDefined();
    expect(analyticsAPI.getRevenueAnalytics).toBeDefined();
    expect(analyticsAPI.getDashboards).toBeDefined();
    expect(analyticsAPI.getReports).toBeDefined();
  });
});
