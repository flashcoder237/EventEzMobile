/**
 * Prochain billet pour la ligne d'accueil (R3 W3).
 *
 * Billet confirmé et réglé, événement de J0 à J+2 avec des coordonnées : la
 * météo est toujours celle du LIEU DE L'ÉVÉNEMENT, jamais celle du téléphone.
 * Source : le cache « Mes billets » (pas de requête lourde en plus) ; à défaut,
 * une seule lecture réseau qui alimente ce même cache.
 */
import { registrationsAPI } from '../api';
import CacheService from '../services/CacheService';
import { isRegistrationUnsettled } from '../utils/paymentSettled';

export interface NextTicketEvent {
  id: string;
  title: string;
  city?: string;
  lat: number;
  lng: number;
  start_date: string;
  /** 0 = aujourd'hui, 1 = demain, 2 = après-demain (jours calendaires locaux). */
  daysAway: number;
}

const ACTIVE = new Set(['confirmed', 'checked_in']);

export function calendarDaysUntil(start: string | Date, now: Date): number {
  const d = new Date(start);
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86400000);
}

export function pickNextTicketEvent(registrations: any[], now: Date = new Date()): NextTicketEvent | null {
  let best: NextTicketEvent | null = null;
  for (const reg of Array.isArray(registrations) ? registrations : []) {
    if (!reg || !ACTIVE.has(String(reg.status)) || isRegistrationUnsettled(reg)) continue;
    const ev = reg.event_detail && typeof reg.event_detail === 'object'
      ? reg.event_detail
      : reg.event && typeof reg.event === 'object' ? reg.event : null;
    if (!ev?.start_date) continue;
    const lat = Number(ev.location_latitude);
    const lng = Number(ev.location_longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
    const startMs = new Date(ev.start_date).getTime();
    const endMs = ev.end_date ? new Date(ev.end_date).getTime() : startMs;
    if (!Number.isFinite(startMs) || Math.max(startMs, endMs) < now.getTime()) continue;
    const daysAway = calendarDaysUntil(ev.start_date, now);
    if (daysAway < 0 || daysAway > 2) continue;
    if (!best || startMs < new Date(best.start_date).getTime()) {
      best = {
        id: String(ev.id),
        title: String(ev.title || ''),
        city: ev.location_city || undefined,
        lat,
        lng,
        start_date: ev.start_date,
        daysAway,
      };
    }
  }
  return best;
}

export async function loadNextTicketEvent(userId: string | number | undefined | null): Promise<NextTicketEvent | null> {
  if (!userId) return null;
  const cacheKey = `my-tickets:${userId}`;
  try {
    const cached = await CacheService.get<any[]>(cacheKey);
    if (cached?.data) return pickNextTicketEvent(cached.data);
    const res: any = await registrationsAPI.getMyRegistrations();
    const data = res?.data?.results || res?.data || [];
    CacheService.set(cacheKey, data, 2 * 60 * 1000);
    return pickNextTicketEvent(data);
  } catch {
    return null;
  }
}
