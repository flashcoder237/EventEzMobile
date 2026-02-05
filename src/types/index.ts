// ============================================
// Types principaux pour l'application EventEz Mobile
// Synchronisé avec les modèles Django backend
// ============================================

// Types de lieu pour les événements
export type LocationType = 'in_person' | 'online' | 'hybrid';

// Rôles utilisateur (accounts.User.ROLE_CHOICES)
export type UserRole = 'user' | 'organizer' | 'moderator' | 'admin';

// Types d'organisateur (accounts.User.TYPE_CHOICES)
export type OrganizerType = 'individual' | 'organization';

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
  phone?: string; // Alias pour compatibilité backend
  role?: UserRole;
  organizer_type?: OrganizerType;
  // Alias pour compatibilité
  user_type?: OrganizerType;
  // Champs pour organisateurs de type organisation
  company_name?: string;
  registration_number?: string;
  // Médias
  profile_picture?: string;
  image?: string; // Alias
  logo_url?: string; // Alias
  verification_documents?: string;
  // Facturation
  billing_address?: string;
  tax_id?: string;
  // Vérification
  is_verified?: boolean;
  // Paramètres de notification
  email_notifications?: boolean;
  push_notifications?: boolean;
  sms_notifications?: boolean;
  // Préférences
  language?: string;
  timezone?: string;
  theme?: string;
  // Relations
  organizer_name?: string;
  organizer_profile?: OrganizerProfile;
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

export interface OrganizerProfile {
  id: string;
  user: string;
  description?: string;
  // Alias pour compatibilité
  company_description?: string;
  logo?: string;
  website?: string;
  // Statut
  verified_status: boolean;
  // Alias pour compatibilité
  verified?: boolean;
  // Statistiques
  rating: number;
  event_count: number;
  // Social links (extension frontend)
  social_links?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  // Relations
  subscription?: OrganizerSubscription;
  // Métadonnées
  created_at?: string;
  updated_at?: string;
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

// Statuts d'événement (events.Event.STATUS_CHOICES)
export type EventStatus = 'draft' | 'submitted' | 'validated' | 'rejected' | 'completed' | 'cancelled';

// Types d'événement (events.Event.TYPE_CHOICES)
export type EventType = 'billetterie' | 'inscription';

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  registration_deadline?: string;
  // Alias pour compatibilité UI
  start_time?: string;
  end_time?: string;
  // Type de lieu
  location_type: LocationType;
  location_type_display?: string;
  // Lieu physique (pour présentiel et hybride)
  location_name?: string;
  location_address?: string;
  location_city?: string;
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
  display_image?: string; // Alias frontend
  gallery_images?: EventImage[];
  // Relations
  category?: Category;
  organizer: User;
  created_by?: User;
  organizer_name?: string;
  tags?: Tag[];
  // État (STATUS_CHOICES du backend)
  status: EventStatus;
  is_featured: boolean;
  // Validation tracking
  validated_by?: User;
  validated_at?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  // SEO
  seo_title?: string;
  seo_description?: string;
  // Statistiques
  view_count: number;
  registration_count: number;
  registrations_count?: number; // Alias
  // Métriques formulaires personnalisés
  form_storage_usage?: number;
  form_active_days?: number;
  // Gestion des inscriptions
  auto_approve_registrations?: boolean;
  max_participants?: number;
  // Note: Le backend utilise 'max_participants', pas 'max_capacity'
  // Prix (calculés)
  is_free?: boolean;
  base_price?: number;
  min_price?: number;
  max_price?: number;
  ticket_price_range?: string;
  // Relations étendues
  form_fields?: FormField[];
  ticket_types?: TicketType[];
  sessions?: Session[];
  feedbacks?: Feedback[];
  tracks?: Track[];
  speakers?: Speaker[];
  // Métadonnées
  created_at: string;
  updated_at: string;
  // UI helpers (calculés côté frontend/API)
  is_following?: boolean;
  distance_km?: number;
}

// EventImage (events.EventImage)
export interface EventImage {
  id: string;
  image: string;
  caption?: string;
  // Extension frontend
  order?: number;
}

