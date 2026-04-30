// Centralized URL constants for EventEz Mobile

export const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_URL || 'https://eventez.online';

export const DEEP_LINK_SCHEME = 'eventez';

export function getEventUrl(eventId: string): string {
  return `${WEB_BASE_URL}/events/${eventId}`;
}

export function getOrganizerUrl(organizerId: string): string {
  return `${WEB_BASE_URL}/organizers/${organizerId}`;
}

export function getSpeakerUrl(speakerId: string): string {
  return `${WEB_BASE_URL}/speakers/${speakerId}`;
}

export function getVerificationUrl(registrationId: string): string {
  return `${WEB_BASE_URL}/verify/${registrationId}`;
}

// URL ticket-level : encode l'ID d'un TicketPurchase précis pour permettre
// un check-in granulaire par billet (et non plus par registration entière).
// Format reconnu par les scanners web et mobile.
export function getTicketVerificationUrl(ticketId: string | number): string {
  return `${WEB_BASE_URL}/verify/t/${ticketId}`;
}
