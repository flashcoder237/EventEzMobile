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
  // `related_object_id` n'est un id d'ÉVÉNEMENT que si l'objet lié EST un
  // événement. Avant, un rappel/une annulation rattaché(e) à une INSCRIPTION
  // (ou à un paiement, une conversation…) ouvrait la fiche avec cet id →
  // 404 « événement introuvable » au tap de la notification.
  const relType = n.related_object_type || '';
  const objEventId = !relType || relType === 'event' ? objId : null;
  const eventId = eventObj?.id || meta.event_id || objEventId || meta.event_slug;
  const eventNav = eventObj?.slug || eventObj?.id || meta.event_slug || meta.event_id || objEventId;
  const regId = meta.registration_id || (relType === 'registration' ? objId : null);
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
      return eventId ? { screen: 'EventDetails', params: { eventId: eventNav } } : null;
    // S2 — « C'est aujourd'hui » / rappel : quand l'inscription est connue,
    // le billet vient à vous (QR à un tap, luminosité gérée par l'écran).
    case 'event_today':
      if (regId) return { screen: 'RegistrationDetails', params: { registrationId: regId } };
      return eventId ? { screen: 'EventDetails', params: { eventId: eventNav } } : null;
    // S3 — « Vous êtes entré » → le billet, qui passe en mode « sur place ».
    case 'checkin_welcome':
      return regId
        ? { screen: 'RegistrationDetails', params: { registrationId: regId } }
        : { tab: 'MyTickets' };
    // S12 — « Il y a un an » → la carte souvenir de l'événement.
    case 'memory_anniversary': {
      const next = meta.next_edition && typeof meta.next_edition === 'object' ? meta.next_edition : null;
      return {
        screen: 'Memories',
        params: {
          eventId: meta.event_id ? String(meta.event_id) : undefined,
          ...(next ? { nextSlug: String(next.slug || next.event_id || ''), nextTitle: String(next.title || '') } : null),
        },
      };
    }
    // S11 — L'année EventEz.
    case 'year_in_review':
      return { screen: 'YearInReview', params: { year: meta.year ? Number(meta.year) : undefined } };
    // « L'événement est en cours » → page détail en ouvrant DIRECTEMENT la
    // section visio (initialTab), pour que l'utilisateur tombe sur le bouton
    // « Rejoindre » sans le chercher.
    case 'event_live':
      return eventId
        ? { screen: 'EventDetails', params: { eventId: eventNav, initialTab: 'virtual' } }
        : null;
    // O1/O2/O3 — jalons organisateur (premier inscrit, palier, complet) →
    // gestion des inscrits de l'événement.
    case 'organizer_milestone':
      return meta.event_id || eventId
        ? { screen: 'EventRegistrations', params: { eventId: String(meta.event_id || eventId) } }
        : { screen: 'MyEvents' };
    // O13 — le bilan d'un événement terminé est prêt.
    case 'event_recap_ready':
      return meta.event_id || eventId
        ? { screen: 'EventRecap', params: { eventId: String(meta.event_id || eventId) } }
        : { screen: 'MyEvents' };
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
      // S8 — « Vous y étiez » : les personnes réellement scannées ouvrent la
      // carte souvenir (note en un geste) au lieu de la page des avis.
      if (meta.kind === 'attended') {
        return { screen: 'Memories', params: { attended: String(meta.event_id || eventId || '') } };
      }
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
    // Retrait organisateur (demande reçue / en cours / versé / échec) →
    // portefeuille, seul écran qui montre le solde et l'historique des
    // retraits. Sans ce cas, la notification retombait sur l'écran par défaut
    // et l'organisateur devait retrouver son retrait à la main.
    case 'payout_status':
      return { screen: 'Wallet' };
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
    // R2 V9 — place gardée 15 min : la fiche affiche le compte à rebours réel.
    case 'waitlist_available':
      if (!eventNav) return null;
      return meta.kind === 'seat_held' && meta.hold_expires_at
        ? { screen: 'EventDetails', params: { eventId: eventNav, seatHeldUntil: String(meta.hold_expires_at) } }
        : { screen: 'EventDetails', params: { eventId: eventNav } };
    // R2 V8 — « Karim est arrivé · Lui écrire » → conversation directe.
    case 'connection_arrived':
      return meta.connection_user_id
        ? {
            screen: 'Conversation',
            params: {
              userId: String(meta.connection_user_id),
              ...(meta.connection_name ? { userName: String(meta.connection_name) } : null),
            },
          }
        : { screen: 'Messages' };
    case 'waitlist_position':
    case 'connections_at_event':
    case 'followed_organizer_new_event':
    case 'event_suggestion':
    case 'winback':
      return eventNav ? { screen: 'EventDetails', params: { eventId: eventNav } } : null;
    case 'event_reminder':
      if (regId) return { screen: 'RegistrationDetails', params: { registrationId: regId } };
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

    // ─── Scan de badge : on informe le VISITEUR, pas l'exposant ───
    // Sans ce cas, le repli lit `meta.event_id` (que la notification
    // fournit) et ouvre la page de l'événement : la personne qui vient
    // d'apprendre qu'une entreprise détient ses coordonnées atterrissait
    // sur une billetterie, pas sur le moyen de les retirer.
    case 'exhibitor_lead_captured':
      return { screen: 'MyDataAtExhibitors' };

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
