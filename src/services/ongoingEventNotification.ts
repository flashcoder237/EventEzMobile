/**
 * X2 — notification « jour J » épinglée (Android, Notifee).
 *
 * De H-3 jusqu'à la fin de l'événement, une notification permanente,
 * teintée aux couleurs de l'événement, avec un chronomètre (avant : jusqu'au
 * début ; pendant : jusqu'à la fin) et deux actions « Mon billet » et
 * « Itinéraire ». Pendant l'événement, la session en cours si l'agenda est
 * connu (rafraîchie quand l'app est ouverte).
 *
 * Contraintes (aucun code natif, aucune permission nouvelle) :
 *   - déclencheurs Notifee `TIMESTAMP` SANS alarmManager → WorkManager,
 *     INEXACT (jamais SCHEDULE_EXACT_ALARM), jamais de service au premier plan ;
 *   - deux notifications planifiées par inscription : « avant » (H-3, retirée
 *     d'elle-même au début via timeoutAfter) et « pendant » (au début, retirée
 *     à la fin) ;
 *   - retirées au scan (`checkin_welcome`) et jamais recréées ensuite ;
 *   - réglage utilisateur (activé par défaut) ; rien si les notifications
 *     sont coupées.
 *
 * Variante organisateur : « Scanner en service » tant que l'écran de scan est
 * ouvert (chronomètre montant).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { eventTint, tintFor } from '../lib/utils/themeTint';
import { DEFAULT_DURATION_MS } from '../lib/utils/ticketPhase';

export const ONGOING_CHANNEL_ID = 'event_day';
const PREF_KEY = 'eventez_ongoing_event_notif';
const STATE_KEY = 'eventez_ongoing_event_state_v1';
/** Ce que pushNotificationService / useEventReminders persistent. */
const REMINDER_SETTINGS_KEY = 'eventez_notification_settings';

export const BEFORE_MS = 3 * 60 * 60 * 1000;
/** On ne planifie que les événements proches (le reste sera planifié plus tard). */
const HORIZON_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 3;

export interface OngoingTicket {
  registrationId: string;
  event: any;
  /** Session en cours (titre), si l'agenda est disponible. */
  currentSession?: string | null;
}

export type OngoingPlanItem = {
  id: string;
  phase: 'before' | 'during';
  /** null = afficher maintenant. */
  at: number | null;
  /** Retrait automatique après (ms) depuis l'affichage. */
  timeoutAfter: number;
  /** Cible du chronomètre (début ou fin). */
  countdownTo: number;
};

function eventWindow(event: any): { start: number; end: number } | null {
  const start = Date.parse(event?.start_date);
  if (!Number.isFinite(start)) return null;
  const rawEnd = event?.end_date ? Date.parse(event.end_date) : NaN;
  const end = Number.isFinite(rawEnd) && rawEnd > start ? rawEnd : start + DEFAULT_DURATION_MS;
  return { start, end };
}

/** Planning pur (testé) : quoi afficher, quand, et jusqu'à quand. */
export function planOngoing(registrationId: string, event: any, now: number): OngoingPlanItem[] {
  const w = eventWindow(event);
  if (!w || now >= w.end) return [];
  const items: OngoingPlanItem[] = [];
  const beforeId = `ongoing:${registrationId}:before`;
  const duringId = `ongoing:${registrationId}:during`;
  if (now < w.start) {
    const showAt = w.start - BEFORE_MS;
    items.push({
      id: beforeId,
      phase: 'before',
      at: now >= showAt ? null : showAt,
      timeoutAfter: w.start - Math.max(now, showAt),
      countdownTo: w.start,
    });
  }
  items.push({
    id: duringId,
    phase: 'during',
    at: now >= w.start ? null : w.start,
    timeoutAfter: w.end - Math.max(now, w.start),
    countdownTo: w.end,
  });
  return items;
}

interface PersistedState {
  /** registrationId → ids de notification planifiés/affichés. */
  scheduled: Record<string, string[]>;
  checkedIn: string[];
}

async function readState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return { scheduled: s?.scheduled || {}, checkedIn: Array.isArray(s?.checkedIn) ? s.checkedIn.slice(-100) : [] };
  } catch {
    return { scheduled: {}, checkedIn: [] };
  }
}

async function writeState(s: PersistedState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(s)).catch(() => {});
}

function loadNotifee(): any | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@notifee/react-native');
  } catch {
    return null;
  }
}

/** Préférence utilisateur (activée par défaut). */
export async function isOngoingEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREF_KEY)) !== 'false';
  } catch {
    return true;
  }
}

