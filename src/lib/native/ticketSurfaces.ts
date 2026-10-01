/**
 * Surfaces système du billet : widget (X3), tuile Réglages rapides (X11) et
 * Live Activity participant (X1). Alimentées par la liste « Mes billets »
 * (cache `my-tickets:{userId}`) via NativeBridgesHost.
 *
 * Tout est best-effort : sans module natif (Expo Go, tests, iOS sans
 * l'extension), chaque appel est un no-op.
 */
import {
  endLiveActivity,
  listLiveActivities,
  liveActivitiesEnabled,
  setWidgetData,
  startLiveActivity,
} from '../../../modules/eventez-native/src';
import {
  buildAttendeeActivity,
  buildWidgetPayload,
  NextTicket,
  pickNextTicket,
  shouldShowAttendeeActivity,
} from './nextTicket';
import { nativeLocale, tn } from './i18n';

const ATTENDEE_PREFIX = 'reg:';

function widgetLabels() {
  return {
    header: tn('widget.header'),
    empty: tn('widget.empty'),
    live: tn('widget.live'),
    tile: tn('widget.tile'),
  };
}

function activityLabels() {
  return {
    countdown: tn('liveActivity.countdown'),
    live: tn('liveActivity.live'),
    liveShort: tn('liveActivity.liveShort'),
  };
}

async function syncAttendeeActivity(ticket: NextTicket | null, now: number): Promise<void> {
  const wanted = ticket && shouldShowAttendeeActivity(ticket, now) ? `${ATTENDEE_PREFIX}${ticket.registrationId}` : null;
  // Une seule activité participant à la fois : on ferme les autres (billet
  // passé, remboursé, ou remplacé par un événement plus proche).
  for (const key of listLiveActivities()) {
    if (key.startsWith(ATTENDEE_PREFIX) && key !== wanted) {
      await endLiveActivity(key, now >= (ticket?.endsAt ?? 0));
    }
  }
  if (!wanted || !ticket || !liveActivitiesEnabled()) return;
  const { attributes, state, staleDate } = buildAttendeeActivity(ticket, activityLabels(), now);
  await startLiveActivity(attributes, state, staleDate);
}

/** Recalcule le prochain billet et pousse widget + tuile + Live Activity. */
export async function syncTicketSurfaces(regs: any[] | null | undefined, now: Date = new Date()): Promise<NextTicket | null> {
  const ticket = pickNextTicket(regs, now);
  setWidgetData(buildWidgetPayload(ticket, widgetLabels(), nativeLocale()));
  try {
    await syncAttendeeActivity(ticket, now.getTime());
  } catch {
    /* une Live Activity ratée ne doit jamais remonter */
  }
  return ticket;
}

/**
 * Déconnexion : un billet ne reste JAMAIS sur l'écran d'accueil ou l'écran
 * verrouillé d'un appareil dont le compte est sorti.
 */
export async function clearTicketSurfaces(): Promise<void> {
  setWidgetData(buildWidgetPayload(null, widgetLabels(), nativeLocale()));
  for (const key of listLiveActivities()) {
    await endLiveActivity(key, true);
  }
}
