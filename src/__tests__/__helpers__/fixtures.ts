/**
 * Fixtures réutilisables pour les tests — User, Event, Registration, etc.
 *
 * Toujours retourner un nouvel objet pour éviter les mutations entre tests.
 */

import type { User, Event, Registration, Conversation, Message } from '../../types';

export const fakeUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  email: 'test@eventez.online',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  phone_number: '+237600000000',
  role: 'user',
  is_verified: true,
  email_verified: true,
  ...overrides,
} as User);

export const fakeOrganizer = (overrides: Partial<User> = {}): User =>
  fakeUser({
    role: 'organizer',
    company_name: 'Acme Events',
    organizer_type: 'organization',
    ...overrides,
  });

export const fakeAdmin = (overrides: Partial<User> = {}): User =>
  fakeUser({ role: 'admin', ...overrides });

export const fakeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'event-uuid-1',
  title: 'Forum Tech 2026',
  slug: 'forum-tech-2026',
  description: 'Conférence tech',
  event_type: 'billetterie',
  start_date: '2026-06-01T09:00:00Z',
  end_date: '2026-06-01T18:00:00Z',
  location_type: 'in_person',
  location_city: 'Douala',
  location_country: 'Cameroun',
  organizer: fakeOrganizer(),
  status: 'validated',
  is_featured: false,
  view_count: 0,
  registration_count: 0,
  ...overrides,
} as Event);

export const fakeRegistration = (overrides: Partial<Registration> = {}): Registration => ({
  id: 'reg-uuid-1',
  user: 1 as any,
  event: 'event-uuid-1' as any,
  status: 'confirmed',
  registration_type: 'billetterie' as any,
  reference_code: 'REG-ABC123',
  ...overrides,
} as Registration);

export const fakeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-uuid-1',
  participants: [fakeUser(), fakeUser({ id: 2, email: 'alice@x.com' })],
  unread_count: 0,
  last_message: null,
  last_message_at: null,
  ...overrides,
} as Conversation);

export const fakeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-uuid-1',
  conversation: 'conv-uuid-1' as any,
  sender: fakeUser(),
  content: 'Hello',
  message_type: 'text',
  created_at: '2026-05-07T10:00:00Z',
  is_read: false,
  is_edited: false,
  is_deleted: false,
  ...overrides,
} as Message);
