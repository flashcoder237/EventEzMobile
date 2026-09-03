// ============================================
// Types principaux pour l'application EventEz Mobile
// Synchronise avec les modeles Django backend
// Derniere verification : 2026-03-02
// ============================================

// Types de lieu pour les evenements
export type LocationType = 'in_person' | 'online' | 'hybrid';

// Roles utilisateur (accounts.User.ROLE_CHOICES)
export type UserRole = 'user' | 'organizer' | 'moderator' | 'admin';

// Types d'organisateur (accounts.User.TYPE_CHOICES)
export type OrganizerType = 'individual' | 'organization';

// Fournisseurs d'authentification (accounts.User.AUTH_PROVIDER_CHOICES)
export type AuthProvider = 'email' | 'google' | 'apple' | 'phone';

// ============================================
// USER & AUTHENTICATION TYPES
// ============================================

export interface User {
  id: string | number; // Backend: AutoField (integer)
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role?: UserRole;
  organizer_type?: OrganizerType;
  // Champs pour organisateurs de type organisation
  company_name?: string;
  registration_number?: string;
  // Medias
  profile_picture?: string;
  verification_documents?: string;
  // Facturation
  billing_address?: string;
  // Verification
  is_verified?: boolean;
  email_verified?: boolean;
  // Compte invité — créé via guest checkout sur un event gratuit, sans mot
  // de passe. Upgradable via authAPI.upgradeGuest().
  is_guest?: boolean;
  // Privacy : si false, l'utilisateur n'apparaît pas dans la section
  // "Qui y va ?" des pages event (sa registration reste comptée dans
  // registration_count, mais son avatar/prénom n'est pas exposé).
  // Opt-out — par défaut visible.
  show_in_attendees?: boolean;
  // Privacy : si false, les messages envoyés par cet utilisateur ne
  // déclenchent plus de read receipt (✓✓ bleu) côté backend.
  show_read_receipts?: boolean;
  // Authentification sociale
  auth_provider?: AuthProvider;
  // False pour les comptes Google/Apple/téléphone (pas de mot de passe
  // utilisable). Détermine le mode de confirmation à la suppression de compte.
  has_password?: boolean;
  // Parametres de notification
  email_notifications?: boolean;
  push_notifications?: boolean;
  sms_notifications?: boolean;
  // Preferences
  language?: string;
  timezone?: string;
  theme?: string;
  // Relations
  organizer_profile?: OrganizerProfile;
  // Statistiques (SerializerMethodField)
  followers_count?: number;
  following_count?: number;
  // Champs exposés par UserBasicSerializer côté messagerie (header conv).
  // `is_organizer_verified` = raccourci pour organizer_profile?.verified_status,
  // calculé serveur-side pour éviter d'avoir à serializer le profile complet
  // dans chaque participant.
  is_organizer_verified?: boolean;
  /** ISO timestamp, ou null si user opt-out via presence_visible=false. */
  last_seen?: string | null;
  /** 'online' | 'away' | 'offline'. */
  presence_status?: 'online' | 'away' | 'offline';
  // Django built-in fields
  is_active?: boolean; // Django User.is_active
  date_joined?: string; // Django User.date_joined
  // --- Client-side aliases (non renvoyes par le backend) ---
  phone?: string; // Alias client pour phone_number
  user_type?: OrganizerType; // Alias client pour organizer_type
  image?: string; // Alias client pour profile_picture
  logo_url?: string; // Alias client pour profile_picture
  organizer_name?: string; // Calcule cote client
  // Champs profil universels — désormais persistés côté backend (User model).
  date_of_birth?: string;
  bio?: string;
  city?: string;
  country?: string;
  // `address` n'existe pas côté backend — utiliser `billing_address` ci-dessus.
  // Conservé en alias optionnel pour compat ascendante d'éventuels callers.
  address?: string;
  tax_id?: string; // Client-only
  created_at?: string; // Client-only (pas dans UserSerializer)
  updated_at?: string; // Client-only (pas dans UserSerializer)
}

export interface OrganizerProfile {
  id: string | number; // Backend: AutoField (integer)
  user: string | number;
  description?: string;
  logo?: string;
  website?: string;
  // Statut
  verified_status: boolean;
  // Statistiques
  rating: number;
  event_count: number;
  // ONG
  is_nonprofit?: boolean;
  // --- Client-side aliases (non renvoyes par le backend) ---
  company_description?: string; // Alias client pour description
  verified?: boolean; // Alias client pour verified_status
  social_links?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  }; // Client-only
  subscription?: OrganizerSubscription; // Client-only (pas dans OrganizerProfileSerializer)
  created_at?: string; // Client-only
  updated_at?: string; // Client-only
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

// Statuts d'evenement (events.Event.STATUS_CHOICES)
export type EventStatus = 'draft' | 'submitted' | 'changes_requested' | 'validated' | 'rejected' | 'completed' | 'cancelled';

// Types d'evenement (events.Event.TYPE_CHOICES)
export type EventType = 'billetterie' | 'inscription';

