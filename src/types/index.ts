// ============================================
// Types principaux pour l'application EventEz Mobile
// ============================================

// Types de lieu pour les événements
export type LocationType = 'in_person' | 'online' | 'hybrid';

// ============================================
// USER & AUTHENTICATION TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role?: 'user' | 'organizer' | 'admin' | 'moderator';
  user_type?: 'individual' | 'organization';
  organizer_type?: 'individual' | 'organization';
  company_name?: string;
  profile_picture?: string;
  image?: string;
  logo_url?: string;
  billing_address?: string;
  registration_number?: string;
  tax_id?: string;
  organizer_name?: string;
  organizer_profile?: OrganizerProfile;
  // Paramètres de notification
  email_notifications?: boolean;
  push_notifications?: boolean;
  sms_notifications?: boolean;
  // Préférences
  language?: string;
  timezone?: string;
  theme?: string;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizerProfile {
  id: string;
  user: string;
  company_name?: string;
  company_description?: string;
  logo?: string;
  website?: string;
  social_links?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  verified: boolean;
  subscription?: OrganizerSubscription;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken?: string;
  refreshToken?: string;
}

// ============================================
// EVENT TYPES
// ============================================

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  event_type: 'billetterie' | 'inscription';
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  // Type de lieu
  location_type: LocationType;
  location_type_display?: string;
  // Lieu physique (pour présentiel et hybride)
  location_city?: string;
  location_address?: string;
  location_name?: string;
  location_country?: string;
  location_latitude?: number;
  location_longitude?: number;
  // Lieu en ligne (pour en ligne et hybride)
  online_url?: string;
  online_platform?: string;
  online_instructions?: string;
  online_meeting_id?: string;
  online_passcode?: string;
  // Médias
  banner_image?: string;
  display_image?: string;
  gallery_images?: EventImage[];
  // Relations
  category?: Category;
  organizer: User;
  organizer_name?: string;
  tags?: Tag[];
  // État
  status: 'draft' | 'published' | 'validated' | 'cancelled' | 'submitted' | 'rejected' | 'completed';
  is_featured: boolean;
  // Prix
  is_free?: boolean;
  base_price?: number;
  min_price?: number;
  max_price?: number;
  // Statistiques
  registration_count: number;
  registrations_count?: number; // Alias
  view_count: number;
  // Métadonnées
  created_at: string;
  updated_at: string;
  // Formulaire personnalisé
  form_fields?: FormField[];
  registration_deadline?: string;
  ticket_price_range?: string;
  ticket_types?: TicketType[];
  // Gestion des inscriptions
  auto_approve_registrations?: boolean;
  max_participants?: number;
  max_capacity?: number;
  // UI helpers
  is_following?: boolean;
  distance_km?: number;
}

export interface EventImage {
  id: string;
  image: string;
  caption?: string;
  order?: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
  icon?: string;
  default_event_image?: string;
  is_active?: boolean;
  event_count?: number;
  events_count?: number;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Alias for backward compatibility
export type EventCategory = Category;

export interface Tag {
  id: number;
  name: string;
  slug?: string;
}

// Alias for backward compatibility
export type EventTag = Tag;

// ============================================
// REGISTRATION & TICKET TYPES
// ============================================

export interface Registration {
  id: string;
  user: User;
  user_name?: string;
  user_email?: string;
  event: Event;
  status: 'pending' | 'pending_approval' | 'confirmed' | 'cancelled' | 'rejected' | 'waitlist' | 'checked_in' | 'completed';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  registration_type?: string;
  tickets?: Ticket[];
  custom_fields?: Record<string, any>;
  form_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  checked_in_at?: string;
  requires_payment: boolean;
  payment_required?: boolean;
  payment_deadline?: string;
  reference_code?: string;
  qr_code?: string;
  event_detail?: Event;
  userInfo?: User;
  is_checked_in?: boolean;
  // Approbation
  approval_status?: 'not_required' | 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_by_name?: string;
  approval_note?: string;
  approval_date?: string;
}

export interface Ticket {
  id: string;
  ticket_type: TicketType;
  registration: string;
  qr_code?: string;
  is_used: boolean;
  used_at?: string;
  ticket_type_name?: string;
  unit_price?: number;
  quantity?: number;
  total_price?: number;
  attendee_name?: string;
  attendee_email?: string;
}

export interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  quantity_available?: number;
  event: string;
  sales_start?: string;
  sales_end?: string;
  is_visible?: boolean;
  max_per_order?: number;
  min_per_order?: number;
}

export interface TicketPurchase {
  id: string;
  event: Event;
  ticket_type: TicketType;
  quantity: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  qr_code?: string;
  created_at: string;
}

// ============================================
// PAYMENT TYPES
// ============================================

export type PaymentMethod = 'momo' | 'om' | 'mtn_money' | 'orange_money' | 'bank_transfer' | 'card' | 'paypal' | 'transfer';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  registration: string;
  event: Event | string;
  amount: number;
  currency?: string;
  payment_method: PaymentMethod;
  method?: PaymentMethod; // Alias
  payment_status: PaymentStatus;
  status?: PaymentStatus; // Alias
  transaction_id?: string;
  reference?: string;
  created_at: string;
  updated_at: string;
  payment_date?: string;
  invoice?: string;
  phone_number?: string;
  payer_name?: string;
  payer_email?: string;
}

