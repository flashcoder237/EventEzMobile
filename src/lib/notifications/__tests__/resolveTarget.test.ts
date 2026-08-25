/**
 * Tests EXHAUSTIFS du résolveur de cible au clic sur notification.
 *
 * Couvre TOUS les `notification_type` du switch + le fallback générique par
 * `related_object_type` + les cas limites (null, event object, priorité
 * slug vs id, extra_data vs related_object). Verrouille en particulier les
 * distinctions PARTICIPANT vs ORGANISATEUR (retour testeur : "inscription non
 * terminée" renvoyait vers la vue organisateur).
 */
import { resolveNotificationTarget } from '../resolveTarget';

// Fabrique une notif minimale ; le résolveur lit des champs optionnels.
const notif = (over: Record<string, any>): any => ({
  notification_type: 'system_message',
  related_object_id: null,
  related_object_type: null,
  event: null,
  extra_data: {},
  ...over,
});

describe('resolveNotificationTarget — par notification_type', () => {
  // ─── Modération ───
  it.each(['event_pending_moderation', 'moderation_queue_reminder', 'event_revalidation'])(
    '%s → Moderation',
    (type) => {
      expect(resolveNotificationTarget(notif({ notification_type: type })))
        .toEqual({ screen: 'Moderation' });
    },
  );

  // ─── Événement renvoyé/refusé → ÉDITION (UUID) ───
  it.each(['event_changes_requested', 'event_rejected'])(
    '%s → EventEdit avec eventId',
    (type) => {
      expect(resolveNotificationTarget(notif({
        notification_type: type,
        related_object_id: 'evt-1',
        related_object_type: 'event',
      }))).toEqual({ screen: 'EventEdit', params: { eventId: 'evt-1' } });
    },
  );
  it('event_changes_requested sans eventId → null', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'event_changes_requested' })))
      .toBeNull();
  });

  // ─── Événement — vue détail (utilise eventNav = slug prioritaire) ───
  it.each(['event_validated', 'event_update', 'event_cancelled', 'event_today'])(
    '%s → EventDetails (slug prioritaire)',
    (type) => {
      expect(resolveNotificationTarget(notif({
        notification_type: type,
        event: { id: 'evt-uuid', slug: 'mon-event' },
      }))).toEqual({ screen: 'EventDetails', params: { eventId: 'mon-event' } });
    },
  );

  // ─── Événement — vue ORGANISATEUR (nouvel inscrit) ───
  it('new_registration → EventRegistrations (organisateur)', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'new_registration',
      related_object_id: 'evt-1',
      related_object_type: 'event',
    }))).toEqual({ screen: 'EventRegistrations', params: { eventId: 'evt-1' } });
  });

  // ─── Notifs PARTICIPANT/social sur un event → fiche publique, PAS gestion inscrits ───
  it.each(['event_low_stock', 'follow_registered'])(
    '%s → EventDetails (participant, jamais EventRegistrations)',
    (type) => {
      const target = resolveNotificationTarget(notif({
        notification_type: type,
        related_object_id: 'evt-1',
        related_object_type: 'event',
      }));
      expect(target).toEqual({ screen: 'EventDetails', params: { eventId: 'evt-1' } });
    },
  );

  // ─── Rappel / avis de SESSION → SessionDetails ───
  it('session_reminder → SessionDetails via related_object_type=session', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'session_reminder',
      related_object_id: 'sess-1',
      related_object_type: 'session',
      extra_data: { session_id: 'sess-1' },
    }))).toEqual({ screen: 'SessionDetails', params: { sessionId: 'sess-1' } });
  });
  it('feedback_request AVEC session_id → SessionDetails', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'feedback_request',
      extra_data: { session_id: 'sess-2' },
    }))).toEqual({ screen: 'SessionDetails', params: { sessionId: 'sess-2' } });
  });
  it('feedback_request SANS session (post-event) → EventDetails', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'feedback_request',
      extra_data: { event_id: 'evt-9' },
    }))).toEqual({ screen: 'EventDetails', params: { eventId: 'evt-9' } });
  });

  // ─── Vérification profil (organisateur) ───
  it('verification_reminder → Verification', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'verification_reminder' })))
      .toEqual({ screen: 'Verification' });
  });

  // ─── new_follower : user vs event ───
  it('new_follower (user→user) → Connections', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'new_follower', related_object_type: 'user', related_object_id: 'u-1',
    }))).toEqual({ screen: 'Connections' });
  });
  it('new_follower (suit ton EVENT) → EventDetails', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'new_follower', related_object_type: 'event', related_object_id: 'evt-5',
    }))).toEqual({ screen: 'EventDetails', params: { eventId: 'evt-5' } });
  });

  // ─── system_message signalé (modérateur) → Moderation ───
  it('system_message message_report → Moderation', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'system_message',
      related_object_type: 'message_report', related_object_id: 'rep-1',
    }))).toEqual({ screen: 'Moderation' });
  });

  // ─── exhibitor_appli_received : prend meta.event_id, pas l'id de candidature ───
  it('exhibitor_appli_received → BoothManagement avec meta.event_id', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'exhibitor_appli_received',
      related_object_id: 'appli-1',
      related_object_type: 'booth_application',
      extra_data: { event_id: 'evt-booth' },
    }))).toEqual({ screen: 'BoothManagement', params: { eventId: 'evt-booth' } });
  });

  // ─── Inscription NON finalisée (participant) → Payment ───
  it('abandoned_registration avec registration_id → Payment', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'abandoned_registration',
      related_object_id: 'reg-123',
      related_object_type: 'registration',
      extra_data: { registration_id: 'reg-123', event_id: 'evt-1' },
    }))).toEqual({ screen: 'Payment', params: { registrationId: 'reg-123' } });
  });
  it('abandoned_registration SANS registration_id → MyTickets (jamais organisateur)', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'abandoned_registration',
      related_object_id: 'evt-1',
      related_object_type: 'registration',
      extra_data: {},
    }))).toEqual({ tab: 'MyTickets' });
  });

  // ─── Avis (organisateur) ───
  it('event_feedback → EventReviews', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'event_feedback',
      related_object_id: 'evt-1',
      related_object_type: 'event',
    }))).toEqual({ screen: 'EventReviews', params: { eventId: 'evt-1' } });
  });

  // ─── Billets / inscriptions (participant) ───
  it.each(['registration_confirmation', 'check_in_confirmation'])(
    '%s avec registration_id → RegistrationDetails',
    (type) => {
      expect(resolveNotificationTarget(notif({
        notification_type: type,
        extra_data: { registration_id: 'reg-9' },
      }))).toEqual({ screen: 'RegistrationDetails', params: { registrationId: 'reg-9' } });
    },
  );
  it('registration_confirmation SANS registration_id → MyTickets', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'registration_confirmation' })))
      .toEqual({ tab: 'MyTickets' });
  });

  // ─── Reçus / factures (payeur) ───
  // Sans related_object_type='subscription_payment' → reçus participant.
  it.each(['payment_confirmation', 'payment_failed', 'invoice_ready'])(
    '%s → MyPayments',
    (type) => {
      expect(resolveNotificationTarget(notif({ notification_type: type })))
        .toEqual({ screen: 'MyPayments' });
    },
  );
  it('refund_processed → RefundsList', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'refund_processed' })))
      .toEqual({ screen: 'RefundsList' });
  });
  it('ticket_transfer → MyTickets', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'ticket_transfer' })))
      .toEqual({ tab: 'MyTickets' });
  });

  // ─── Événements suggérés / rappels (participant) → EventDetails ───
  it.each(['waitlist_position', 'connections_at_event', 'followed_organizer_new_event',
    'event_suggestion', 'winback', 'event_reminder'])(
    '%s → EventDetails',
    (type) => {
      expect(resolveNotificationTarget(notif({
        notification_type: type,
        extra_data: { event_slug: 'un-event' },
      }))).toEqual({ screen: 'EventDetails', params: { eventId: 'un-event' } });
    },
  );
  it('event_reminder sans event → null', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'event_reminder' })))
      .toBeNull();
  });

  // ─── Social ───
  it('new_follower → Connections', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'new_follower' })))
      .toEqual({ screen: 'Connections' });
  });

  // ─── Messagerie ───
  it.each(['new_message', 'system_message', 'custom_message', 'event_group_created', 'event_group_imminent'])(
    '%s avec conversation → Conversation',
    (type) => {
      expect(resolveNotificationTarget(notif({
        notification_type: type,
        related_object_id: 'conv-1',
        related_object_type: 'conversation',
      }))).toEqual({ screen: 'Conversation', params: { conversationId: 'conv-1' } });
    },
  );
  it('new_message sans conversation → Messages', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'new_message' })))
      .toEqual({ screen: 'Messages' });
  });

  // ─── Exposants / salon ───
  it('exhibitor_appli_received → BoothManagement', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'exhibitor_appli_received',
      related_object_id: 'evt-1',
      related_object_type: 'event',
    }))).toEqual({ screen: 'BoothManagement', params: { eventId: 'evt-1' } });
  });
  it.each(['exhibitor_appli_accepted', 'exhibitor_appli_rejected', 'exhibitor_appli_waitlisted',
    'exhibitor_option_expired', 'exhibitor_booking_cancelled'])(
    '%s → MyBooth',
    (type) => {
      expect(resolveNotificationTarget(notif({ notification_type: type })))
        .toEqual({ screen: 'MyBooth' });
    },
  );

  // ─── Équipe / avis / légal ───
  it('event_team_invitation → MyTeamEvents', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'event_team_invitation' })))
      .toEqual({ screen: 'MyTeamEvents' });
  });
  it('feedback_request → EventDetails', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'feedback_request',
      extra_data: { event_id: 'evt-1' },
    }))).toEqual({ screen: 'EventDetails', params: { eventId: 'evt-1' } });
  });
  it('legal_update → Terms', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'legal_update' })))
      .toEqual({ screen: 'Terms' });
  });

  // ─── P2 : abonnement / facturation orga → Subscription ───
  it('usage_billing_update → Subscription', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'usage_billing_update' })))
      .toEqual({ screen: 'Subscription' });
  });
  it('payment_confirmation abonnement → Subscription', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'payment_confirmation',
      related_object_type: 'subscription_payment',
    }))).toEqual({ screen: 'Subscription' });
  });
  it('payment_confirmation billet → MyPayments', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'payment_confirmation',
      related_object_type: 'payment',
    }))).toEqual({ screen: 'MyPayments' });
  });

  // ─── P2 : discussion supprimée → inbox (pas la conversation morte) ───
  it('event_group_deleted → Messages', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'event_group_deleted',
      related_object_type: 'conversation', related_object_id: 'conv-dead',
    }))).toEqual({ screen: 'Messages' });
  });

  // ─── P2 : demande de mise en avant (admin) → fiche event ───
  it('feature_request → EventDetails', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'feature_request',
      related_object_id: 'evt-feat', related_object_type: 'event',
    }))).toEqual({ screen: 'EventDetails', params: { eventId: 'evt-feat' } });
  });
});