export interface Event {
  id: string; // UUID
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  event_type: EventType;
  attendee_form_scope?: 'order' | 'per_attendee';
  start_date: string;
  end_date: string;
  registration_deadline?: string;
  // Type de lieu
  location_type: LocationType;
  location_type_display?: string; // SerializerMethodField
  // Lieu physique (pour presentiel et hybride)
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
  // Medias
  banner_image?: string;
  banner_placeholder?: string; // Data URI JPEG blurre (LQIP) pour chargement progressif
  display_image?: string; // SerializerMethodField
  display_placeholder?: string; // LQIP correspondant a display_image
  cover_video?: string | null; // URL absolue de la video uploadee
  cover_video_url?: string; // URL externe (YouTube/Vimeo) brute
  cover_video_embed?: string; // URL embed prete pour iframe/WebView (genere serveur)
  gallery_images?: EventImage[];
  // Relations
  category?: Category;
  organizer: User;
  created_by?: User;
  organizer_name?: string; // SerializerMethodField
  tags?: Tag[];
  // Etat (STATUS_CHOICES du backend)
  status: EventStatus;
  is_featured: boolean;
  // Validation tracking
  validated_by?: User;
  validated_at?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  /** Texte du modérateur quand status='changes_requested', visible côté organizer */
  moderator_notes?: string;
  // SEO
  seo_title?: string;
  seo_description?: string;
  // Statistiques
  view_count: number;
  registration_count: number;
  // Recent attendees (5 derniers, opt-in only) — exposé par EventDetailSerializer.
  // Champs minimaux pour respecter la privacy : id + first_name + photo.
  recent_registrants?: Array<{
    id: number | string;
    first_name: string;
    profile_picture: string | null;
  }>;
  // Nombre total d'inscrits qui ont opt-in à apparaître publiquement.
  // Distinct de registration_count qui inclut les opt-out.
  visible_attendees_count?: number;
  // Metriques formulaires personnalises
  form_storage_usage?: number;
  form_active_days?: number;
  // Gestion des inscriptions
  auto_approve_registrations?: boolean;
  fee_bearer?: 'participant' | 'organizer';
  max_participants?: number;
  // Prix (SerializerMethodField)
  ticket_price_range?: string;
  // Relations etendues (EventDetailSerializer)
  form_fields?: FormField[];
  ticket_types?: TicketType[];
  feedbacks?: Feedback[];
  // Visibilite
  visibility?: 'public' | 'unlisted' | 'invite_only';
  access_code?: string;
  has_access_code?: boolean; // SerializerMethodField
  user_has_access?: boolean; // SerializerMethodField
  // Recurrence
  is_recurring?: boolean;
  parent_event?: string | null;
  // Événement externe (curation cold-start) : CTA redirige vers source_url.
  is_external?: boolean;
  source_url?: string;
  source_name?: string;
  // Moderation IA
  ai_moderation_result?: Record<string, any> | null;
  moderated_by?: string;
  // Champs supplementaires du serializer
  currency?: string; // SerializerMethodField
  location_country_code?: string; // SerializerMethodField
  average_rating?: number; // SerializerMethodField (EventDetailSerializer)
  feedback_count?: number; // SerializerMethodField (EventDetailSerializer)
  // Metadonnees
  created_at: string;
  updated_at: string;
  // --- Client-side aliases (non renvoyes par le backend) ---
  start_time?: string; // Alias client pour start_date
  end_time?: string; // Alias client pour end_date
  registrations_count?: number; // Alias client pour registration_count
  is_free?: boolean; // Client-only (calcule)
  base_price?: number; // Client-only (calcule)
  min_price?: number; // Client-only (calcule)
  max_price?: number; // Client-only (calcule)
  sessions?: Session[]; // Client-side (endpoint separe)
  tracks?: Track[]; // Client-side (endpoint separe)
  speakers?: Speaker[]; // Client-side (endpoint separe)
  requires_access_code?: boolean; // Client-only
  is_following?: boolean; // Client-only
  distance_km?: number; // Client-only (calcule)
}

// EventImage (events.EventImage)
export interface EventImage {
  id: string | number; // Backend: AutoField (integer)
  image: string;
  image_placeholder?: string;
  caption?: string;
  // --- Client-side ---
  order?: number; // Client-only
}

// Category (events.EventCategory)
export interface Category {
  id: number;
  slug?: string; // Identifiant stable utilisé comme clé i18n côté client (ex: 'musique', 'tech')
  name: string; // Localisé par le backend selon Accept-Language
  description?: string; // Localisé par le backend
  image?: string;
  image_placeholder?: string;
  default_event_image?: string;
  default_event_image_placeholder?: string;
  event_count?: number; // SerializerMethodField
  // Admin serializer only
  is_active?: boolean;
  name_fr?: string;
  name_en?: string;
  description_fr?: string;
  description_en?: string;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
  // --- Client-side ---
  icon?: string; // Client-only
  events_count?: number; // Alias client pour event_count
}

// Alias for backward compatibility
export type EventCategory = Category;

// Tag (events.EventTag)
export interface Tag {
  id: number;
  name: string;
  // --- Client-side ---
  slug?: string; // Client-only
}

// Alias for backward compatibility
export type EventTag = Tag;

// EventFollow (events.EventFollow)
export interface EventFollow {
  id: string | number; // Backend: AutoField (integer)
  user: string | number;
  event: string;
  notification_preference: 'all' | 'important' | 'none';
  notify_email: boolean;
  notify_push: boolean;
  notify_updates: boolean;
  notify_reminders: boolean;
  notify_cancellation: boolean;
  created_at: string;
  // SerializerMethodField
  event_details?: Event;
  user_email?: string;
}

// ============================================
// REGISTRATION & TICKET TYPES
// ============================================

// Statuts d'inscription (registrations.Registration.STATUS_CHOICES)
export type RegistrationStatus = 'pending' | 'pending_approval' | 'confirmed' | 'cancelled' | 'rejected' | 'completed' | 'checked_in';

// Statuts d'approbation (registrations.Registration.APPROVAL_STATUS_CHOICES)
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export interface Registration {
  id: string; // UUID
  event: Event | string;
  user: User;
  // Informations de base
  registration_type?: EventType;
  status: RegistrationStatus;
  // Approbation par l'organisateur
  approval_status?: ApprovalStatus;
  approved_by?: string | User;
  approved_by_name?: string; // SerializerMethodField
  approval_note?: string;
  approval_date?: string;
  // Paiement
  payment?: string;
  payment_required?: boolean;
  payment_deadline?: string;
  payment_info?: Record<string, any>; // SerializerMethodField
  // Suivi du temps
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  checked_in_at?: string;
  // Metriques pour tarification formulaires
  form_data_size?: number;
  // Reference unique
  reference_code: string;
  // Donnees formulaire personnalise
  form_data?: Record<string, any>;
  // Relations
  tickets?: TicketPurchase[];
  // SerializerMethodField
  user_name?: string;
  user_email?: string;
  event_detail?: Event;
  event_id?: string;
  // --- Client-side aliases (non renvoyes par le backend) ---
  requires_payment?: boolean; // Alias client pour payment_required
  custom_fields?: Record<string, any>; // Alias client pour form_data
  userInfo?: User; // Client-only
  qr_code?: string; // Client-only (sur TicketPurchase cote backend)
  is_checked_in?: boolean; // Client-only (sur TicketPurchase cote backend)
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'; // Client-only
}

// TicketType (registrations.TicketType)
export interface TicketType {
  id: string | number; // Backend: AutoField (integer)
  event: string;
  name: string;
  description?: string;
  price: number;
  // Quotas et disponibilite
  quantity_total: number;
  quantity_sold: number;
  available_quantity?: number; // SerializerMethodField
  // Periode de vente
  sales_start: string;
  sales_end: string;
  // Options
  is_visible?: boolean;
  max_per_order?: number;
  min_per_order?: number;
  // Sessions incluses avec ce type de billet
  included_sessions?: string[];
  // --- Pricing dynamique (paliers early-bird) — read-only backend ---
  current_price?: number; // Prix effectif à cet instant (palier actif ou base)
  pricing?: {
    current_price: number;
    base_price: number;
    tier_label: string | null;
    remaining_at_price: number | null; // "plus que N à ce prix"
    until: string | null; // ISO — "jusqu'au ..."
    next_price: number | null;
  };
  price_tiers?: Array<{
    id: number; ticket_type: number; label: string; price: number;
    starts_at: string | null; ends_at: string | null;
    max_quantity: number | null; order: number;
  }>;
  // --- Client-side aliases ---
  quantity_available?: number; // Alias client pour available_quantity
}