// Category (events.EventCategory)
export interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
  default_event_image?: string;
  is_active?: boolean;
  created_by?: number;
  created_by_name?: string;
  // Extension frontend
  icon?: string;
  event_count?: number;
  events_count?: number;
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

// Alias for backward compatibility
export type EventCategory = Category;

// Tag (events.EventTag)
export interface Tag {
  id: number;
  name: string;
  // Extension frontend
  slug?: string;
}

// Alias for backward compatibility
export type EventTag = Tag;

// EventFollow (events.EventFollow)
export interface EventFollow {
  id: string;
  user: string;
  event: string;
  notification_preference: 'all' | 'important' | 'none';
  notify_email: boolean;
  notify_push: boolean;
  notify_updates: boolean;
  notify_reminders: boolean;
  notify_cancellation: boolean;
  created_at: string;
}

// ============================================
// REGISTRATION & TICKET TYPES
// ============================================

// Statuts d'inscription (registrations.Registration.STATUS_CHOICES)
export type RegistrationStatus = 'pending' | 'pending_approval' | 'confirmed' | 'cancelled' | 'rejected' | 'completed' | 'checked_in';

// Statuts d'approbation (registrations.Registration.APPROVAL_STATUS_CHOICES)
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export interface Registration {
  id: string;
  event: Event | string; // Can be full Event object or just UUID string
  user: User;
  // Informations de base
  registration_type?: EventType;
  status: RegistrationStatus;
  // Approbation par l'organisateur
  approval_status?: ApprovalStatus;
  approved_by?: string | User;
  approved_by_name?: string;
  approval_note?: string;
  approval_date?: string;
  // Paiement
  payment?: string;
  payment_required?: boolean;
  // Alias pour compatibilité
  requires_payment?: boolean;
  payment_deadline?: string;
  // Suivi du temps
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  checked_in_at?: string;
  // Métriques pour tarification formulaires
  form_data_size?: number;
  // Référence unique
  reference_code: string;
  // Données formulaire personnalisé
  form_data?: Record<string, any>;
  custom_fields?: Record<string, any>; // Alias
  // Relations
  tickets?: TicketPurchase[];
  // UI helpers
  user_name?: string;
  user_email?: string;
  event_detail?: Event;
  userInfo?: User;
  qr_code?: string;
  is_checked_in?: boolean;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
}

// TicketType (registrations.TicketType)
export interface TicketType {
  id: string;
  event: string;
  name: string;
  description?: string;
  price: number;
  // Quotas et disponibilité
  quantity_total: number;
  quantity_sold: number;
  quantity_available?: number; // Calculé côté backend
  available_quantity?: number; // Alias pour compatibilité
  // Période de vente
  sales_start: string;
  sales_end: string;
  // Options
  is_visible?: boolean;
  max_per_order?: number;
  min_per_order?: number;
  // Sessions incluses avec ce type de billet
  included_sessions?: string[];
}

// TicketPurchase (registrations.TicketPurchase)
export interface TicketPurchase {
  id: string;
  registration: string;
  registration_id?: string;
  ticket_type: TicketType | string;
  quantity: number;
  unit_price: number;
  discount_code?: string;
  discount_amount?: number;
  total_price: number;
  // QR code et validation
  qr_code?: string;
  is_checked_in?: boolean;
  checked_in_at?: string;
  // UI helpers
  ticket_type_name?: string;
  attendee_name?: string;
  attendee_email?: string;
  // Event info (may be expanded from backend)
  event?: {
    id: string;
    title: string;
    start_date?: string;
    end_date?: string;
    location_name?: string;
    location_city?: string;
    location_address?: string;
    banner_image?: string;
  } | string;
  event_id?: string;
  event_title?: string;
  // Status (from registration)
  status?: string;
  registration_status?: string;
  payment_status?: string;
  payment_required?: boolean;
}

// Alias pour compatibilité - Ticket représente un TicketPurchase
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

// Discount (registrations.Discount)
export interface Discount {
  id: string;
  event: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  // Validité
  valid_from: string;
  valid_until: string;
  max_uses?: number;
  times_used: number;
  // Alias pour compatibilité
  current_uses?: number;
  // Restrictions
  applicable_ticket_types?: string[];
  // UI helpers
  is_active?: boolean;
  min_purchase_amount?: number;
}

