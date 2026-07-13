// Centralized URL constants for EventEz Mobile

export const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_URL || 'https://eventez.online';

export const DEEP_LINK_SCHEME = 'eventez';

export function getEventUrl(eventId: string): string {
  return `${WEB_BASE_URL}/events/${eventId}`;
}

/**
 * URL d'invitation virale vers un événement. Identique à getEventUrl mais
 * ajoute un segment `?ref=u<id>` quand l'utilisateur est connecté, pour tracker
 * l'acquisition organique côté backend (qui a amené qui). Le ref ne contient
 * AUCUNE donnée sensible (juste un préfixe d'ID tronqué). C'est le lien à
 * partager depuis la confirmation, le billet et le QR — jamais la référence
 * privée du billet.
 */
export function getEventInviteUrl(
  eventIdOrSlug: string,
  userId?: string | number | null,
): string {
  const ref = userId ? `?ref=u${String(userId).slice(0, 12)}` : '';
  return `${getEventUrl(eventIdOrSlug)}${ref}`;
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

// URL de la page publique "devenir benevole" pour un event. Cible des
// boutons de partage. La page web a OpenGraph + bouton "Ouvrir dans l'app"
// qui declenche le deep link `eventez://events/{id}/volunteer`.
export function getVolunteerSignupUrl(eventId: string): string {
  return `${WEB_BASE_URL}/events/${eventId}/volunteer`;
}

// URL de la page publique d'invitation d'equipe (token). Cible du bouton
// "Partager le lien" sur une invitation pending. La page web a OpenGraph
// + bouton "Ouvrir dans l'app" qui declenche le deep link
// `eventez://team-invitation/{token}`.
export function getTeamInvitationUrl(token: string): string {
  return `${WEB_BASE_URL}/team-invitation/${token}`;
}

// Locales gérées par le web (next-intl, routing `as-needed` : FR sur `/`, EN
// sur `/en`). Utilisé uniquement pour tolérer un préfixe entrant côté deep link.
export const WEB_LOCALES = ['en', 'fr'] as const;

/**
 * Retire un éventuel segment de locale en tête d'un chemin de deep link.
 *
 * Le web est en routing `as-needed` : le FR (défaut) reste non préfixé
 * (`/events/x`) et l'EN est préfixé (`/en/events/x`). Les AASA (iOS) et
 * intent-filters (Android) ne ciblent QUE les chemins non préfixés, et tous
 * nos builders d'URL émettent du non préfixé — donc en théorie l'app ne reçoit
 * jamais `/en/...`. Ce helper est un filet de sécurité : si un lien EN partagé
 * (ou une future entrée AASA `/en/*`) atteint quand même le routeur, on retombe
 * sur le chemin canonique reconnu par `linking.config.screens`.
 *
 * Ne retire qu'un segment de locale COMPLET en tête (`/en`, `en/`, `/en/…`),
 * jamais un token qui commencerait par "en"/"fr" (`/team-invitation/enXYZ` est
 * intact), ni une locale en position non initiale.
 */
export function stripLocalePrefix(path: string): string {
  const stripped = path.replace(
    new RegExp(`^\\/?(?:${WEB_LOCALES.join('|')})(?=\\/|$)`),
    '',
  );
  return stripped || '/';
}