// TicketPurchase (registrations.TicketPurchase)
export interface TicketPurchase {
  id: string | number; // Backend: AutoField (integer)
  registration: string;
  registration_id?: string; // SerializerMethodField
  ticket_type: TicketType | string;
  quantity: number;
  unit_price: number;
  discount_code?: string;
  discount_amount?: number;
  total_price: number;
  // Paiement
  is_paid?: boolean;
  // QR code et validation
  qr_code?: string;
  is_checked_in?: boolean;
  checked_in_at?: string;
  // SerializerMethodField
  ticket_type_name?: string;
  event_id?: string;
  event_title?: string;
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
  status?: string;
  registration_status?: string;
  payment_status?: string;
  payment_required?: boolean;
  // --- Client-side ---
  attendee_name?: string; // Client-only
  attendee_email?: string; // Client-only
}

// Alias pour compatibilite - Ticket represente un TicketPurchase
export interface Ticket {
  id: string | number;
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

// TicketTransfer (registrations.TicketTransfer)
export type TicketTransferStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface TicketTransfer {
  id: string; // UUID
  ticket_purchase: string | number;
  sender: string | number;
  sender_name?: string; // SerializerMethodField
  sender_email?: string; // SerializerMethodField
  recipient_email: string;
  recipient_name?: string;
  recipient_user?: string | number | null;
  quantity: number;
  status: TicketTransferStatus;
  message?: string;
  created_at: string;
  expires_at: string;
  accepted_at?: string;
  declined_at?: string;
  // SerializerMethodField
  ticket_info?: Record<string, any>;
  event_info?: Record<string, any>;
  is_expired?: boolean;
  can_accept?: boolean;
  transfer_token_display?: string;
}

// Discount (registrations.Discount)
export interface Discount {
  id: string | number; // Backend: AutoField (integer)
  event: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  // Validite
  valid_from: string;
  valid_until: string;
  max_uses?: number;
  times_used: number;
  // Restrictions
  applicable_ticket_types?: string[];
  // --- Client-side aliases ---
  current_uses?: number; // Alias client pour times_used
  is_active?: boolean; // Client-only (calcule)
  min_purchase_amount?: number; // Client-only
}

// ============================================
// PAYMENT TYPES
// ============================================

// Methodes de paiement (payments.Payment.PAYMENT_METHOD_CHOICES)
// NotchPay + CinetPay (selon pays + admin config)
export type PaymentMethod =
  // Communes
  | 'mtn_money' | 'orange_money' | 'credit_card' | 'paypal'
  | 'bank_transfer' | 'wave' | 'mpesa' | 'airtel_money'
  // CinetPay-specifiques
  | 'moov_money'        // CI, BJ, BF, TG, ML, NE
  | 'free_money'        // SN
  | 'yas'               // TG (T-Money), BJ (Celtiis)
  | 'cinetpay_wallet';  // wallet CinetPay

// Alias pour compatibilite UI
export type PaymentMethodAlias = PaymentMethod | 'momo' | 'om' | 'card' | 'transfer';

// Statuts de paiement (payments.Payment.PAYMENT_STATUS_CHOICES)
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

// Passerelle de paiement (audit + routing). Doit rester aligné avec le backend
// (selected_provider) et les flags gateway_*_enabled.
export type PaymentGateway =
  | 'notchpay'
  | 'cinetpay'
  | 'stripe'
  | 'flutterwave'
  | 'campay'
  | 'pawapay';

// Configuration paiement par pays (retournee par GET /payments/methods/?country=XX)
export interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  /** Canal NotchPay si dispo (ex: 'cm.mtn'). Vide pour CinetPay-only. */
  channel: string;
  type: 'mobile_money' | 'card' | 'bank_transfer' | 'wallet';
  /** Plafond par transaction (string Decimal) ou null si pas de limite. */
  max_amount?: string | null;
  /** Providers qui peuvent traiter cette methode pour ce pays. */
  providers?: PaymentGateway[];
  /** Provider qui sera effectivement utilise (route via factory backend). */
  selected_provider?: PaymentGateway | null;
  /** Code operateur CinetPay (ex: 'OMCIV2', 'MOOVBF'). */
  cinetpay_channel?: string;
}

export interface CountryPaymentConfig {
  country_code: string;
  country_name: string;
  currency: string;
  phone_prefix: string;
  phone_digits: number;
  methods: PaymentMethodOption[];
  phone_patterns: Record<string, string>;
}

