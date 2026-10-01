/**
 * Actions de notification (round 3, P4) : catégories, routage via
 * resolveNotificationTarget, effets de bord (marquer lu, réponse, « J'y vais »).
 */
import { Linking } from 'react-native';
import { resolveNotificationTarget } from '../resolveTarget';
import {
  actionsForCategory,
  androidActionsFor,
  categoryForData,
  directionsUrl,
  performNotificationAction,
  routeDataForAction,
} from '../notificationActions';

const mockMarkAsRead = jest.fn(() => Promise.resolve({}));
const mockSendMessage = jest.fn(() => Promise.resolve({}));
const mockSetAttendanceIntent = jest.fn(() => Promise.resolve({}));
jest.mock('../../../api', () => ({
  notificationsAPI: { markAsRead: (...a: any[]) => (mockMarkAsRead as any)(...a) },
  messagesAPI: { sendMessage: (...a: any[]) => (mockSendMessage as any)(...a) },
  registrationsAPI: { setAttendanceIntent: (...a: any[]) => (mockSetAttendanceIntent as any)(...a) },
}));

/** Même construction que NotificationContext.handleNotificationNavigation. */
function targetOf(data: Record<string, any>) {
  return resolveNotificationTarget({
    notification_type: data.notification_type,
    related_object_type: data.related_object_type,
    related_object_id: data.related_object_id,
    extra_data: { ...data },
  } as any);
}

beforeEach(() => jest.clearAllMocks());

describe('catégories', () => {
  it('le categoryId du backend prime', () => {
    expect(categoryForData({ categoryId: 'seat_held', notification_type: 'new_message' })).toBe('seat_held');
  });

  it('repli par type (même règle que le backend)', () => {
    expect(categoryForData({ notification_type: 'event_today' })).toBe('ticket_day');
    expect(categoryForData({ notification_type: 'event_reminder', reminder_kind: 'day_before' })).toBe('reminder');
    expect(categoryForData({ notification_type: 'event_reminder', registration_id: 'r1' })).toBe('ticket_day');
    expect(categoryForData({ notification_type: 'new_message' })).toBe('message');
    expect(categoryForData({ notification_type: 'event_live' })).toBe('live');
    expect(categoryForData({ notification_type: 'waitlist_available', kind: 'seat_held' })).toBe('seat_held');
    expect(categoryForData({ notification_type: 'waitlist_available' })).toBeNull();
    expect(categoryForData({ notification_type: 'connection_arrived' })).toBe('connection');
    expect(categoryForData({ notification_type: 'payment_confirmation' })).toBeNull();
  });

  it('chaque catégorie a ses boutons', () => {
    expect(actionsForCategory('ticket_day').map((a) => a.id)).toEqual(['show_ticket', 'directions']);
    expect(actionsForCategory('reminder').map((a) => a.id)).toEqual(['going', 'show_ticket']);
    expect(actionsForCategory('message').map((a) => a.id)).toEqual(['reply', 'mark_read']);
    expect(actionsForCategory('live').map((a) => a.id)).toEqual(['join_live']);
    expect(actionsForCategory('seat_held').map((a) => a.id)).toEqual(['pay_now']);
    expect(actionsForCategory('connection').map((a) => a.id)).toEqual(['write_to']);
  });

  it('Android : « Répondre » n’ouvre pas l’app et porte une saisie', () => {
    const [reply, markRead] = androidActionsFor('message');
    expect(reply.pressAction).toEqual({ id: 'reply' });
    expect(reply.input).toBeDefined();
    expect(markRead.pressAction).toEqual({ id: 'mark_read' });
    const [showTicket] = androidActionsFor('ticket_day');
    expect(showTicket.pressAction.launchActivity).toBe('default');
  });
});

describe('routage via resolveNotificationTarget', () => {
  const base = { event_id: 'e1', registration_id: 'r1', screen: 'EventDetails', params: { eventId: 'e1' } };

  it('Afficher / Voir le billet → RegistrationDetails', () => {
    const data = routeDataForAction('show_ticket', base)!;
    expect(data.screen).toBeUndefined();
    expect(targetOf(data)).toEqual({ screen: 'RegistrationDetails', params: { registrationId: 'r1' } });
  });

  it('Rejoindre → section visio de la fiche', () => {
    expect(targetOf(routeDataForAction('join_live', base)!)).toEqual({
      screen: 'EventDetails', params: { eventId: 'e1', initialTab: 'virtual' },
    });
  });

  it('Payer maintenant → fiche avec la place gardée', () => {
    const data = routeDataForAction('pay_now', { ...base, hold_expires_at: '2026-10-01T10:15:00Z' })!;
    expect(targetOf(data)).toEqual({
      screen: 'EventDetails', params: { eventId: 'e1', seatHeldUntil: '2026-10-01T10:15:00Z' },
    });
  });

  it('Lui écrire → conversation directe', () => {
    const data = routeDataForAction('write_to', { connection_user_id: 42, connection_name: 'Karim' })!;
    expect(targetOf(data)).toEqual({ screen: 'Conversation', params: { userId: '42', userName: 'Karim' } });
  });
});

describe('effets de bord', () => {
  it('Marquer comme lu : appel API, aucun écran', async () => {
    await expect(performNotificationAction('mark_read', { notification_id: 'n1' })).resolves.toBeNull();
    expect(mockMarkAsRead).toHaveBeenCalledWith('n1');
  });

  it('Répondre avec texte : envoi, aucun écran', async () => {
    await expect(performNotificationAction('reply', { conversation_id: 'c1' }, '  Merci !  ')).resolves.toBeNull();
    expect(mockSendMessage).toHaveBeenCalledWith({ content: 'Merci !', conversation: 'c1' });
  });

  it('Répondre en échec : ouvre la conversation au lieu de perdre la réponse', async () => {
    mockSendMessage.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    const data = await performNotificationAction('reply', { conversation_id: 'c1', related_object_type: 'conversation', related_object_id: 'c1' }, 'ok');
    expect(targetOf(data!)).toEqual({ screen: 'Conversation', params: { conversationId: 'c1' } });
  });

  it("J'y vais : déclare l'intention puis ouvre le billet", async () => {
    const data = await performNotificationAction('going', { registration_id: 'r1' });
    expect(mockSetAttendanceIntent).toHaveBeenCalledWith('r1', 'going');
    expect(targetOf(data!)).toEqual({ screen: 'RegistrationDetails', params: { registrationId: 'r1' } });
  });

  it("J'y vais : endpoint absent (vieux backend) → ouvre quand même le billet", async () => {
    mockSetAttendanceIntent.mockImplementationOnce(() => Promise.reject({ response: { status: 404 } }));
    const data = await performNotificationAction('going', { registration_id: 'r1' });
    expect(targetOf(data!)).toEqual({ screen: 'RegistrationDetails', params: { registrationId: 'r1' } });
  });

  it('Itinéraire : ouvre les cartes si le push porte un lieu, sinon la fiche', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
    expect(directionsUrl({ latitude: '4.05', longitude: '9.7' })).toContain('destination=4.05,9.7');
    await expect(performNotificationAction('directions', { latitude: 4.05, longitude: 9.7 })).resolves.toBeNull();
    expect(spy).toHaveBeenCalled();
    const fallback = await performNotificationAction('directions', { event_id: 'e1' });
    expect(targetOf(fallback!)).toEqual({ screen: 'EventDetails', params: { eventId: 'e1' } });
    spy.mockRestore();
  });
});
