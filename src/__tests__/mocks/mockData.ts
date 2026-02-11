/**
 * Mock Data pour les tests
 * Données factices représentant les modèles de l'application
 */

import {
  User,
  Event,
  Category,
  Tag,
  TicketType,
  Registration,
  TicketPurchase,
  Payment,
  Notification,
  Conversation,
  Message,
  Feedback,
  WaitlistEntry,
  Discount,
  OrganizerWallet,
  Session,
  Speaker,
} from '../../types';

// ============================================
// USERS
// ============================================

export const mockUser: User = {
  id: 'user-1',
  email: 'test@eventez.com',
  username: 'testuser',
  first_name: 'Jean',
  last_name: 'Dupont',
  phone_number: '+237699999999',
  role: 'user',
  profile_picture: 'https://example.com/avatar.jpg',
  is_verified: true,
  email_notifications: true,
  push_notifications: true,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockOrganizer: User = {
  id: 'org-1',
  email: 'organizer@eventez.com',
  username: 'organizertest',
  first_name: 'Marie',
  last_name: 'Martin',
  phone_number: '+237688888888',
  role: 'organizer',
  organizer_type: 'individual',
  profile_picture: 'https://example.com/org-avatar.jpg',
  is_verified: true,
  created_at: '2024-01-01T00:00:00Z',
};

// ============================================
// CATEGORIES & TAGS
// ============================================

export const mockCategory: Category = {
  id: 1,
  name: 'Musique',
  description: 'Concerts et festivals',
  image: 'https://example.com/music.jpg',
  is_active: true,
  event_count: 25,
};

export const mockCategories: Category[] = [
  mockCategory,
  { id: 2, name: 'Sport', description: 'Événements sportifs', is_active: true },
  { id: 3, name: 'Culture', description: 'Art et culture', is_active: true },
  { id: 4, name: 'Tech', description: 'Conférences tech', is_active: true },
];

export const mockTag: Tag = {
  id: 1,
  name: 'concert',
  slug: 'concert',
};

export const mockTags: Tag[] = [
  mockTag,
  { id: 2, name: 'festival', slug: 'festival' },
  { id: 3, name: 'live', slug: 'live' },
];

// ============================================
// TICKET TYPES
// ============================================

export const mockTicketType: TicketType = {
  id: 'ticket-1',
  event: 'event-1',
  name: 'Standard',
  description: 'Accès général',
  price: 5000,
  quantity_total: 100,
  quantity_sold: 25,
  quantity_available: 75,
  sales_start: '2024-01-01T00:00:00Z',
  sales_end: '2024-12-31T23:59:59Z',
  is_visible: true,
  max_per_order: 10,
};

export const mockTicketTypes: TicketType[] = [
  mockTicketType,
  {
    id: 'ticket-2',
    event: 'event-1',
    name: 'VIP',
    description: 'Accès VIP avec avantages',
    price: 15000,
    quantity_total: 50,
    quantity_sold: 10,
    quantity_available: 40,
    sales_start: '2024-01-01T00:00:00Z',
    sales_end: '2024-12-31T23:59:59Z',
    is_visible: true,
  },
  {
    id: 'ticket-3',
    event: 'event-1',
    name: 'Gratuit',
    description: 'Entrée gratuite',
    price: 0,
    quantity_total: 200,
    quantity_sold: 50,
    quantity_available: 150,
    sales_start: '2024-01-01T00:00:00Z',
    sales_end: '2024-12-31T23:59:59Z',
  },
];

// ============================================
// EVENTS
// ============================================

export const mockEvent: Event = {
  id: 'event-1',
  title: 'Concert de Jazz',
  slug: 'concert-de-jazz',
  description: 'Un magnifique concert de jazz avec des artistes internationaux.',
  short_description: 'Concert de jazz exceptionnel',
  event_type: 'billetterie',
  start_date: '2024-06-15T19:00:00Z',
  end_date: '2024-06-15T23:00:00Z',
  location_type: 'in_person',
  location_name: 'Palais des Congrès',
  location_address: '123 Avenue de la Liberté',
  location_city: 'Douala',
  location_country: 'Cameroun',
  location_latitude: 4.0511,
  location_longitude: 9.7679,
  banner_image: 'https://example.com/event-banner.jpg',
  category: mockCategory,
  organizer: mockOrganizer,
  tags: mockTags,
  status: 'validated',
  is_featured: true,
  view_count: 500,
  registration_count: 75,
  is_free: false,
  base_price: 5000,
  min_price: 5000,
  max_price: 15000,
  ticket_types: mockTicketTypes,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  is_following: false,
};

export const mockFreeEvent: Event = {
  ...mockEvent,
  id: 'event-2',
  title: 'Atelier de Peinture Gratuit',
  event_type: 'inscription',
  is_free: true,
  base_price: 0,
  min_price: 0,
  ticket_types: [],
};

export const mockEvents: Event[] = [
  mockEvent,
  mockFreeEvent,
  {
    ...mockEvent,
    id: 'event-3',
    title: 'Festival de Musique',
    is_featured: false,
    status: 'validated',
  },
];

// ============================================
// REGISTRATIONS
// ============================================

export const mockRegistration: Registration = {
  id: 'reg-1',
  event: mockEvent,
  user: mockUser,
  registration_type: 'billetterie',
  status: 'confirmed',
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
  reference_code: 'REG123456',
  qr_code: 'https://example.com/qr/reg-1.png',
};

export const mockRegistrations: Registration[] = [
  mockRegistration,
  {
    ...mockRegistration,
    id: 'reg-2',
    status: 'pending',
    reference_code: 'REG789012',
  },
];

// ============================================
// TICKET PURCHASES
// ============================================

export const mockTicketPurchase: TicketPurchase = {
  id: 'purchase-1',
  registration: 'reg-1',
  ticket_type: mockTicketType,
  quantity: 2,
  unit_price: 5000,
  total_price: 10000,
  qr_code: 'https://example.com/qr/purchase-1.png',
  is_checked_in: false,
  event: mockEvent,
  status: 'confirmed',
};

// ============================================
// PAYMENTS
// ============================================

export const mockPayment: Payment = {
  id: 'payment-1',
  registration: 'reg-1',
  user: 'user-1',
  amount: 10000,
  currency: 'XAF',
  payment_method: 'mtn_money',
  status: 'completed',
  transaction_id: 'TXN123456',
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
  phone_number: '+237699999999',
};

// ============================================
// NOTIFICATIONS
// ============================================

export const mockNotification: Notification = {
  id: 'notif-1',
  user: 'user-1',
  title: 'Inscription confirmée',
  message: 'Votre inscription au Concert de Jazz a été confirmée.',
  notification_type: 'registration_confirmation',
  is_read: false,
  created_at: '2024-01-10T00:00:00Z',
  link: '/events/event-1',
};

export const mockNotifications: Notification[] = [
  mockNotification,
  {
    id: 'notif-2',
    user: 'user-1',
    title: 'Rappel événement',
    message: 'Le Concert de Jazz commence dans 24h.',
    notification_type: 'general',
    is_read: true,
    created_at: '2024-01-09T00:00:00Z',
  },
];

// ============================================
// MESSAGES
// ============================================

export const mockConversation: Conversation = {
  id: 'conv-1',
  participants: [mockUser, mockOrganizer],
  conversation_type: 'direct',
  title: 'Discussion avec l\'organisateur',
  unread_count: 2,
  is_archived: false,
  is_starred: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
};

export const mockMessage: Message = {
  id: 'msg-1',
  conversation: 'conv-1',
  sender: 2 as any,
  sender_name: 'Marie Martin',
  content: 'Bonjour ! Comment puis-je vous aider ?',
  message_type: 'text',
  read_by: [1, 2],
  is_starred: false,
  is_edited: false,
  is_deleted: false,
  created_at: '2024-01-10T10:00:00Z',
  reactions: [
    { id: 'reaction-1', user: 1, user_name: 'Jean Dupont', emoji: '👍', created_at: '2024-01-10T10:01:00Z' },
  ],
};

export const mockMessages: Message[] = [
  mockMessage,
  {
    id: 'msg-2',
    conversation: 'conv-1',
    sender: 1 as any,
    sender_name: 'Jean Dupont',
    content: 'Bonjour ! J\'ai une question sur l\'événement.',
    message_type: 'text',
    read_by: [1, 2],
    is_starred: false,
    is_edited: false,
    is_deleted: false,
    created_at: '2024-01-10T10:05:00Z',
  },
];

// ============================================
// FEEDBACKS
// ============================================

export const mockFeedback: Feedback = {
  id: 'feedback-1',
  event: 'event-1',
  user: mockUser,
  rating: 5,
  comment: 'Excellent événement ! Je recommande vivement.',
  created_at: '2024-01-11T00:00:00Z',
  is_approved: true,
  user_name: 'Jean Dupont',
};

export const mockFeedbacks: Feedback[] = [
  mockFeedback,
  {
    id: 'feedback-2',
    event: 'event-1',
    user: 'user-2',
    rating: 4,
    comment: 'Très bien organisé.',
    created_at: '2024-01-12T00:00:00Z',
    user_name: 'Marie Martin',
  },
];

// ============================================
// WAITLIST
// ============================================

export const mockWaitlistEntry: WaitlistEntry = {
  id: 'waitlist-1',
  event: 'event-1',
  user: 'user-1',
  ticket_type: 'ticket-1',
  position: 1,
  status: 'waiting',
  created_at: '2024-01-10T00:00:00Z',
};

// ============================================
// DISCOUNTS
// ============================================

export const mockDiscount: Discount = {
  id: 'discount-1',
  event: 'event-1',
  code: 'PROMO2024',
  discount_type: 'percentage',
  value: 20,
  valid_from: '2024-01-01T00:00:00Z',
  valid_until: '2024-12-31T23:59:59Z',
  max_uses: 100,
  times_used: 10,
  is_active: true,
};

// ============================================
// WALLET
// ============================================

export const mockWallet: OrganizerWallet = {
  id: 'wallet-1',
  organizer: 'org-1',
  available_balance: 150000,
  pending_balance: 25000,
  total_earnings: 500000,
  total_withdrawn: 325000,
  total_fees: 25000,
  currency: 'XAF',
  bank_name: 'Ecobank',
  bank_account_name: 'Marie Martin',
  bank_account_number: '123456789',
  minimum_payout: 10000,
  can_withdraw: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

// ============================================
// SESSIONS & SPEAKERS
// ============================================

export const mockSpeaker: Speaker = {
  id: 'speaker-1',
  event: 'event-1',
  first_name: 'Paul',
  last_name: 'Kamga',
  title: 'CEO',
  company: 'Tech Africa',
  bio: 'Expert en technologie et innovation.',
  email: 'paul@techafrique.com',
  photo: 'https://example.com/speaker.jpg',
  is_featured: true,
};

export const mockSession: Session = {
  id: 'session-1',
  event: 'event-1',
  title: 'Keynote: L\'avenir de la tech en Afrique',
  description: 'Une présentation sur les tendances technologiques.',
  session_type: 'keynote',
  start_time: '2024-06-15T09:00:00Z',
  end_time: '2024-06-15T10:00:00Z',
  location: 'Salle principale',
  speakers: [mockSpeaker],
  requires_registration: false,
  registration_count: 50,
  is_featured: true,
};

// ============================================
// API RESPONSES
// ============================================

export const mockPaginatedResponse = <T>(results: T[], count?: number) => ({
  count: count ?? results.length,
  next: null,
  previous: null,
  results,
});

export const mockApiResponse = <T>(data: T) => ({
  data,
  status: 200,
});
