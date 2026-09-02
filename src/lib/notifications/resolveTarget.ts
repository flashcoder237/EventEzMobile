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
  // session_id : soit dans extra_data, soit related_object_type='session'.
  const sessionId = meta.session_id || (n.related_object_type === 'session' ? objId : null);

  switch (n.notification_type as string) {
    // ─── Modération (modérateur) → file de modération (action = valider) ───
    case 'event_pending_moderation':
    case 'moderation_queue_reminder':
    case 'event_revalidation':
      return { screen: 'Moderation' };

    // ─── Événement renvoyé/refusé → ÉDITION (corriger puis re-soumettre).
    // EventEdit attend l'UUID (eventId), pas le slug. ───
    case 'event_changes_requested':
    case 'event_rejected':
      return eventId ? { screen: 'EventEdit', params: { eventId } } : null;

    // ─── Événement — vue détail (organisateur ou participant, écran neutre) ───
    case 'event_validated':
    case 'event_update':
    case 'event_cancelled':
    case 'event_today':
      return eventId ? { screen: 'EventDetails', params: { eventId: eventNav } } : null;
    // « L'événement est en cours » → page détail en ouvrant DIRECTEMENT la
    // section visio (initialTab), pour que l'utilisateur tombe sur le bouton
    // « Rejoindre » sans le chercher.
    case 'event_live':
      return eventId
        ? { screen: 'EventDetails', params: { eventId: eventNav, initialTab: 'virtual' } }
        : null;
    // new_registration = notif ORGANISATEUR (« nouvel inscrit ») → gestion des inscrits.
    case 'new_registration':
      return eventId ? { screen: 'EventRegistrations', params: { eventId } } : null;

    // event_low_stock (« il ne reste que N places, réserve ! ») et
    // follow_registered (« une personne suivie s'est inscrite ») sont des notifs
    // PARTICIPANT/social → fiche event publique, PAS la gestion des inscrits.
    case 'event_low_stock':
    case 'follow_registered':
      return eventNav ? { screen: 'EventDetails', params: { eventId: eventNav } } : null;

    // ─── Inscription NON finalisée (participant) : « finalise ton inscription »
    // → écran de PAIEMENT directement (reprise du paiement), PAS la vue
    // organisateur ni RegistrationDetails (qui n'a qu'un bouton « j'ai déjà
    // payé », pas de « payer maintenant »). Payment(registrationId) charge
    // l'inscription et présente ce qu'il reste à régler. Fallback MyTickets. ───
    case 'abandoned_registration':
      return regId
        ? { screen: 'Payment', params: { registrationId: regId } }
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
    // EXCEPTION : les paiements d'ABONNEMENT (related_object_type=
    // 'subscription_payment') et la facturation d'usage concernent l'ORGANISATEUR
    // → écran Abonnement, pas les reçus participant.
    case 'usage_billing_update':
      return { screen: 'Subscription' };
    case 'payment_confirmation':
    case 'payment_failed':
    case 'invoice_ready':
      if (n.related_object_type === 'subscription_payment') return { screen: 'Subscription' };
      return { screen: 'MyPayments' };
    case 'refund_processed':
      return { screen: 'RefundsList' };
    case 'ticket_transfer':
      return { tab: 'MyTickets' };

    // ─── Invitation à un événement (participant) → écran Invitations (onglet
    // reçues) pour accepter/décliner. ───
    case 'event_invitation':
      // Si le token est dispo (posé dans extra_data à l'émission), on ouvre
      // DIRECTEMENT le RSVP — parité avec le web. Sinon la liste des invitations.
      return meta.invitation_token
        ? { screen: 'WeddingRsvp', params: { token: String(meta.invitation_token) } }
        : { screen: 'Invitations' };

    // ─── Récompenses / programme. Ces 3 types partaient en push SANS cible →
    // taper la notif ne faisait RIEN. Les écrans existent. ───
    case 'referral_conversion':
      return { screen: 'Referrals' };
    case 'gamification_reward':
      return { screen: 'Gamification' };
    case 'pioneer_granted':
      return { screen: 'Subscription' };
    case 'waitlist_position':
    case 'connections_at_event':
    case 'followed_organizer_new_event':
    case 'event_suggestion':
    case 'winback':
    case 'event_reminder':
      return eventNav ? { screen: 'EventDetails', params: { eventId: eventNav } } : null;

    // ─── Social ───
    // new_follower est surchargé : « X vous suit » (user→user, related=user) →
    // Connections ; « X suit votre événement » (related=event) → fiche event.
    case 'new_follower':
      if (n.related_object_type === 'event' && eventNav) {
        return { screen: 'EventDetails', params: { eventId: eventNav } };
      }
      return { screen: 'Connections' };

    // ─── Messagerie (dont conversations de groupe event) ───
    case 'new_message':
    case 'system_message':
    case 'custom_message':
    case 'event_group_created':
    case 'event_group_imminent':
      // Message signalé (modérateur) → hub de modération, pas l'inbox perso.
      if (n.related_object_type === 'message_report') return { screen: 'Moderation' };
      return n.related_object_type === 'conversation' && objId
        ? { screen: 'Conversation', params: { conversationId: objId } }
        : { screen: 'Messages' };

    // ─── Exposants / salon ───
    // related_object_id = id de la CANDIDATURE, pas de l'event → on prend
    // meta.event_id en priorité pour BoothManagement (qui attend l'event id).
    case 'exhibitor_appli_received': {
      const boothEventId = meta.event_id || (n.related_object_type === 'event' ? objId : null);
      return boothEventId ? { screen: 'BoothManagement', params: { eventId: boothEventId } } : null;
    }
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

    // ─── Rappel de SESSION (participant) → détail de la session ───
    case 'session_reminder':
      return sessionId
        ? { screen: 'SessionDetails', params: { sessionId } }
        : (eventNav ? { screen: 'EventDetails', params: { eventId: eventNav } } : null);

    // ─── Demande d'avis (participant) : sur une SESSION si session_id présent,
    // sinon sur l'ÉVÉNEMENT (post-event). ───
    case 'feedback_request':
      if (sessionId) return { screen: 'SessionDetails', params: { sessionId } };
      return eventNav ? { screen: 'EventDetails', params: { eventId: eventNav } } : null;

    // ─── Rappel de vérification de profil (organisateur) → écran Vérification ───
    case 'verification_reminder':
      return { screen: 'Verification' };

    // ─── Discussion de groupe SUPPRIMÉE → inbox (surtout pas la conversation
    // morte, qui donnerait un écran vide/erreur). ───
    case 'event_group_deleted':
      return { screen: 'Messages' };

    // ─── Demande de mise en avant (admin) → fiche de l'event concerné, que
    // l'admin peut consulter pour décider. ───
    case 'feature_request':
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