/** Notifications autorisées par le système ET par les réglages de l'app. */
async function notificationsAllowed(notifee: any): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
    if (raw && JSON.parse(raw)?.enabled === false) return false;
  } catch {
    /* réglage illisible : on s'en remet au système */
  }
  try {
    const settings = await notifee.default.getNotificationSettings?.();
    if (settings && typeof settings.authorizationStatus === 'number') return settings.authorizationStatus >= 1;
  } catch {
    /* API indisponible */
  }
  return true;
}

let channelReady = false;
async function ensureChannel(notifee: any): Promise<void> {
  if (channelReady) return;
  await notifee.default.createChannel({
    id: ONGOING_CHANNEL_ID,
    name: i18n.t('ongoing.channelName', { defaultValue: 'Jour de l’événement' }),
    // Discrète : épinglée dans le volet, sans son ni bannière.
    importance: notifee.AndroidImportance?.LOW ?? 2,
    vibration: false,
  });
  channelReady = true;
}

function buildNotification(notifee: any, ticket: OngoingTicket, item: OngoingPlanItem): any {
  const ev = ticket.event || {};
  const t = i18n.t.bind(i18n);
  const title = String(ev.title || t('ongoing.eventFallback', { defaultValue: 'Votre événement' }));
  const place = [ev.location_name, ev.location_city].filter(Boolean).join(', ');
  const body =
    item.phase === 'before'
      ? place
        ? t('ongoing.beforeBodyAt', { place, defaultValue: 'Commence bientôt · {{place}}' })
        : t('ongoing.beforeBody', { defaultValue: 'Commence bientôt' })
      : ticket.currentSession
        ? t('ongoing.duringSession', { session: ticket.currentSession, defaultValue: 'En ce moment : {{session}}' })
        : t('ongoing.duringBody', { defaultValue: 'En cours · votre billet est prêt' });
  const lat = ev.location_latitude ?? null;
  const lng = ev.location_longitude ?? null;
  const data: Record<string, string> = {
    notification_type: 'registration_confirmation',
    registration_id: String(ticket.registrationId),
    event_id: String(ev.slug || ev.id || ''),
    ongoing: '1',
  };
  if (lat != null && lng != null) {
    data.latitude = String(lat);
    data.longitude = String(lng);
  } else if (place) {
    data.venue_name = place;
  }
  const isOnline = ev.location_type === 'online';
  const actions: any[] = [
    { title: t('notifications.actions.showTicket'), pressAction: { id: 'show_ticket', launchActivity: 'default' } },
  ];
  if (!isOnline && (data.latitude || data.venue_name)) {
    actions.push({ title: t('notifications.actions.directions'), pressAction: { id: 'directions', launchActivity: 'default' } });
  }
  return {
    id: item.id,
    title,
    body,
    data,
    android: {
      channelId: ONGOING_CHANNEL_ID,
      smallIcon: 'ic_notification',
      color: tintFor(eventTint(ev), false),
      colorized: true,
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: true,
      showTimestamp: true,
      timestamp: item.countdownTo,
      showChronometer: true,
      chronometerDirection: 'down',
      timeoutAfter: Math.max(60_000, item.timeoutAfter),
      importance: notifee.AndroidImportance?.LOW ?? 2,
      visibility: notifee.AndroidVisibility?.PUBLIC ?? 1,
      pressAction: { id: 'default', launchActivity: 'default' },
      actions,
    },
  };
}

async function cancelIds(notifee: any, ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id) => Promise.resolve(notifee.default.cancelNotification(id)).catch(() => {})),
  );
}

