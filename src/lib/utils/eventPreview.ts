/**
 * Convertit `EventFormState` (form en cours dans EventCreateScreen) en
 * `Partial<Event>` pour le mode preview de EventDetailsScreen.
 *
 * Pas un round-trip 1:1 — l'objectif est de produire un objet "ressemblant à
 * un Event" suffisamment riche pour que la preview affiche le hero, les infos
 * de base, l'agenda et les tickets. Les champs absents (organizer, status,
 * counters) sont remplis avec des valeurs par défaut neutres.
 *
 * Pure (testable). Pas de I/O. Le shape Event vient de `types/index.ts`.
 */

import { Event, EventType, LocationType, Category, User, TicketType, Session } from '../../types';
import type { EventFormState } from '../../hooks/useEventForm';

const DEFAULT_PREVIEW_USER: Partial<User> = {
  id: 'preview-user',
  email: 'preview@eventez.local',
  username: 'preview',
};

export function formToPreviewEvent(
  form: EventFormState,
  organizer?: User | null,
): Partial<Event> {
  const category: Category | undefined = form.categories.find((c) => c.id === form.categoryId);

  // Tickets : map shape form → shape API (Decimal price, ISO dates).
  const ticket_types: TicketType[] = form.ticketTypes.map((t, idx) => ({
    id: -idx - 1, // ID négatif pour signaler "preview only"
    event: 'preview',
    name: t.name,
    description: t.description,
    price: t.price,
    quantity_total: parseInt(t.quantity_total || '0', 10) || 0,
    quantity_sold: 0,
    sales_start: t.sales_start.toISOString(),
    sales_end: t.sales_end.toISOString(),
    is_visible: t.is_visible,
    max_per_order: parseInt(t.max_per_order || '0', 10) || 1,
    min_per_order: parseInt(t.min_per_order || '0', 10) || 1,
  } as unknown as TicketType));

  // Sessions : pareil, on serialise les dates et on remplit l'event_id
  // factice 'preview' pour ne pas casser les composants downstream.
  const sessions: Session[] = (form.sessions || []).map((s, idx) => ({
    id: `preview-session-${idx}`,
    event: 'preview',
    title: s.title,
    description: s.description || '',
    start_time: s.start_time ? s.start_time.toISOString() : '',
    end_time: s.end_time ? s.end_time.toISOString() : '',
    location: s.location || '',
    session_type: s.session_type,
  } as unknown as Session));

  return {
    id: 'preview',
    title: form.title || 'Titre de votre événement',
    slug: 'preview',
    description: form.description || '',
    short_description: form.shortDescription || '',
    event_type: form.eventType as EventType,
    start_date: form.startDate.toISOString(),
    end_date: form.endDate.toISOString(),
    registration_deadline: form.hasRegistrationDeadline && form.registrationDeadline
      ? form.registrationDeadline.toISOString()
      : undefined,
    location_type: form.locationType as LocationType,
    location_name: form.locationName,
    location_address: form.locationAddress,
    location_city: form.locationCity,
    location_country: form.locationCountry,
    location_latitude: form.locationLatitude ? parseFloat(form.locationLatitude) : undefined,
    location_longitude: form.locationLongitude ? parseFloat(form.locationLongitude) : undefined,
    online_url: form.onlineUrl,
    online_platform: form.onlinePlatform,
    online_instructions: form.onlineInstructions,
    online_meeting_id: form.onlineMeetingId,
    online_passcode: form.onlinePasscode,
    banner_image: form.bannerImage || undefined,
    gallery_images: form.galleryImages.map((uri, i) => ({ id: -i - 1, image: uri } as any)),
    category,
    organizer: (organizer || DEFAULT_PREVIEW_USER) as User,
    organizer_name: organizer?.first_name
      ? `${organizer.first_name} ${organizer.last_name || ''}`.trim()
      : 'Organisateur',
    tags: [],
    status: 'draft',
    is_featured: false,
    view_count: 0,
    registration_count: 0,
    visibility: form.visibility,
    access_code: form.accessCode,
    has_access_code: !!form.accessCode,
    auto_approve_registrations: form.autoApproveRegistrations,
    fee_bearer: form.feeBearer,
    max_participants: form.maxParticipants ? parseInt(form.maxParticipants, 10) : undefined,
    is_recurring: false,
    ticket_types,
    // sessions est exposé via /sessions/?event= dans la vraie app — la preview
    // n'a pas accès à ça mais le hook useEventDetails skip les fetches en
    // preview, donc on stock juste sur l'event pour les rendus locaux.
    ...(sessions.length > 0 ? { sessions } : {}),
  } as Partial<Event>;
}
