/**
 * X14 — Live Activity organisateur : compteur d'accueil pendant le scan.
 *
 * Honnêteté : le compteur est celui des personnes accueillies DEPUIS CE
 * TÉLÉPHONE (stats du scanner), pas le total de l'événement — le libellé le dit.
 * L'activité démarre au premier scan réussi (pas avant : ouvrir le scanner
 * par curiosité ne doit rien épingler sur l'écran verrouillé), reste visible
 * quand l'organisateur passe sur une autre app, et se ferme à la fin de
 * l'événement (vérifié par NativeBridgesHost à chaque retour dans l'app).
 */
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  endLiveActivity,
  liveActivitiesEnabled,
  startLiveActivity,
  updateLiveActivity,
} from '../../../modules/eventez-native/src';
import { DEFAULT_DURATION_MS } from '../utils/ticketPhase';
import { tn } from './i18n';

const STORE_KEY = '@eventez_organizer_activity';

interface StoredActivity {
  key: string;
  endsAt: number;
}

function organizerKey(eventId: string) {
  return `org:${eventId}`;
}

function eventEnd(event: any): number {
  const start = Date.parse(event?.start_date);
  const end = Date.parse(event?.end_date);
  if (Number.isFinite(end)) return end;
  if (Number.isFinite(start)) return start + DEFAULT_DURATION_MS;
  return Date.now() + DEFAULT_DURATION_MS;
}

export function useOrganizerLiveActivity(eventId: string | undefined, event: any, checkedIn: number): void {
  const started = useRef(false);

  useEffect(() => {
    if (!eventId || checkedIn <= 0 || !liveActivitiesEnabled()) return;
    const key = organizerKey(eventId);
    const state = { phase: 'checkin', checkedIn, capacity: null };
    const endsAt = eventEnd(event);
    if (!started.current) {
      started.current = true;
      void startLiveActivity(
        {
          kind: 'organizer',
          key,
          title: String(event?.title || ''),
          venue: event?.location_name || null,
          deepLink: `eventez://event-registrations/${eventId}`,
          labels: { checkins: tn('liveActivity.checkins') },
        },
        state,
        endsAt,
      );
      AsyncStorage.setItem(STORE_KEY, JSON.stringify({ key, endsAt } satisfies StoredActivity)).catch(() => {});
    } else {
      void updateLiveActivity(key, state, endsAt);
    }
  }, [eventId, event, checkedIn]);
}

/** Ferme l'activité organisateur si l'événement est terminé. */
export async function endExpiredOrganizerActivity(now: number = Date.now()): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw) as StoredActivity;
    if (stored.endsAt > now) return;
    await endLiveActivity(stored.key, true);
    await AsyncStorage.removeItem(STORE_KEY);
  } catch {
    /* best-effort */
  }
}