export const ongoingEvent = {
  /**
   * (Re)planifie les notifications des billets proches. À appeler quand la
   * liste des billets est connue (Mes billets) ; idempotent.
   */
  async sync(tickets: OngoingTicket[], now: number = Date.now()): Promise<void> {
    const notifee = loadNotifee();
    if (!notifee) return;
    const state = await readState();
    const allowed = (await isOngoingEnabled()) && (await notificationsAllowed(notifee));
    const wanted = allowed
      ? tickets
          .filter((tk) => !state.checkedIn.includes(String(tk.registrationId)))
          .filter((tk) => {
            const w = eventWindow(tk.event);
            return !!w && w.end > now && w.start - now < HORIZON_MS && tk.event?.location_type !== 'online';
          })
          .sort((a, b) => Date.parse(a.event.start_date) - Date.parse(b.event.start_date))
          .slice(0, MAX_EVENTS)
      : [];

    // Retire ce qui n'est plus voulu (annulé, passé, réglage coupé…).
    const keep = new Set(wanted.map((tk) => String(tk.registrationId)));
    for (const [regId, ids] of Object.entries(state.scheduled)) {
      if (!keep.has(regId)) {
        await cancelIds(notifee, ids);
        delete state.scheduled[regId];
      }
    }
    if (wanted.length) {
      try {
        await ensureChannel(notifee);
      } catch {
        return;
      }
    }
    for (const tk of wanted) {
      const plan = planOngoing(String(tk.registrationId), tk.event, now);
      for (const item of plan) {
        const n = buildNotification(notifee, tk, item);
        try {
          if (item.at == null) {
            await notifee.default.displayNotification(n);
          } else {
            // TIMESTAMP sans alarmManager = WorkManager : inexact, aucune
            // permission d'alarme exacte.
            await notifee.default.createTriggerNotification(n, {
              type: notifee.TriggerType?.TIMESTAMP ?? 0,
              timestamp: item.at,
            });
          }
        } catch (error) {
          if (__DEV__) console.warn('[Ongoing] schedule failed:', error);
        }
      }
      state.scheduled[String(tk.registrationId)] = plan.map((p) => p.id);
    }
    await writeState(state);
  },

  /** Billet scanné : la notification disparaît et n'est plus recréée. */
  async onCheckedIn(registrationId: string | number | null | undefined): Promise<void> {
    if (registrationId == null || registrationId === '') return;
    const notifee = loadNotifee();
    const state = await readState();
    const key = String(registrationId);
    if (!state.checkedIn.includes(key)) state.checkedIn.push(key);
    const ids = state.scheduled[key] || [`ongoing:${key}:before`, `ongoing:${key}:during`];
    if (notifee) await cancelIds(notifee, ids);
    delete state.scheduled[key];
    await writeState(state);
  },

  /** Réglage coupé → tout est retiré. */
  async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(PREF_KEY, enabled ? 'true' : 'false').catch(() => {});
    if (!enabled) await ongoingEvent.clearAll();
  },

  async clearAll(): Promise<void> {
    const notifee = loadNotifee();
    const state = await readState();
    if (notifee) {
      for (const ids of Object.values(state.scheduled)) await cancelIds(notifee, ids);
    }
    state.scheduled = {};
    await writeState(state);
  },

  /** Organisateur : « Scanner en service » tant que l'écran de scan est ouvert. */
  async scannerOn(eventId: string, eventTitle?: string | null, tint?: any): Promise<void> {
    const notifee = loadNotifee();
    if (!notifee) return;
    if (!(await isOngoingEnabled()) || !(await notificationsAllowed(notifee))) return;
    try {
      await ensureChannel(notifee);
      await notifee.default.displayNotification({
        id: `scanner:${eventId}`,
        title: i18n.t('ongoing.scannerTitle', { defaultValue: 'Scanner en service' }),
        body: eventTitle || undefined,
        data: { notification_type: 'scanner_active', event_id: String(eventId) },
        android: {
          channelId: ONGOING_CHANNEL_ID,
          smallIcon: 'ic_notification',
          color: tintFor(tint ?? null, false),
          colorized: true,
          ongoing: true,
          autoCancel: false,
          onlyAlertOnce: true,
          showTimestamp: true,
          timestamp: Date.now(),
          showChronometer: true,
          // Sécurité : jamais orpheline plus de 12 h si l'app est tuée.
          timeoutAfter: 12 * 60 * 60 * 1000,
          importance: notifee.AndroidImportance?.LOW ?? 2,
          pressAction: { id: 'default', launchActivity: 'default' },
        },
      });
    } catch (error) {
      if (__DEV__) console.warn('[Ongoing] scanner notif failed:', error);
    }
  },

  async scannerOff(eventId: string): Promise<void> {
    const notifee = loadNotifee();
    if (!notifee) return;
    await Promise.resolve(notifee.default.cancelNotification(`scanner:${eventId}`)).catch(() => {});
  },
};

export default ongoingEvent;

/** Session en cours (titre) dans un agenda, ou null. */
export function currentSessionTitle(
  sessions: Array<{ title?: string | null; start_time?: string | null; end_time?: string | null }> | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!Array.isArray(sessions)) return null;
  const live = sessions
    .filter((s) => {
      const a = Date.parse(String(s.start_time));
      const b = Date.parse(String(s.end_time));
      return Number.isFinite(a) && Number.isFinite(b) && a <= now && now < b && !!s.title;
    })
    .sort((x, y) => Date.parse(String(y.start_time)) - Date.parse(String(x.start_time)));
  return live.length ? String(live[0].title) : null;
}
