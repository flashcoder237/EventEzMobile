/**
 * Tests du résolveur de cible au clic sur notification.
 * Verrouille notamment les distinctions PARTICIPANT vs ORGANISATEUR (retour
 * testeur : "inscription non terminée" renvoyait vers la vue organisateur).
 */
import { resolveNotificationTarget } from '../resolveTarget';

// Fabrique une notif minimale ; on ne type pas strictement (le résolveur lit
// des champs optionnels), on passe l'essentiel.
const notif = (over: Record<string, any>): any => ({
  notification_type: 'system_message',
  related_object_id: null,
  related_object_type: null,
  extra_data: {},
  ...over,
});

describe('resolveNotificationTarget', () => {
  it('abandoned_registration → écran Payment de l\'inscription commencée', () => {
    const target = resolveNotificationTarget(notif({
      notification_type: 'abandoned_registration',
      related_object_id: 'reg-123',
      related_object_type: 'registration',
      extra_data: { registration_id: 'reg-123', event_id: 'evt-1' },
    }));
    expect(target).toEqual({ screen: 'Payment', params: { registrationId: 'reg-123' } });
  });

  it('abandoned_registration sans registration_id → fallback MyTickets (jamais organisateur)', () => {
    const target = resolveNotificationTarget(notif({
      notification_type: 'abandoned_registration',
      related_object_id: 'evt-1',
      related_object_type: 'registration',
      extra_data: {},
    }));
    // Ne doit PAS ouvrir EventRegistrations (vue organisateur)
    expect(target).toEqual({ tab: 'MyTickets' });
  });

  it('new_registration (organisateur) → EventRegistrations', () => {
    const target = resolveNotificationTarget(notif({
      notification_type: 'new_registration',
      related_object_id: 'evt-1',
      related_object_type: 'event',
    }));
    expect(target).toEqual({ screen: 'EventRegistrations', params: { eventId: 'evt-1' } });
  });

  it('fallback générique : related_object_type=registration → RegistrationDetails', () => {
    const target = resolveNotificationTarget(notif({
      notification_type: 'unknown_type_xyz',
      related_object_id: 'reg-9',
      related_object_type: 'registration',
    }));
    expect(target).toEqual({ screen: 'RegistrationDetails', params: { registrationId: 'reg-9' } });
  });

  it('event_changes_requested → EventEdit', () => {
    const target = resolveNotificationTarget(notif({
      notification_type: 'event_changes_requested',
      related_object_id: 'evt-1',
      related_object_type: 'event',
    }));
    expect(target).toEqual({ screen: 'EventEdit', params: { eventId: 'evt-1' } });
  });

  it('payment_confirmation → MyPayments', () => {
    const target = resolveNotificationTarget(notif({
      notification_type: 'payment_confirmation',
    }));
    expect(target).toEqual({ screen: 'MyPayments' });
  });
});
