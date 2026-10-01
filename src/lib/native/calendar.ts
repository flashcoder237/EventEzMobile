/**
 * X6 — « Ajouter à mon agenda » via l'écran natif du système (expo-calendar).
 *
 * `createEventInCalendarAsync` ouvre l'éditeur d'événement d'iOS / l'appli
 * Agenda d'Android, pré-rempli : l'utilisateur choisit son calendrier et
 * valide lui-même. Aucune permission d'accès aux calendriers n'est demandée
 * (iOS 17+ : l'éditeur système n'en exige pas ; Android : intent d'insertion).
 * Les permissions READ/WRITE_CALENDAR qu'ajoute le plugin sont bloquées
 * dans app.json (`blockedPermissions`) — rien à déclarer au Play Store.
 */
import { Platform } from 'react-native';
import { WEB_BASE_URL } from '../../constants/urls';
import { DEFAULT_DURATION_MS } from '../utils/ticketPhase';

export type NativeCalendarResult = 'saved' | 'canceled' | 'unavailable';

interface CalendarEventSource {
  id?: string | number;
  slug?: string;
  title?: string;
  start_date?: string;
  end_date?: string | null;
  location_name?: string | null;
  location_city?: string | null;
  short_description?: string | null;
  timezone?: string | null;
}

function calendarModule(): typeof import('expo-calendar') | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-calendar');
  } catch {
    return null;
  }
}

/** Données passées à l'éditeur système (pure, testée). */
export function buildCalendarEvent(event: CalendarEventSource) {
  const start = new Date(event.start_date || '');
  const parsedEnd = event.end_date ? new Date(event.end_date) : null;
  const end =
    parsedEnd && !Number.isNaN(parsedEnd.getTime()) && parsedEnd > start
      ? parsedEnd
      : new Date(start.getTime() + DEFAULT_DURATION_MS);
  const location = [event.location_name, event.location_city].filter(Boolean).join(', ');
  const url = `${WEB_BASE_URL.replace(/\/$/, '')}/events/${event.slug || event.id}`;
  return {
    title: event.title || '',
    startDate: start,
    endDate: end,
    location: location || undefined,
    notes: [event.short_description, url].filter(Boolean).join('\n\n'),
    url,
    timeZone: event.timezone || undefined,
  };
}

export function nativeCalendarAvailable(): boolean {
  const Calendar = calendarModule();
  return !!Calendar && typeof Calendar.createEventInCalendarAsync === 'function';
}

export async function addToNativeCalendar(event: CalendarEventSource): Promise<NativeCalendarResult> {
  const Calendar = calendarModule();
  if (!Calendar?.createEventInCalendarAsync) return 'unavailable';
  const data = buildCalendarEvent(event);
  if (Number.isNaN(data.startDate.getTime())) return 'unavailable';
  try {
    const result = await Calendar.createEventInCalendarAsync(data);
    // Android ne sait pas dire si l'événement a été enregistré (« done ») :
    // on ne prétend un succès que quand le système le confirme.
    return result?.action === 'saved' ? 'saved' : 'canceled';
  } catch {
    return 'unavailable';
  }
}