// ============================================
// PAYMENT TYPES
// ============================================

// Méthodes de paiement (payments.Payment.PAYMENT_METHOD_CHOICES)
export type PaymentMethod = 'mtn_money' | 'orange_money' | 'credit_card' | 'paypal' | 'bank_transfer';
// Alias pour compatibilité UI
export type PaymentMethodAlias = PaymentMethod | 'momo' | 'om' | 'card' | 'transfer';

// Statuts de paiement (payments.Payment.PAYMENT_STATUS_CHOICES)
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface Payment {
  id: string;
  registration: string;
  user: string;
  // Informations financières
  amount: number;
  currency?: string;
  payment_method: PaymentMethod | PaymentMethodAlias;
  method?: PaymentMethod; // Alias
  // Statut et suivi
  status: PaymentStatus;
  payment_status?: PaymentStatus; // Alias
  transaction_id?: string;
  payment_date?: string;
  // Suivi de la transaction
  created_at: string;
  updated_at: string;
  // Informations de facturation
  billing_name?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_address?: string;
  // Pour les formulaires personnalisés (facturation basée sur l'usage)
  is_usage_based?: boolean;
  storage_amount?: number;
  duration_days?: number;
  // Données de transaction externes
  payment_gateway_response?: Record<string, any>;
  // UI helpers
  event?: Event | string;
  reference?: string;
  invoice?: string;
  phone_number?: string;
  payer_name?: string;
  payer_email?: string;
}

export interface PaymentInitiation {
  registration_id: string;
  payment_method: PaymentMethod | PaymentMethodAlias;
  phone_number?: string;
  return_url?: string;
}

export interface PaymentVerification {
  payment_id: string;
  status: PaymentStatus;
  transaction_id?: string;
  message?: string;
}

// Refund (payments.Refund)
export type RefundStatus = 'requested' | 'processing' | 'completed' | 'rejected';

export interface Refund {
  id: string;
  payment: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  transaction_id?: string;
  notes?: string;
}

// Invoice (payments.Invoice)
export interface Invoice {
  id: string;
  payment: string;
  invoice_number: string;
  generated_at: string;
  due_date?: string;
  // Pour les paiements basés sur l'usage
  billing_period_start?: string;
  billing_period_end?: string;
  pdf_file?: string;
  // Alias pour compatibilité
  pdf_url?: string;
  created_at?: string;
}

// ============================================
// MESSAGING TYPES
// Synchronisé avec EventEzBackend/apps/user_messages/models.py
// ============================================

