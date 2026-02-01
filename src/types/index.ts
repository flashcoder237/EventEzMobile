// Types utilisateur
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'user' | 'organizer' | 'moderator' | 'admin';
  user_type: 'individual' | 'organization';
  company_name?: string;
  registration_number?: string;
  is_verified: boolean;
  profile_picture?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Types événements
export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  organizer: User;
  category: EventCategory;
  tags: EventTag[];
  event_type: 'billetterie' | 'inscription';
  status: 'draft' | 'submitted' | 'validated' | 'rejected' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  registration_deadline?: string;
  location_type: 'in_person' | 'online' | 'hybrid';
  location_name?: string;
  location_address?: string;
  location_city?: string;
  location_country?: string;
  location_latitude?: number;
  location_longitude?: number;
  online_url?: string;
  online_platform?: string;
  banner_image?: string;
  is_featured: boolean;
  view_count: number;
  registration_count: number;
  max_capacity?: number;
  ticket_types?: TicketType[];
  is_following?: boolean;
  distance_km?: number;
}

export interface EventCategory {
  id: number;
  name: string;
  description?: string;
  image?: string;
  default_event_image?: string;
}

export interface EventTag {
  id: number;
  name: string;
}

// Types billets
export interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  quantity_available: number;
  sales_start: string;
  sales_end: string;
  is_visible: boolean;
  max_per_order: number;
  min_per_order: number;
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

// Types inscriptions
export interface Registration {
  id: string;
  event: Event;
  user: User;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  form_data?: Record<string, any>;
  qr_code?: string;
  checked_in: boolean;
  check_in_time?: string;
  created_at: string;
}

// Types notifications
export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  event?: Event;
  link?: string;
}

// Types messages
export interface Conversation {
  id: string;
  participants: User[];
  title?: string;
  last_message?: Message;
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
  is_read: boolean;
  created_at: string;
}

// Types paiements
export interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: 'mtn_money' | 'orange_money' | 'card' | 'paypal' | 'transfer';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  reference: string;
  created_at: string;
}

// Types carte
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

// Types navigation
export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  EventDetails: { eventId: string };
  TicketPurchase: { eventId: string; ticketTypeId?: string };
  Payment: { registrationId: string };
  QRCode: { ticketId: string };
  Profile: { userId?: string };
  Settings: undefined;
  Notifications: undefined;
  Messages: undefined;
  Conversation: { conversationId: string };
  Map: { eventId?: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  MyTickets: undefined;
  Dashboard: undefined;
  Profile: undefined;
};