describe('resolveNotificationTarget — fallback générique', () => {
  it('type inconnu + event object → EventDetails (slug)', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'type_totalement_inconnu',
      event: { id: 'evt-uuid', slug: 'evt-slug' },
    }))).toEqual({ screen: 'EventDetails', params: { eventId: 'evt-slug' } });
  });

  it.each([
    ['event', 'obj-1', { screen: 'EventDetails', params: { eventId: 'obj-1' } }],
    ['registration', 'reg-2', { screen: 'RegistrationDetails', params: { registrationId: 'reg-2' } }],
    ['ticket', 'tk-3', { screen: 'QRCode', params: { ticketId: 'tk-3' } }],
    ['ticket_purchase', 'tk-4', { screen: 'QRCode', params: { ticketId: 'tk-4' } }],
    ['conversation', 'cv-5', { screen: 'Conversation', params: { conversationId: 'cv-5' } }],
    ['message', 'cv-6', { screen: 'Conversation', params: { conversationId: 'cv-6' } }],
  ])('fallback related_object_type=%s → écran attendu', (rot, id, expected) => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'inconnu',
      related_object_id: id,
      related_object_type: rot,
    }))).toEqual(expected);
  });

  it.each(['payment', 'payout', 'refund', 'subscription_payment'])(
    'fallback related_object_type=%s → MyTickets',
    (rot) => {
      expect(resolveNotificationTarget(notif({
        notification_type: 'inconnu',
        related_object_id: 'x',
        related_object_type: rot,
      }))).toEqual({ tab: 'MyTickets' });
    },
  );

  it('fallback via extra_data.event_id', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'inconnu',
      extra_data: { event_id: 'evt-x' },
    }))).toEqual({ screen: 'EventDetails', params: { eventId: 'evt-x' } });
  });

  it('fallback via extra_data.registration_id', () => {
    expect(resolveNotificationTarget(notif({
      notification_type: 'inconnu',
      extra_data: { registration_id: 'reg-x' },
    }))).toEqual({ screen: 'RegistrationDetails', params: { registrationId: 'reg-x' } });
  });

  it('rien d\'exploitable → null', () => {
    expect(resolveNotificationTarget(notif({ notification_type: 'inconnu' })))
      .toBeNull();
  });

  it('lit payload en priorité sur extra_data', () => {
    // meta = payload || extra_data || data
    expect(resolveNotificationTarget(notif({
      notification_type: 'inconnu',
      payload: { event_id: 'from-payload' },
      extra_data: { event_id: 'from-extra' },
    }))).toEqual({ screen: 'EventDetails', params: { eventId: 'from-payload' } });
  });
});