export interface Conversation {
  id: string;
  participants: User[];
  participant_ids?: number[];
  conversation_type: 'direct' | 'group' | 'event';
  name?: string;
  title?: string; // Alias pour compatibilité
  avatar?: string;
  last_message?: Message;
  last_message_at?: string;
  event?: string | Event;
  is_archived: boolean;
  is_starred: boolean;
  unread_count: number;
  user_messages?: Message[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation: string | number;
  sender: number; // ID utilisateur
  sender_name: string;
  sender_avatar?: string;
  content: string;
  attachments?: MessageAttachment[];
  read_by: number[]; // Liste des IDs des utilisateurs qui ont lu
  reply_to?: string | Message;
  is_starred: boolean;
  reactions?: MessageReaction[];
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  file: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  attachment_type: 'image' | 'document' | 'voice' | 'video' | 'other';
  thumbnail?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  waveform_data?: number[];
  uploaded_at: string;
}

export interface MessageReaction {
  id: string;
  user: number;
  user_name: string;
  emoji: string;
  created_at: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

// Types de notification synchronisés avec le backend (notifications.models.Notification.NOTIFICATION_TYPE_CHOICES)
export type NotificationType =
  | 'event_update'
  | 'event_revalidation'
  | 'registration_confirmation'
  | 'payment_confirmation'
  | 'event_reminder'
  | 'system_message'
  | 'custom_message'
  | 'feature_request'
  | 'general';

// Type de canal de notification
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

export interface Notification {
  id: string;
  user: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  channel?: NotificationChannel;
  is_read: boolean;
  is_sent?: boolean;
  created_at: string;
  scheduled_for?: string;
  sent_at?: string;
  read_at?: string;
  link?: string;
  event?: Event;
  related_object_id?: string;
  related_object_type?: 'event' | 'registration' | 'payment' | string;
  extra_data?: Record<string, any>;
  // Alias pour compatibilité avec l'ancien code
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

// EventFeedback (feedback.EventFeedback)
export interface Feedback {
  id: string;
  event: Event | string;
  user: User | string;
  // Évaluation (1-5)
  rating: number;
  comment?: string;
  // Horodatage
  created_at: string;
  updated_at?: string;
  // Statut de modération
  is_approved?: boolean;
  is_featured?: boolean;
  // UI helpers
  is_verified?: boolean;
  user_name?: string;
  user_avatar?: string;
}

// Alias pour compatibilité
export type EventFeedback = Feedback;

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

// Track (events.agenda_models.Track)
export interface Track {
  id: string;
  event: string;
  name: string;
  description?: string;
  color?: string;
  order: number;
  created_at?: string;
  updated_at?: string;
  // Relations
  sessions?: Session[];
}

// Speaker (events.agenda_models.Speaker)
export interface Speaker {
  id: string;
  event: string;
  // Informations personnelles
  first_name: string;
  last_name: string;
  title?: string;
  company?: string;
  bio?: string;
  // Contact
  email?: string;
  phone?: string;
  // Social & Web
  website?: string;
  linkedin?: string;
  twitter?: string;
  // Média
  photo?: string;
  // Lien utilisateur (optionnel)
  user?: string;
  // Metadata
  is_featured?: boolean;
  order?: number;
  created_at?: string;
  updated_at?: string;
  // UI helpers (calculés)
  name?: string;
  full_name?: string;
  display_name?: string;
  social_links?: {
    twitter?: string;
    linkedin?: string;
  };
}

// Types de session (events.agenda_models.Session.SESSION_TYPE_CHOICES)
export type SessionType = 'keynote' | 'talk' | 'panel' | 'workshop' | 'networking' | 'break' | 'lunch' | 'other';

// Niveaux de session
export type SessionLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';

// Session (events.agenda_models.Session)
export interface Session {
  id: string;
  event: string;
  track?: Track | string;
  // Informations de base
  title: string;
  description?: string;
  session_type: SessionType;
  // Horaires
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  // Localisation
  location?: string;
  room?: string;
  is_virtual?: boolean;
  virtual_link?: string;
  // Speakers
  speakers?: Speaker[];
  speakers_detail?: { id: string; full_name: string; title?: string; company?: string; photo?: string }[];
  moderator?: Speaker | string;
  moderator_detail?: { id: string; full_name: string; title?: string; company?: string; photo?: string };
  track_detail?: { id: string; name: string; color?: string };
  // Capacité et inscription
  max_capacity?: number;
  max_participants?: number; // Alias
  requires_registration: boolean;
  registration_count?: number;
  current_participants?: number; // Alias
  // Contenu
  slides_url?: string;
  recording_url?: string;
  resources?: any[];
  // Metadata
  is_featured?: boolean;
  tags?: string[];
  level?: SessionLevel;
  language?: string;
  created_at?: string;
  updated_at?: string;
  // UI helpers
  is_registered?: boolean;
  registration_deadline?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

// SessionRegistration (events.agenda_models.SessionRegistration)
export interface SessionRegistration {
  id: string;
  session: string;
  user: string;
  // Participation
  registered_at: string;
  attended: boolean;
  attended_at?: string;
  // Feedback
  rating?: number;
  feedback?: string;
  // UI helpers
  status?: 'registered' | 'attended' | 'cancelled';
}

// SessionResource (events.agenda_models.SessionResource)
export type ResourceType = 'slides' | 'document' | 'video' | 'link' | 'code' | 'other';

export interface SessionResource {
  id: string;
  session: string;
  title: string;
  description?: string;
  resource_type: ResourceType;
  file?: string;
  url?: string;
  is_public: boolean;
  download_count?: number;
  created_at?: string;
  updated_at?: string;
}

// SessionWaitlist (events.agenda_models.SessionWaitlist)
export type SessionWaitlistStatus = 'waiting' | 'notified' | 'registered' | 'expired' | 'cancelled';

export interface SessionWaitlist {
  id: string;
  session: string;
  user: string;
  status: SessionWaitlistStatus;
  position: number;
  priority?: number;
  created_at: string;
  notified_at?: string;
  expires_at?: string;
}

// ============================================
// WAITLIST TYPES (registrations.waitlist_models)
// ============================================

export type WaitlistStatus = 'waiting' | 'notified' | 'converted' | 'expired' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  event: string;
  user: string;
  ticket_type?: string;
  position: number;
  priority?: number;
  status: WaitlistStatus;
  notification_sent_at?: string;
  notified_at?: string;
  expires_at?: string;
  created_at: string;
}

// ============================================
// FORM TYPES
// ============================================

// Types de champs (events.CustomFormField.FIELD_TYPES)
export type FieldType = 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'time' | 'select' | 'checkbox' | 'radio' | 'file';
// Alias pour compatibilité UI (url n'existe pas dans backend)
export type ExtendedFieldType = FieldType | 'url';

// CustomFormField (events.CustomFormField)
export interface FormField {
  id: string;
  event?: string;
  label: string;
  field_type: FieldType | ExtendedFieldType;
  required: boolean;
  placeholder?: string;
  help_text?: string;
  options?: string | string[]; // Options séparées par des virgules ou tableau
  order: number;
  // Support multi-étapes pour les formulaires longs
  step?: number;
  step_title?: string;
  // Extension frontend
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Alias pour compatibilité
export type CustomFormField = FormField;

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
  // Filter fields
  event_type?: 'billetterie' | 'inscription';
  location_type?: 'in_person' | 'online' | 'hybrid';
  is_free?: boolean;
  price?: number;
  min_price?: number;
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

// Raisons de signalement (feedback.EventFlag.FLAG_REASON_CHOICES)
export type FlagReason = 'inappropriate' | 'misleading' | 'scam' | 'duplicate' | 'other';

// EventFlag (feedback.EventFlag)
export interface Flag {
  id: string;
  event: string;
  user: string;
  // Alias pour compatibilité
  reporter?: string;
  reason: FlagReason;
  description?: string;
  created_at: string;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  // Alias pour compatibilité
  resolution_note?: string;
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

// Alias pour compatibilité
export type EventFlag = Flag;

// EventValidation (feedback.EventValidation)
export interface Validation {
  id: string;
  event: Event | string;
  user: User | string;
  // Alias pour compatibilité
  validator?: User;
  created_at: string;
  notes?: string;
  // UI helpers (calculés depuis Event.status)
  status?: 'pending' | 'approved' | 'rejected';
  validated_at?: string;
}

// Alias pour compatibilité
export type EventValidation = Validation;

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
  TicketPurchase: {
    eventId: string;
    ticketTypeId?: string;
    registrationId?: string;  // Pour modifier une inscription en attente
    additionalTickets?: boolean;  // Pour acheter des billets supplémentaires
  };
  Payment: {
    registrationId: string;
    // Pour les billets supplémentaires: passer les nouveaux billets à payer
    newTickets?: Array<{
      id: string;
      ticket_type_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    totalAmount?: number;
  };
  PaymentSuccess: {
    paymentId: string;
    registrationId?: string;
    eventType?: 'billetterie' | 'inscription';
    registrationStatus?: string;
    approvalStatus?: string;
    eventTitle?: string;
  };
  PaymentFailed: { paymentId?: string; error?: string };
  QRCode: { ticketId: string };
  RegistrationDetails: { registrationId: string };
  Profile: { userId?: string };
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  UserDashboard: undefined;
  Messages: undefined;
  Conversation: { conversationId?: string; userId?: string; userName?: string };
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
  Terms: undefined;
  Privacy: undefined;
  Moderation: undefined;
  MyPayments: undefined;
  RefundRequest: { paymentId: string };
  BecomeOrganizer: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  RegisterOrganizer: undefined;
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
