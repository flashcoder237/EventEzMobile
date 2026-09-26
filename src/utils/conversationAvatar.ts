import { getMediaUrl } from '../api/config';

/**
 * Avatar a afficher pour une conversation.
 *
 * REGLE UNIQUE : une conversation groupe/event porte l'identite de
 * l'EVENEMENT (avatar derive de la banniere, fourni en secours par le
 * backend), JAMAIS la photo d'un participant. Une conversation directe porte
 * la photo de l'interlocuteur.
 *
 * Sans cette garde, un event dont l'avatar est vide retombait sur la photo
 * du premier participant trouve — soit la tete d'un invite arbitraire en
 * guise d'identite de groupe.
 *
 * Cette regle vivait en double (inbox + header de conversation) et n'avait
 * ete appliquee qu'a l'inbox : le header affichait donc encore un invite.
 * Elle est desormais ici, et les deux ecrans la consomment.
 *
 * @returns l'URL absolue de l'avatar, ou null pour retomber sur les initiales.
 */
export function resolveConversationAvatar(params: {
  conversationType?: string | null;
  conversationAvatar?: string | null;
  participantAvatar?: string | null;
}): string | null {
  const { conversationType, conversationAvatar, participantAvatar } = params;

  const isGroupOrEvent = conversationType === 'event' || conversationType === 'group';
  const groupAvatar = getMediaUrl(conversationAvatar) || null;

  if (isGroupOrEvent) {
    // Volontairement PAS de repli sur le participant : mieux vaut les
    // initiales du groupe qu'une identite trompeuse.
    return groupAvatar;
  }

  return getMediaUrl(participantAvatar) || groupAvatar;
}

/** True si la conversation porte une identite collective (groupe ou event). */
export function isGroupOrEventConversation(conversationType?: string | null): boolean {
  return conversationType === 'event' || conversationType === 'group';
}