export interface PaymentInitiation {
  registration_id: string;
  payment_method: PaymentMethod;
  phone_number?: string;
  return_url?: string;
}

export interface PaymentVerification {
  payment_id: string;
  status: PaymentStatus;
  transaction_id?: string;
  message?: string;
}

export interface Invoice {
  id: string;
  payment: string;
  invoice_number: string;
  pdf_url?: string;
  created_at: string;
}

// ============================================
// MESSAGING TYPES
// ============================================

export interface Conversation {
  id: string;
  participants: User[];
  conversation_type: 'direct' | 'group' | 'event';
  name?: string;
  title?: string;
  avatar?: string;
  last_message?: Message;
  last_message_at?: string;
  event?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation: string;
  sender: User;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'voice';
  attachments?: MessageAttachment[];
  is_read: boolean;
  read_by?: string[];
  reactions?: MessageReaction[];
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  id: string;
  file: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  attachment_type: 'image' | 'document' | 'voice' | 'video' | 'other';
  thumbnail?: string;
}

export interface MessageReaction {
  id: string;
  user: string;
  emoji: string;
  created_at: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'event' | 'registration' | 'payment' | 'message';

export interface Notification {
  id: string;
  user: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  created_at: string;
  link?: string;
  event?: Event;
  related_object_id?: string;
  related_object_type?: string;
  data?: Record<string, any>;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  event_updates: boolean;
  registration_updates: boolean;
  payment_updates: boolean;
  marketing_emails: boolean;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface AnalyticsDashboardSummary {
  event_summary?: {
    total_events: number;
    active_events: number;
    completed_events: number;
    total_views: number;
    events_by_category?: Array<{ name: string; value: number }>;
    upcoming_events?: number;
    ongoing_events?: number;
    avg_fill_rate?: number;
  };
  registration_summary?: {
    total_registrations: number;
    confirmed_registrations: number;
    pending_registrations: number;
    cancelled_registrations: number;
    summary?: any;
    registrations_over_time?: Array<{ date: string; count: number }>;
  };
  revenue_summary?: {
    total_revenue: number;
    pending_revenue: number;
    refunded_revenue: number;
    avg_transaction?: number;
    revenue_over_time?: Array<{ date: string; amount: number }>;
  };
}

export interface EventAnalytics {
  event_id: string;
  views: number;
  registrations: number;
  revenue: number;
  conversion_rate: number;
  views_over_time: Array<{ date: string; count: number }>;
  registrations_over_time: Array<{ date: string; count: number }>;
  traffic_sources: Array<{ source: string; count: number }>;
}

// ============================================
// FEEDBACK TYPES
// ============================================

export interface Feedback {
  id: string;
  user: User | string;
  event: Event | string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at?: string;
  is_verified: boolean;
  is_approved?: boolean;
  is_featured?: boolean;
  user_name?: string;
  user_avatar?: string;
}

export interface FeedbackStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// ============================================
// SUBSCRIPTION & PLAN TYPES
// ============================================

export type PlanName = 'free' | 'essential' | 'premium';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'past_due';
export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  display_name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  max_participants_per_event: number;
  max_active_events: number;
  features: string[];
  is_active: boolean;
  is_popular?: boolean;
}

export interface OrganizerSubscription {
  id: string;
  organizer: string;
  plan: SubscriptionPlan;
  plan_details?: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  start_date: string;
  end_date?: string;
  trial_end_date?: string;
  next_billing_date?: string;
  auto_renew: boolean;
  payment_method?: string;
  is_active: boolean;
  current_price: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// WALLET & PAYOUT TYPES
// ============================================

export type PayoutMethod = 'bank_transfer' | 'mtn_money' | 'orange_money';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TransactionType = 'credit' | 'debit' | 'fee' | 'refund' | 'adjustment';

export interface OrganizerWallet {
  id: string;
  organizer: string;
  available_balance: number;
  pending_balance: number;
  total_earnings: number;
  total_withdrawn: number;
  total_fees: number;
  currency: string;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  mobile_money_number?: string;
  mobile_money_provider?: string;
  minimum_payout: number;
  recent_transactions?: WalletTransaction[];
  can_withdraw: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  transaction_type: TransactionType;
  amount: number;
  balance_after: number;
  description: string;
  reference?: string;
  event?: string;
  event_title?: string;
  payment?: string;
  created_at: string;
}

export interface Payout {
  id: string;
  wallet: string;
  organizer_email?: string;
  amount: number;
  currency: string;
  payout_method: PayoutMethod;
  status: PayoutStatus;
  destination_account: string;
  destination_name: string;
  destination_bank?: string;
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  transaction_reference?: string;
  notes?: string;
  failure_reason?: string;
}

export interface PendingEarning {
  id: string;
  wallet: string;
  event: string;
  event_title?: string;
  payment: string;
  amount: number;
  release_date: string;
  is_released: boolean;
  released_at?: string;
  days_until_release: number;
  created_at: string;
}

export interface PlatformCommission {
  id: string;
  payment: string;
  ticket_price: number;
  commission_rate: number;
  commission_amount: number;
  fixed_fee: number;
  total_fee: number;
  organizer_amount: number;
  event: string;
  event_title?: string;
  organizer: string;
  organizer_email?: string;
  created_at: string;
}

export interface WalletStats {
  available_balance: number;
  pending_balance: number;
  total_earnings: number;
  total_withdrawn: number;
  total_fees: number;
  monthly_earnings: Array<{ month: string; total: number }>;
}

// ============================================
// SESSION & AGENDA TYPES
// ============================================

export interface Track {
  id: string;
  event: string;
  name: string;
  description?: string;
  color?: string;
  order: number;
  sessions?: Session[];
}

export interface Speaker {
  id: string;
  event: string;
  name: string;
  title?: string;
  bio?: string;
  photo?: string;
  company?: string;
  email?: string;
  website?: string;
  social_links?: {
    twitter?: string;
    linkedin?: string;
  };
}

export interface Session {
  id: string;
  event: string;
  track?: Track;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  speakers?: Speaker[];
  max_participants?: number;
  current_participants?: number;
  is_registered?: boolean;
  requires_registration: boolean;
  registration_deadline?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface SessionRegistration {
  id: string;
  session: string;
  user: string;
  status: 'registered' | 'attended' | 'cancelled';
  registered_at: string;
  attended_at?: string;
}

// ============================================
// WAITLIST TYPES
// ============================================

export interface WaitlistEntry {
  id: string;
  event: string;
  user: string;
  ticket_type?: string;
  position: number;
  status: 'waiting' | 'notified' | 'converted' | 'expired';
  notification_sent_at?: string;
  expires_at?: string;
  created_at: string;
}

// ============================================
// DISCOUNT TYPES
// ============================================

export interface Discount {
  id: string;
  event: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  max_uses?: number;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  min_purchase_amount?: number;
  applicable_ticket_types?: string[];
}

// ============================================
// FORM TYPES
// ============================================

export type FieldType = 'text' | 'email' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date' | 'phone' | 'url' | 'file';

export interface FormField {
  id: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  placeholder?: string;
  help_text?: string;
  options?: string[];
  order: number;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// ============================================
// MAP TYPES
// ============================================

export interface MapMarker {
  id: string;
  title: string;
  lat: number;
  lng: number;
  location_name: string;
  location_city: string;
  start_date: string;
  category: string | null;
  banner_image: string | null;
  registration_count: number;
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  country?: string;
  locationName?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, string[]>;
}

// ============================================
// MODERATION TYPES
// ============================================

export interface Flag {
  id: string;
  event: string;
  reporter: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
}

export interface Validation {
  id: string;
  event: Event;
  validator?: User;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
  validated_at?: string;
}

// ============================================
// AUDIT TYPES
// ============================================

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================
// NAVIGATION TYPES
// ============================================

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  EventDetails: { eventId: string };
  TicketPurchase: { eventId: string; ticketTypeId?: string };
  Payment: { registrationId: string };
  PaymentSuccess: { paymentId: string };
  PaymentFailed: { paymentId?: string; error?: string };
  QRCode: { ticketId: string };
  Profile: { userId?: string };
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  UserDashboard: undefined;
  Messages: undefined;
  Conversation: { conversationId: string };
  NewConversation: { userId?: string };
  Map: { eventId?: string };
  EventCreate: undefined;
  EventEdit: { eventId: string };
  MyEvents: undefined;
  EventAnalytics: { eventId: string };
  EventRegistrations: { eventId: string };
  SessionDetails: { sessionId: string };
  SpeakerDetails: { speakerId: string };
  OrganizerProfile: { organizerId: string };
  Wallet: undefined;
  PayoutRequest: undefined;
  Subscription: undefined;
  QRScanner: { eventId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { email: string };
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  MyTickets: undefined;
  Dashboard: undefined;
  Profile: undefined;
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  MyEvents: undefined;
  EventCreate: undefined;
  EventEdit: { eventId: string };
  EventAnalytics: { eventId: string };
  EventRegistrations: { eventId: string };
  Wallet: undefined;
  PayoutRequest: undefined;
  Subscription: undefined;
  Settings: undefined;
};

// ============================================
// UTILITY TYPES
// ============================================

export type SortOrder = 'asc' | 'desc';

export interface FilterParams {
  search?: string;
  category?: number;
  location_city?: string;
  start_date_after?: string;
  start_date_before?: string;
  is_free?: boolean;
  event_type?: 'billetterie' | 'inscription';
  status?: string;
  ordering?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// ============================================
// UI COMPONENT TYPES
// ============================================

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface TabItem {
  key: string;
  label: string;
  icon?: string;
  badge?: number;
}

export interface ActionSheetOption {
  label: string;
  icon?: string;
  destructive?: boolean;
  onPress: () => void;
}