export interface Payment {
  id: string; // UUID
  registration: string;
  user: string;
  // Informations financieres
  amount: number;
  currency?: string;
  payment_method: PaymentMethod | PaymentMethodAlias;
  country_code?: string;
  // Statut et suivi
  status: PaymentStatus;
  transaction_id?: string;
  notchpay_reference?: string;
  cinetpay_reference?: string;
  payment_gateway?: PaymentGateway;
  payment_date?: string;
  // Suivi de la transaction
  created_at: string;
  updated_at: string;
  // Informations de facturation
  billing_name?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_address?: string;
  // Pour les formulaires personnalises (facturation basee sur l'usage)
  is_usage_based?: boolean;
  storage_amount?: number;
  duration_days?: number;
  // Donnees de transaction externes
  payment_gateway_response?: Record<string, any>;
  // SerializerMethodField
  invoice?: Invoice; // Backend renvoie un objet Invoice imbrique
  registration_id?: string;
  registration_details?: Registration;
  // --- Client-side aliases (non renvoyes par le backend) ---
  method?: PaymentMethod; // Alias client pour payment_method
  payment_status?: PaymentStatus; // Alias client pour status
  event?: Event | string; // Client-only (passer par registration)
  reference?: string; // Client-only
  phone_number?: string; // Client-only
  payer_name?: string; // Client-only
  payer_email?: string; // Client-only
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

// Reponse de POST /api/payments/initiate/ (endpoint unifie NotchPay/CinetPay)
export interface PaymentInitiateResponse {
  success: boolean;
  provider: PaymentGateway;
  payment_id: string;
  transaction_id: string;
  /** URL hebergee a charger en WebBrowser (NotchPay authorization_url / CinetPay payment_url). */
  payment_url: string;
  message?: string;
  error?: string;
}

// Reponse de GET /api/payments/cinetpay/return/ (status read-only post-redirect)
export interface CinetPayReturnResponse {
  success: boolean;
  status: PaymentStatus;
  is_successful: boolean;
  payment_id: string;
  amount: string;
  currency: string;
  message?: string;
}

// Refund (payments.Refund)
export type RefundStatus = 'requested' | 'processing' | 'completed' | 'rejected';

export interface Refund {
  id: string | number; // Backend: AutoField (integer)
  payment: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  transaction_id?: string;
  notes?: string;
  // SerializerMethodField
  payment_details?: Record<string, any>;
}

// Invoice (payments.Invoice)
export interface Invoice {
  id: string | number; // Backend: AutoField (integer)
  payment: string;
  invoice_number: string;
  generated_at: string;
  due_date?: string;
  // Pour les paiements bases sur l'usage
  billing_period_start?: string;
  billing_period_end?: string;
  pdf_file?: string;
  // --- Client-side aliases ---
  pdf_url?: string; // Alias client pour pdf_file
  created_at?: string; // Alias client pour generated_at
}

// ============================================
// MESSAGING TYPES
// Synchronise avec EventEzBackend/apps/user_messages/models.py
// ============================================

export interface Conversation {
  id: string | number; // Backend: AutoField (integer)
  participants: User[];
  participant_ids?: number[]; // Write-only
  conversation_type: 'direct' | 'group' | 'event';
  name?: string;
  avatar?: string;
  last_message?: Message;
  last_message_at?: string;
  event?: string | Event;
  is_archived: boolean;
  is_starred: boolean;
  unread_count: number; // SerializerMethodField
  user_messages?: Message[];
  created_at: string;
  updated_at: string;
  // --- Client-side aliases ---
  title?: string; // Alias client pour name
}

export interface Message {
  id: string | number; // Backend: AutoField (integer)
  conversation: string | number;
  sender: number; // ID utilisateur
  sender_name: string; // SerializerMethodField
  sender_avatar?: string; // SerializerMethodField
  content: string;
  message_type: 'text' | 'system' | 'image' | 'voice' | 'document' | 'event_share';
  attachments?: MessageAttachment[];
  read_by: number[]; // Liste des IDs des utilisateurs qui ont lu
  reply_to?: string | number | Message; // SerializerMethodField
  is_starred: boolean;
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  reactions?: MessageReaction[];
  created_at: string;
  /**
   * Client-only — true quand un message offline n'a pas pu être envoyé après
   * MAX_RETRY_COUNT tentatives. La bulle s'affiche avec un état d'échec
   * (bordure rouge + actions Réessayer/Supprimer) au lieu de disparaître
   * silencieusement.
   */
  is_failed?: boolean;
}

export interface MessageAttachment {
  id: string | number; // Backend: AutoField (integer)
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
  id: string | number; // Backend: AutoField (integer)
  user: number;
  user_name: string; // SerializerMethodField
  emoji: string;
  created_at: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

// Types de notification synchronises avec le backend (notifications.models.Notification.NOTIFICATION_TYPE_CHOICES)
// Source de vérité : Notification.NOTIFICATION_TYPE_CHOICES
// (EventEzBackend/apps/notifications/models.py). Garder synchronisé — le
// résolveur de clic (lib/notifications/resolveTarget) switche sur ces valeurs.
export type NotificationType =
  // Événement (cycle de vie / modération)
  | 'event_update'
  | 'event_revalidation'
  | 'event_changes_requested'
  | 'event_cancelled'
  | 'event_validated'
  | 'event_rejected'
  | 'event_pending_moderation'
  | 'moderation_queue_reminder'
  // Inscription / paiement / rappels
  | 'registration_confirmation'
  | 'payment_confirmation'
  | 'usage_billing_update'
  | 'event_reminder'
  | 'session_reminder'
  | 'waitlist_available'
  | 'waitlist_position'
  | 'verification_reminder'
  | 'feedback_request'
  | 'refund_processed'
  | 'ticket_transfer'
  | 'check_in_confirmation'
  // Social / engagement
  | 'new_follower'
  | 'followed_organizer_new_event'
  | 'abandoned_registration'
  | 'event_feedback'
  | 'follow_registered'
  | 'connections_at_event'
  | 'event_suggestion'
  | 'event_low_stock'
  | 'event_today'
  | 'event_live'
  | 'winback'
  // Messagerie / groupes événement
  | 'new_message'
  | 'system_message'
  | 'custom_message'
  | 'event_group_created'
  | 'event_group_readonly'
  | 'event_group_imminent'
  | 'event_group_deleted'
  // Équipe / exposants
  | 'event_team_invitation'
  | 'exhibitor_appli_received'
  | 'exhibitor_appli_accepted'
  | 'exhibitor_appli_rejected'
  | 'exhibitor_appli_waitlisted'
  | 'exhibitor_option_expired'
  | 'exhibitor_booking_cancelled'
  // Divers
  | 'feature_request'
  | 'legal_update'
  | 'general';

// Type de canal de notification
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

export interface Notification {
  id: string; // UUID (serializer override hex_verbose)
  user: string; // SerializerMethodField (retourne UUID string)
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
  related_object_id?: string;
  related_object_type?: 'event' | 'registration' | 'payment' | string;
  extra_data?: Record<string, any>;
  // Champs backend supplementaires
  email_subject?: string;
  phone_number?: string;
  // --- Client-side aliases ---
  link?: string; // Client-only
  event?: Event; // Client-only
  data?: Record<string, any>; // Alias client pour extra_data
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
  id: string | number; // Backend: AutoField (integer)
  event: Event | string;
  user: User | string;
  // Evaluation (1-5)
  rating: number;
  comment?: string;
  // Horodatage
  created_at: string;
  updated_at?: string;
  // Statut de moderation
  is_approved?: boolean;
  is_featured?: boolean;
  // SerializerMethodField
  user_name?: string;
  event_details?: Record<string, any>;
  // --- Client-side ---
  is_verified?: boolean; // Client-only
  user_avatar?: string; // Client-only
}

// Alias pour compatibilite
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
  id: string; // UUID
  name: PlanName;
  display_name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  max_participants_per_event: number;
  max_active_events: number;
  visibility_boost: number;
  // Limites IA
  ai_daily_limit?: number;
  ai_messages_per_session?: number;
  features: string[];
  is_active: boolean;
  // --- Client-side ---
  is_popular?: boolean; // Client-only
}

export interface OrganizerSubscription {
  id: string; // UUID
  organizer: string;
  plan: SubscriptionPlan;
  plan_details?: SubscriptionPlan; // SerializerMethodField
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  start_date: string;
  end_date?: string;
  trial_end_date?: string;
  next_billing_date?: string;
  auto_renew: boolean;
  payment_method?: string;
  is_active: boolean; // SerializerMethodField
  current_price: number; // SerializerMethodField
  created_at: string;
  updated_at: string;
}

// SubscriptionPayment (payments.SubscriptionPayment)
export interface SubscriptionPayment {
  id: string; // UUID
  organizer: string | number;
  subscription?: string;
  plan: string;
  plan_details?: SubscriptionPlan;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  payment_method?: string;
  status: PaymentStatus;
  transaction_id?: string;
  notchpay_reference?: string;
  billing_email?: string;
  billing_phone?: string;
  nonprofit_discount?: boolean;
  discount_amount?: number;
  original_amount?: number;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// WALLET & PAYOUT TYPES
// ============================================

export type PayoutMethod = 'bank_transfer' | 'mtn_money' | 'orange_money' | 'wave' | 'mpesa' | 'airtel_money';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TransactionType = 'credit' | 'debit' | 'fee' | 'refund' | 'adjustment';

export interface OrganizerWallet {
  id: string; // UUID
  organizer: string;
  available_balance: number;
  pending_balance: number;
  total_earnings: number;
  total_withdrawn: number;
  total_fees: number;
  currency: string;
  country?: string;
  // Payout instantané : gains d'events terminés débloquables + taux de frais
  instant_payout_eligible?: number;
  instant_payout_fee_rate?: number;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  mobile_money_number?: string;
  mobile_money_provider?: string;
  minimum_payout: number;
  // Phase 2 — Stripe Connect Express (optionnels)
  stripe_account_id?: string;
  stripe_onboarding_complete?: boolean;
  stripe_payouts_enabled?: boolean;
  stripe_payout_schedule?: 'automatic' | 'manual';
  recent_transactions?: WalletTransaction[]; // SerializerMethodField
  can_withdraw: boolean; // SerializerMethodField
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string; // UUID
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
  id: string; // UUID
  wallet: string;
  organizer_email?: string; // SerializerMethodField
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
  processed_by_email?: string; // SerializerMethodField
  transaction_reference?: string;
  notes?: string;
  failure_reason?: string;
  wallet_available_balance?: number; // SerializerMethodField
}

export interface PendingEarning {
  id: string; // UUID
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
  id: string; // UUID
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

export interface CommissionConfigResponse {
  id: string;
  country_code: string;
  country_name: string;
  currency: string;
  commission_rate: string; // Decimal string from backend, e.g. "0.0500"
  fixed_fee: string; // Decimal string, e.g. "100.00"
  is_default: boolean;
  is_active: boolean;
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
  id: string; // UUID
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
  id: string; // UUID
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
  // Media
  photo?: string;
  // Lien utilisateur (optionnel)
  user?: string;
  // Metadata
  is_featured?: boolean;
  order?: number;
  created_at?: string;
  updated_at?: string;
  // Proprietes calculees (backend @property)
  full_name?: string;
  display_name?: string;
  // --- Client-side ---
  name?: string; // Alias client pour full_name
  social_links?: {
    twitter?: string;
    linkedin?: string;
  }; // Client-only (restructure)
}

// Types de session (events.agenda_models.Session.SESSION_TYPE_CHOICES)
export type SessionType = 'keynote' | 'talk' | 'panel' | 'workshop' | 'networking' | 'break' | 'lunch' | 'other';

// Niveaux de session
export type SessionLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';

// Session (events.agenda_models.Session)
export interface Session {
  id: string; // UUID
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
  // Capacite et inscription
  max_capacity?: number;
  requires_registration: boolean;
  registration_count?: number;
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
  // --- Client-side ---
  max_participants?: number; // Alias client pour max_capacity
  current_participants?: number; // Alias client pour registration_count
  is_registered?: boolean; // Backend exposed via SessionSerializer
  is_in_waitlist?: boolean; // Backend exposed via SessionSerializer
  waitlist_position?: number | null; // Backend exposed via SessionSerializer
  registration_deadline?: string; // Client-only
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'; // Client-only
}

// SessionRegistration (events.agenda_models.SessionRegistration)
export interface SessionRegistration {
  id: string; // UUID
  session: string;
  user: string;
  // Participation
  registered_at: string;
  attended: boolean;
  attended_at?: string;
  // Feedback
  rating?: number;
  feedback?: string;
  // --- Client-side ---
  status?: 'registered' | 'attended' | 'cancelled'; // Client-only
}

// SessionResource (events.agenda_models.SessionResource)
export type ResourceType = 'slides' | 'document' | 'video' | 'link' | 'code' | 'other';

export interface SessionResource {
  id: string; // UUID
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
  id: string; // UUID
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
  id: string; // UUID
  event: string;
  user: string;
  ticket_type?: string;
  // Informations de contact
  email?: string;
  phone?: string;
  full_name?: string;
  // Statut et suivi
  position: number;
  priority?: number;
  status: WaitlistStatus;
  quantity?: number;
  // Notifications
  notified_at?: string;
  notification_sent?: boolean;
  notification_count?: number;
  expires_at?: string;
  // Conversion
  converted_at?: string;
  registration?: string;
  notes?: string;
  // Metadonnees
  created_at: string;
  updated_at?: string;
  // --- Client-side aliases ---
  notification_sent_at?: string; // Alias client pour notified_at
}

// ============================================
// FORM TYPES
// ============================================

// Types de champs (events.CustomFormField.FIELD_TYPES)
export type FieldType = 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'time' | 'select' | 'checkbox' | 'radio' | 'file';
// Alias pour compatibilite UI (url n'existe pas dans backend)
export type ExtendedFieldType = FieldType | 'url';

// CustomFormField (events.CustomFormField)
export interface FormField {
  id: string | number; // Backend: AutoField (integer)
  event?: string;
  label: string;
  field_type: FieldType | ExtendedFieldType;
  required: boolean;
  placeholder?: string;
  help_text?: string;
  options?: string | string[]; // Options separees par des virgules ou tableau
  order: number;
  // Support multi-etapes pour les formulaires longs
  step?: number;
  step_title?: string;
  // --- Client-side ---
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  }; // Client-only
}

// Alias pour compatibilite
export type CustomFormField = FormField;

// ============================================
// MAP TYPES
// ============================================

export interface MapMarker {
  id: string;
  slug?: string;
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
  id: string | number; // Backend: AutoField (integer)
  event: string;
  user: string;
  reason: FlagReason;
  description?: string;
  created_at: string;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  // SerializerMethodField
  user_name?: string;
  event_details?: Record<string, any>;
  // --- Client-side aliases ---
  reporter?: string; // Alias client pour user
  resolution_note?: string; // Alias client pour resolution_notes
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'; // Client-only
}

// Alias pour compatibilite
export type EventFlag = Flag;

// EventValidation (feedback.EventValidation)
export interface Validation {
  id: string | number; // Backend: AutoField (integer)
  event: Event | string;
  user: User | string;
  created_at: string;
  notes?: string;
  // SerializerMethodField
  user_name?: string;
  event_details?: Record<string, any>;
  // --- Client-side aliases ---
  validator?: User; // Alias client pour user
  status?: 'pending' | 'approved' | 'rejected'; // Client-only
  validated_at?: string; // Client-only
}

// Alias pour compatibilite
export type EventValidation = Validation;

// ============================================
// AUDIT TYPES
// ============================================

// Types d'action (audit.AuditLog.ACTION_TYPES)
export type AuditAction =
  | 'user_create' | 'user_edit' | 'user_delete' | 'user_restore' | 'user_suspend' | 'user_activate'
  | 'profile_validate' | 'profile_reject'
  | 'event_create' | 'event_validate' | 'event_reject' | 'event_edit' | 'event_delete' | 'event_register'
  | 'role_change'
  | 'message_delete' | 'message_report' | 'message_moderate'
  | 'payment_refund'
  | 'category_create' | 'category_edit' | 'category_delete'
  | 'settings_change' | 'bulk_action'
  | 'login_attempt' | 'login_success' | 'login_failed' | 'logout';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLog {
  id: string | number; // Backend: AutoField (integer)
  user: string | number | null;
  action: AuditAction | string;
  // Backend utilise GenericForeignKey (content_type + object_id)
  content_type?: number;
  object_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  // Backend utilise 'timestamp' (pas 'created_at')
  timestamp: string;
  severity?: AuditSeverity;
  // SerializerMethodField
  user_display?: Record<string, any>;
  action_display?: string;
  severity_display?: string;
  target_display?: string;
  // --- Client-side aliases ---
  created_at?: string; // Alias client pour timestamp
  resource_type?: string; // Alias client pour content_type
  resource_id?: string; // Alias client pour object_id
}

export interface AuditStatistics {
  total_logs: number;
  by_action: Record<string, number>;
  by_severity: Record<string, number>;
  recent_critical: AuditLog[];
}

// ============================================
// TREASURY TYPES
// ============================================

export interface PlatformWallet {
  id: string;
  total_revenue: number;
  total_commissions: number;
  total_expenses: number;
  total_payroll: number;
  total_dividends: number;
  net_balance: number;
  last_computed_at?: string;
}

export interface PlatformTransaction {
  id: string;
  transaction_type: 'commission' | 'subscription' | 'expense' | 'payroll' | 'dividend' | 'adjustment';
  amount: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

export interface StaffMember {
  id: string;
  user: any;
  role: string;
  monthly_salary: number;
  is_active: boolean;
  hired_at: string;
  terminated_at?: string;
}

export interface StaffPayment {
  id: string;
  staff: StaffMember;
  amount: number;
  period_start: string;
  period_end: string;
  status: 'pending' | 'paid' | 'failed';
  paid_at?: string;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  is_recurring: boolean;
  recurrence_period?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  created_at: string;
  approved_by?: any;
}

export interface Shareholder {
  id: string;
  user: any;
  name: string;
  ownership_percentage: number;
  is_active: boolean;
  joined_at: string;
}

export interface DividendDistribution {
  id: string;
  total_amount: number;
  period_start: string;
  period_end: string;
  status: 'draft' | 'approved' | 'distributed';
  created_at: string;
  payments?: DividendPayment[];
}

export interface DividendPayment {
  id: string;
  shareholder: Shareholder;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
}

export interface TreasuryOverview {
  wallet: PlatformWallet;
  recent_transactions: PlatformTransaction[];
  monthly_revenue: number;
  monthly_expenses: number;
  pending_payroll: number;
}

// ============================================
// NAVIGATION TYPES
// ============================================

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  Onboarding: undefined;
  // Auth screens (accessible from anywhere for browse-first flow)
  Login: {
    eventTitle?: string;
    returnScreen?: keyof RootStackParamList;
    returnParams?: object;
    /**
     * Si true, le LoginScreen affiche un bouton secondaire "Continuer en
     * invité" qui crée un compte sans mot de passe et redirige vers
     * returnScreen. Réservé aux events gratuits — la friction d'auth doit
     * disparaître pour les workshops, meetups, conférences ouvertes.
     */
    eventIsFree?: boolean;
    /** Email pré-rempli (ex: redirection depuis Register quand l'email existe déjà). */
    prefillEmail?: string;
  } | undefined;
  Register: { returnScreen?: string | null; returnParams?: any; prefillEmail?: string } | undefined;
  // Collecte per-participant après paiement (deep link fallback Mobile Money).
  AttendeeInfo: { registrationId: string };
  RegisterOrganizer: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { email?: string; skippable?: boolean; returnScreen?: string | null; returnParams?: any };
  // Complétion de profil après 1re inscription social (Google/Apple). Skippable.
  CompleteProfile: { returnScreen?: string | null; returnParams?: any };
  // Écran consommé par le deep link `https://eventez.online/verify-email/{token}`.
  // Différent de `VerifyEmail` (page de relance post-inscription) : ici on a un
  // token à valider via l'API et on affiche le résultat (succès/expiré/invalide).
  VerifyEmailToken: { token: string };
  EventDetails: {
    eventId: string;
    imageUrl?: string;
    /**
     * Mode preview : ouvert depuis EventCreate avec les données du form
     * encore non sauvegardées. EventDetails affiche `previewEvent` au lieu
     * de fetch par id, et désactive toutes les actions interactives
     * (follow, register, share, contact organizer).
     */
    previewEvent?: Partial<Event>;
    /**
     * Section à mettre en avant à l'ouverture (deep-link). 'virtual' vient
     * d'une notif event_live → on scrolle/ouvre la section « Rejoindre la visio ».
     */
    initialTab?: 'virtual';
  };
  EventReviews: { eventId: string; eventTitle?: string };
  EventSearch: { query?: string; category?: number; city?: string; price?: 'free' | 'paid' } | undefined;
  // Liste de toutes les villes ayant des events. Equivalent /events/in du web.
  CitiesIndex: undefined;
  TicketPurchase: {
    eventId: string;
    ticketTypeId?: string;
    registrationId?: string;
    additionalTickets?: boolean;
  };
  Payment: {
    registrationId: string;
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
    eventId?: string;
    eventSlug?: string;
    eventType?: 'billetterie' | 'inscription';
    /** Portée du formulaire : si 'per_attendee', on propose la complétion post-paiement. */
    attendeeFormScope?: 'order' | 'per_attendee';
    registrationStatus?: string;
    approvalStatus?: string;
    eventTitle?: string;
    /** Bannière/cover de l'event — sert de fond à la carte « story » partageable. */
    eventImage?: string | null;
    eventStartDate?: string;
    amount?: number;
    currency?: string;
    /** Reference code de l'inscription (Registration.reference_code) — affichée dans le récap */
    referenceCode?: string;
  };
  PaymentFailed: { paymentId?: string; error?: string };
  QRCode: { ticketId: string };
  RegistrationDetails: { registrationId: string };
  PendingTransfers: undefined;
  OfflineTickets: undefined;
  TransferAccept: { token: string; action?: 'accept' | 'decline' };
  Profile: { userId?: string };
  EditProfile: undefined;
  Settings: undefined;
  BlockedUsers: undefined;
  Notifications: undefined;
  UserDashboard: undefined;
  Messages: undefined;
  Conversation: { conversationId?: string; userId?: string; userName?: string };
  NewConversation: { userId?: string };
  MessageRequests: undefined;
  Connections: undefined;
  ConnectionScanner: undefined;
  Map: { eventId?: string };
  EventCreate: { draftId?: string; hostEventId?: string } | undefined;
  EventEdit: { eventId: string };
  MyEvents: undefined;
  MyBooth: undefined;
  ExhibitApply: { eventId: string; eventTitle?: string };
  EventAnalytics: { eventId: string };
  EventRegistrations: { eventId: string };
  SessionDetails: { sessionId: string };
  SpeakerDetails: { speakerId: string };
  OrganizerProfile: { organizerId: string };
  Wallet: undefined;
  PayoutRequest: undefined;
  Subscription: undefined;
  QRScanner: { eventId: string };
  LiveOps: { eventId: string };
  Memories: undefined;
  EventAttendees: { eventId: string; registrationId: string };
  EventPricingTiers: { eventId: string; eventCurrency?: string };
  Scan: undefined;
  Terms: undefined;
  Privacy: undefined;
  Moderation: undefined;
  MyPayments: undefined;
  RefundRequest: { paymentId: string };
  RefundsList: undefined;
  Drafts: undefined;
  BecomeOrganizer: undefined;
  Verification: undefined;
  FollowingUsers: undefined;
  Invitations: undefined;
  Referrals: undefined;
  Gamification: undefined;
  LiveEvent: { eventId: string };
  // `manage` = l'utilisateur gère CET event (propriétaire ou admin) → vue
  // organisateur (créer des rôles, candidatures reçues). Sinon vue bénévole
  // (postuler). Basé sur la propriété réelle de l'event, pas le rôle global.
  Volunteers: { eventId?: string; manage?: boolean };
  // Equipe d'evenement (organisateur invite scanner/moderateur/etc.)
  TeamManagement: { eventId: string; eventTitle?: string };
  TeamInvitation: { token: string };
  // Mariage : RSVP public par token (deep link invitations/accept/{token})
  WeddingRsvp: { token: string };
  // Mariage : liste de cadeaux publique (deep link events/{slug}/gift-registry)
  WeddingGiftRegistry: { slug: string };
  // Vue user-side : "Mes events en equipe" — events ou je suis staff actif
  MyTeamEvents: undefined;
  DiscountManagement: { eventId: string };
  DiscountForm: { eventId: string; discountId?: number };
  EventSessionsLink: { eventId: string };
  SponsorManagement: { eventId: string };
  Webhooks: undefined;
  Newsletters: undefined;
  Dashboards: undefined;
  DashboardDetails: { dashboardId: string };
  SeatingPlans: { eventId: string };
  SeatingPlanEditor: { planId: string };
  // Gestion des stands (salon exposants) — organisateur
  BoothManagement: { eventId: string };
  // Éditeur visuel de plan (drag tactile des zones/stands)
  BoothPlanEditor: { floorPlanId: string; eventId: string };
  Help: undefined;
  AnalyticsDashboard: undefined;
  Reports: undefined;
  AdminDashboard: undefined;
  UserManagement: undefined;
  UserEdit: { userId: string };
  SubscriptionManagement: undefined;
  AuditLogs: undefined;
  AuditLogDetail: { logId: number | string };
  VerificationRequestsAdmin: undefined;
  PlatformSettings: undefined;
  AnnouncementsAdmin: undefined;
  AnnouncementForm: { announcementId?: string } | undefined;
  ClientReleaseAdmin: undefined;
  AdminAds: undefined;
  AdminAdForm: { adId?: string } | undefined;
  TreasuryOverview: undefined;
  TreasuryStaff: undefined;
  TreasuryExpenses: undefined;
  TreasuryShareholders: undefined;
  TreasuryReports: undefined;
  // System Status
  SystemStatus: undefined;
  Maintenance: undefined;
  IncidentDetails: { incidentId: string };
  // In-app browser for external links (websites, virtual rooms, etc.)
  Browser: { url: string; title?: string; /** Salle visio : notifie la sortie au serveur. */ roomId?: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: { returnScreen?: string | null; returnParams?: any } | undefined;
  RegisterOrganizer: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { email?: string; skippable?: boolean; returnScreen?: string | null; returnParams?: any };
  // Complétion de profil après 1re inscription social (Google/Apple). Skippable.
  CompleteProfile: { returnScreen?: string | null; returnParams?: any };
  // Écran consommé par le deep link `https://eventez.online/verify-email/{token}`.
  // Différent de `VerifyEmail` (page de relance post-inscription) : ici on a un
  // token à valider via l'API et on affiche le résultat (succès/expiré/invalide).
  VerifyEmailToken: { token: string };
};

export type MainTabParamList = {
  Discover: { category?: number } | undefined;
  Saved: undefined;
  MessagesTab: undefined;
  MyTickets: undefined;
  Profile: undefined;
  // Legacy aliases (kept for backward compatibility in navigation params)
  Home: undefined;
  Explore: { category?: number } | undefined;
  Following: undefined;
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

// ============================================
// AI ASSIST TYPES
// ============================================

export interface AIUsage {
  daily_count: number;
  daily_limit: number;
  session_count: number;
  session_limit: number;
}

export interface AIGeneratedEvent {
  title?: string;
  short_description?: string;
  description?: string;
  event_type?: string;
  category_id?: string;
  tag_ids?: number[];
  location_type?: string;
  suggested_location_name?: string;
  suggested_city?: string;
  seo_title?: string;
  seo_description?: string;
}

export interface AITitleSuggestion {
  title: string;
  reason: string;
}

export interface AIPricingSuggestion {
  name: string;
  price: number;
  reasoning: string;
}

export interface AICategorySuggestion {
  category_id: number;
  tag_ids: number[];
}

// ============================================
// WEBSOCKET MESSAGE TYPES (Discriminated Union)
// ============================================

export type WebSocketIncomingMessage =
  | { type: 'auth.success' }
  | { type: 'auth.error'; error?: string }
  | { type: 'message.new'; message: Message; conversation_id?: string | number }
  | { type: 'message.sent'; message: Message; client_temp_id?: string | number | null }
  | { type: 'message.edited'; message_id: string | number; content: string; edited_at: string; user_id: number }
  | { type: 'message.deleted'; message_id: string | number; user_id: number }
  | { type: 'typing.indicator'; conversation_id: string | number; user_id: number; user_name: string; is_typing: boolean }
  | { type: 'message.read'; message_id: string | number; user_id: number; read_at: string }
  | { type: 'reaction.add'; message_id: string | number; user_id: number; emoji: string; reaction_id?: string | number }
  | { type: 'reaction.remove'; message_id: string | number; user_id: number; emoji: string; reaction_id?: string | number }
  | { type: 'presence.changed'; user_id: number; status: string; last_seen: string }
  | { type: 'unread.decrement'; message_ids: (string | number)[]; conversation_ids: (string | number)[] }
  | { type: 'conversation.added'; conversation_id: string | number }
  | { type: 'conversation.removed'; conversation_id: string | number }
  | { type: 'request.status.changed'; conversation_id: string | number; request_status: 'accepted' | 'declined' | 'pending_request'; actor_id?: number }
  | { type: 'service_unavailable'; incident: any };

export type WebSocketOutgoingMessage =
  | { type: 'authenticate'; token: string }
  | { type: 'message.send'; conversation_id: string | number; content: string; reply_to?: string | number }
  | { type: 'typing.start'; conversation_id: string | number }
  | { type: 'typing.stop'; conversation_id: string | number }
  | { type: 'message.read'; message_id: string | number }
  | { type: 'reaction.add'; message_id: string | number; emoji: string }
  | { type: 'reaction.remove'; message_id: string | number; emoji: string };

// ============================================
// System Status / Incidents
// ============================================

export type IncidentScope = 'global' | 'service';
export type IncidentStatus = 'scheduled' | 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type IncidentSeverity = 'minor' | 'major' | 'critical';
export type IncidentImpact = 'none' | 'degraded' | 'partial_outage' | 'major_outage';
export type ServiceHealthStatus = 'operational' | 'degraded' | 'partial' | 'major' | 'maintenance';

export interface IncidentUpdateEntry {
  id: string;
  status: IncidentStatus;
  status_display: string;
  message: string;
  created_at: string;
  created_by_name: string | null;
}

export interface Incident {
  id: string;
  title: string;
  public_message: string;
  scope: IncidentScope;
  affected_services: string[];
  affected_services_labels: { key: string; label: string }[];
  status: IncidentStatus;
  status_display: string;
  severity: IncidentSeverity;
  severity_display: string;
  impact: IncidentImpact;
  impact_display: string;
  is_blocking: boolean;
  scheduled_start: string | null;
  scheduled_end: string | null;
  started_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  updates: IncidentUpdateEntry[];
  latest_update: IncidentUpdateEntry | null;
}

export interface ServiceDef {
  key: string;
  label: string;
  category: string;
  description: string;
}

export interface ServiceStatus extends ServiceDef {
  current_status: ServiceHealthStatus;
  active_incident_id: string | null;
}

export interface ClientVersionsBlock {
  /**
   * Bloc renvoyé par /api/status/. Le mobile lit `mobile.min_supported` pour
   * décider d'un force-update gate, et `mobile.latest` pour un soft prompt.
   */
  mobile: {
    min_supported: string;
    latest: string;
    force_update_message: string;
    ios_store_url: string;
    android_store_url: string;
  };
}

export interface StatusSnapshot {
  services: ServiceStatus[];
  active_incidents: Incident[];
  recent_resolved: Incident[];
  has_global_outage: boolean;
  overall_status: ServiceHealthStatus;
  /** Optionnel — absent sur les anciens backends. */
  client_versions?: ClientVersionsBlock;
}

// ============================================
// Announcements (modal éditorial au boot)
// ============================================
// Aligné avec apps/system_status/models.py:Announcement.

export type AnnouncementSeverity = 'info' | 'warning' | 'critical';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  severity: AnnouncementSeverity;
  severity_display: string;
  is_dismissible: boolean;
  cta_label: string;
  cta_url: string;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export type AnnouncementAudience = 'all' | 'users' | 'organizers' | 'admins';
export type AnnouncementPlatform =
  | 'all'
  | 'mobile'
  | 'mobile_ios'
  | 'mobile_android'
  | 'web';

export interface AnnouncementAdmin extends Announcement {
  audience: AnnouncementAudience;
  platform: AnnouncementPlatform;
  target_min_app_version: string;
  target_max_app_version: string;
  is_published: boolean;
  is_currently_valid: boolean;
}

export interface ClientReleaseRequirement {
  mobile_min_supported_version: string;
  mobile_latest_version: string;
  mobile_force_update_message: string;
  ios_store_url: string;
  android_store_url: string;
  updated_at: string;
}

export interface ServiceUnavailablePayload {
  id: string;
  scope: IncidentScope;
  affected_services: string[];
  is_blocking: boolean;
  status: IncidentStatus;
  severity: IncidentSeverity;
  impact: IncidentImpact;
  title: string;
  public_message: string;
  started_at: string | null;
  latest_update: { message: string; created_at: string } | null;
}

// ============================================
// Dashboard builder
// ============================================
// Aligné avec apps/analytics/models.py — DashboardWidget + Dashboard.

export type WidgetType = 'number' | 'chart' | 'table' | 'map' | 'list';
export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'radar' | 'scatter';
export type WidgetDataSource =
  | 'event_count'
  | 'registration_count'
  | 'revenue'
  | 'user_count'
  | 'event_types'
  | 'payment_methods'
  | 'revenue_trends'
  | 'registration_trends'
  | 'geographical'
  | 'custom_query';

export interface DashboardWidget {
  id: string;
  title: string;
  description?: string;
  widget_type: WidgetType;
  chart_type?: ChartType | null;
  data_source: WidgetDataSource;
  config?: Record<string, any>;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  user: number;
  is_public: boolean;
  shared_with?: number[];
  created_at: string;
  updated_at: string;
}

export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  owner: number;
  layout?: Record<string, any>;
  theme?: string;
  is_public: boolean;
  shared_with?: number[];
  widgets_count?: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Seating plans (organizer-side)
// ============================================
// Aligné avec apps/events/seating_models.py.

export interface SeatingZone {
  id: string;
  seating_plan: string;
  name: string;
  color: string;
  price_modifier: number | string;
  capacity: number;
  order: number;
  reserved_count?: number;
}

export interface SeatingPlan {
  id: string;
  event: string;
  name: string;
  description?: string;
  /**
   * Backend libre — convention mobile :
   *   { zones: { <zone_id>: { rows, cols, label_prefix } } }
   * Plus tard on pourra y stocker des coordonnées (x, y) si on ajoute un canvas.
   */
  layout_data?: {
    zones?: Record<string, { rows?: number; cols?: number; label_prefix?: string }>;
    [k: string]: any;
  };
  total_seats: number;
  is_active: boolean;
  zones?: SeatingZone[];
  reserved_seats?: number;
  created_at: string;
  updated_at: string;
}
