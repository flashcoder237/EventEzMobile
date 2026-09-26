/**
 * Règle d'avatar de conversation.
 *
 * Bug d'origine : dans une conversation d'événement, le header affichait la
 * photo d'un invité arbitraire. La garde « groupe/event → jamais un
 * participant » existait, mais seulement dans l'inbox — le header, lui,
 * prenait `participants.find(p => p.id !== moi)`, donc le premier inscrit.
 *
 * La règle est maintenant partagée. Ces tests la verrouillent pour les deux
 * écrans à la fois.
 */
import { resolveConversationAvatar, isGroupOrEventConversation } from '../conversationAvatar';

jest.mock('../../api/config', () => ({
  getMediaUrl: (p?: string | null) =>
    p ? (p.startsWith('http') ? p : `https://cdn.test${p}`) : null,
}));

describe('resolveConversationAvatar — groupe / event', () => {
  it.each(['event', 'group'])(
    'utilise l’avatar de la conversation pour un type %s',
    (conversationType) => {
      expect(
        resolveConversationAvatar({
          conversationType,
          conversationAvatar: '/media/events/banner.jpg',
          participantAvatar: '/media/users/invite.jpg',
        }),
      ).toBe('https://cdn.test/media/events/banner.jpg');
    },
  );

  it.each(['event', 'group'])(
    'ne retombe JAMAIS sur la photo d’un participant (%s sans avatar)',
    (conversationType) => {
      // Le coeur du bug : mieux vaut les initiales du groupe qu'une identité
      // trompeuse empruntée à un invité.
      expect(
        resolveConversationAvatar({
          conversationType,
          conversationAvatar: null,
          participantAvatar: '/media/users/invite.jpg',
        }),
      ).toBeNull();
    },
  );
});

describe('resolveConversationAvatar — conversation directe', () => {
  it('utilise la photo de l’interlocuteur', () => {
    expect(
      resolveConversationAvatar({
        conversationType: 'direct',
        conversationAvatar: null,
        participantAvatar: '/media/users/alice.jpg',
      }),
    ).toBe('https://cdn.test/media/users/alice.jpg');
  });

  it('retombe sur l’avatar de conversation si le participant n’en a pas', () => {
    expect(
      resolveConversationAvatar({
        conversationType: 'direct',
        conversationAvatar: '/media/fallback.jpg',
        participantAvatar: null,
      }),
    ).toBe('https://cdn.test/media/fallback.jpg');
  });

  it('renvoie null quand il n’y a rien (→ initiales)', () => {
    expect(
      resolveConversationAvatar({
        conversationType: 'direct',
        conversationAvatar: null,
        participantAvatar: null,
      }),
    ).toBeNull();
  });

  it('traite un type inconnu/absent comme une conversation directe', () => {
    expect(
      resolveConversationAvatar({
        conversationType: undefined,
        conversationAvatar: null,
        participantAvatar: '/media/users/bob.jpg',
      }),
    ).toBe('https://cdn.test/media/users/bob.jpg');
  });
});

describe('isGroupOrEventConversation', () => {
  it.each([
    ['event', true],
    ['group', true],
    ['direct', false],
    [undefined, false],
    [null, false],
  ])('%s → %s', (type, expected) => {
    expect(isGroupOrEventConversation(type as string | null | undefined)).toBe(expected);
  });
});
