import type { Notification } from '../../types';

export type NotificationTarget =
  | { screen: string; params?: Record<string, any> }
  | { tab: string } // onglet du MainTabNavigator
  | null;

/**
 * Résout l'écran « action naturelle » d'une notification au clic.
 *
 * PRINCIPE (identique au web) : on résout d'abord par `notification_type`
 * (intention métier), PUIS on retombe sur `related_object_type`. L'ancien code
 * ouvrait EventDetails (public) dès qu'un event était attaché, même pour une
 * notif destinée à l'organisateur (avis, inscriptions, stock bas…).
 */
export function resolveNotificationTarget(n: Notification): NotificationTarget {
  const meta: Record<string, any> = (n as any).payload || n.extra_data || n.data || {};
  const objId = n.related_object_id;
  const eventObj = n.event && typeof n.event === 'object' ? n.event : null;
  const eventId = eventObj?.id || objId || meta.event_id || meta.event_slug;
  const eventNav = eventObj?.slug || eventObj?.id || objId || meta.event_slug || meta.event_id;
  const regId = meta.registration_id;

  switch (n.notification_type as string) {
    // ─── Modération ───
    case 'event_pending_moderation':
    case 'moderation_queue_reminder':
      return { screen: 'Moderation' };

    // ─── Événement renvoyé/refusé → ÉDITION (corriger puis re-soumettre).
    // EventEdit attend l'UUID (eventId), pas le slug. ───
    case 'event_changes_requested':
    case 'event_rejected':
      return eventId ? { screen: 'EventEdit', params: { eventId } } : null;

    // ─── Événement — vue ORGANISATEUR ───
    case 'event_validated':
    case 'event_update':
    case 'event_revalidation':
    case 'event_cancelled':
    case 'event_today':
      return eventId ? { screen: 'EventDetails', params: { eventId: eventNav } } : null;
    case 'event_low_stock':
    case 'new_registration':
    case 'follow_registered':
      return eventId ? { screen: 'EventRegistrations', params: { eventId } } : null;

    // ─── Inscription NON finalisée (participant) : « finalise ton inscription »
    // → reprise du paiement/inscription du user, PAS la vue organisateur.
    // On cible RegistrationDetails (qui expose le bouton payer si status=pending) ;
    // fallback sur l'onglet MyTickets si l'id d'inscription est absent. ───
    case 'abandoned_registration':
      return regId
        ? { screen: 'RegistrationDetails', params: { registrationId: regId } }
        : { tab: 'MyTickets' };
    case 'event_feedback':
      return eventId ? { screen: 'EventReviews', params: { eventId } } : null;

    // ─── Billets / paiements (participant) ───
    case 'registration_confirmation':
    case 'check_in_confirmation':
      return regId
        ? { screen: 'RegistrationDetails', params: { registrationId: regId } }
        : { tab: 'MyTickets' };
    // Reçus / factures côté payeur → écran des paiements (téléchargement facture).
    case 'payment_confirmation':
    case 'payment_failed':
    case 'invoice_ready':
    case 'usage_billing_update':
      return { screen: 'MyPayments' };
    case 'refund_processed':
      return { screen: 'RefundsList' };
    case 'ticket_transfer':
      return { tab: 'MyTickets' };
    case 'waitlist_position':
    case 'connections_at_event':
    case 'followed_organizer_new_event':
    case 'event_suggestion':
    case 'winback':
    case 'event_reminder':
      return eventNav ? { screen: 'EventDetails', params: { eventId: eventNav } } : null;

    // ─── Social ───
    case 'new_follower':
      return { screen: 'Connections' };

    // ─── Messagerie (dont conversations de groupe event) ───
    case 'new_message':
    case 'system_message':
    case 'custom_message':
    case 'event_group_created':
    case 'event_group_imminent':
      return n.related_object_type === 'conversation' && objId
        ? { screen: 'Conversation', params: { conversationId: objId } }
        : { screen: 'Messages' };

    // ─── Exposants / salon ───
    case 'exhibitor_appli_received':
      return eventId ? { screen: 'BoothManagement', params: { eventId } } : null;
    case 'exhibitor_appli_accepted':
    case 'exhibitor_appli_rejected':
    case 'exhibitor_appli_waitlisted':
    case 'exhibitor_option_expired':
    case 'exhibitor_booking_cancelled':
      return { screen: 'MyBooth' };

    // ─── Équipe événement ───
    // TeamInvitation exige un `token` (pas un id) → on ouvre la liste des events
    // où l'utilisateur est membre d'équipe, toujours navigable sans param.
    case 'event_team_invitation':
      return { screen: 'MyTeamEvents' };

    // ─── Demande d'avis (participant, post-event) ───
    case 'feedback_request':
      return eventNav ? { screen: 'EventDetails', params: { eventId: eventNav } } : null;

    case 'legal_update':
      return { screen: 'Terms' };
  }

  // ─── Fallback générique par objet ───
  if (eventObj) return { screen: 'EventDetails', params: { eventId: eventNav } };
  if (objId) {
    switch (n.related_object_type) {
      case 'event':
        return { screen: 'EventDetails', params: { eventId: objId } };
      case 'registration':
        return { screen: 'RegistrationDetails', params: { registrationId: objId } };
      case 'ticket':
      case 'ticket_purchase':
        return { screen: 'QRCode', params: { ticketId: objId } };
      case 'conversation':
      case 'message':
        return { screen: 'Conversation', params: { conversationId: objId } };
      case 'payment':
      case 'payout':
      case 'refund':
      case 'subscription_payment':
        return { tab: 'MyTickets' };
    }
  }
  if (meta.event_id) return { screen: 'EventDetails', params: { eventId: meta.event_id } };
  if (meta.registration_id) return { screen: 'RegistrationDetails', params: { registrationId: meta.registration_id } };
  return null;
}
