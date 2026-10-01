/**
 * X13 — Handoff iOS : la fiche événement ouverte sur l'iPhone se reprend en un
 * geste sur le Mac ou l'iPad (Safari ouvre la même page eventez.online).
 * Seules les pages PUBLIQUES sont publiées : jamais un billet, un paiement ou
 * une conversation.
 */
import { WEB_BASE_URL } from '../../constants/urls';

type Route = { name?: string; params?: Record<string, unknown> } | undefined;

const PUBLIC_ROUTES: Record<string, (p: Record<string, unknown>) => string | null> = {
  EventDetails: (p) => (p.eventId ? `/events/${encodeURIComponent(String(p.eventId))}` : null),
  OrganizerProfile: (p) => (p.organizerId ? `/organizers/${encodeURIComponent(String(p.organizerId))}` : null),
  SpeakerDetails: (p) => (p.speakerId ? `/speakers/${encodeURIComponent(String(p.speakerId))}` : null),
};

/** URL web publique équivalente à l'écran courant, ou null. */
export function handoffUrlForRoute(route: Route): string | null {
  if (!route?.name) return null;
  const build = PUBLIC_ROUTES[route.name];
  if (!build) return null;
  const path = build(route.params || {});
  return path ? `${WEB_BASE_URL.replace(/\/$/, '')}${path}` : null;
}
