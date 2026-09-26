/**
 * Le texte affiché est-il EXACTEMENT le texte reçu ?
 *
 * Bug rapporté : « Ok on reste encore » s'affiche « Ok on reste ». Six
 * correctifs de style successifs n'ont rien changé. Avant d'en tenter un
 * septième, ce test répond à une question qu'aucun n'avait vérifiée :
 * le composant rend-il la chaîne complète, ou en perd-il une partie ?
 *
 * Si ces tests PASSENT, la troncature est purement visuelle (moteur de
 * layout natif) et aucun test JS ne pourra la reproduire — il faut alors
 * chercher côté RN/Android, pas côté React.
 * Si un test ÉCHOUE, la perte est dans le code JS et on la tient enfin.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import type { Message } from '../../../types';

const lightColors = {
  primary: '#4F46E5',
  surface: '#FFFFFF',
  text: '#111827',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  gray900: '#111827',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: lightColors, isDark: false }),
}));

jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showAlert: jest.fn(),
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
    showConfirm: jest.fn(),
  }),
}));

jest.mock('expo-image', () => {
  const RN = jest.requireActual('react-native');
  return { Image: RN.Image };
});

jest.mock('../../../lib/utils/messagingHelpers', () => {
  const actual = jest.requireActual('../../../lib/utils/messagingHelpers');
  return { ...actual, formatMessageTime: () => '14:30' };
});

jest.mock('../MessageStatusIcon', () => {
  const RN = jest.requireActual('react-native');
  const React2 = jest.requireActual('react');
  return { __esModule: true, default: () => React2.createElement(RN.View) };
});

import MessageBubble from '../MessageBubble';

const make = (content: string): Message => ({
  id: 717,
  conversation: 'conv-1',
  sender: 42,
  sender_name: 'Cedric',
  sender_avatar: undefined,
  content,
  message_type: 'text',
  attachments: [],
  read_by: [],
  is_starred: false,
  is_edited: false,
  is_deleted: false,
  reactions: [],
  created_at: '2026-05-04T14:30:00Z',
});

/** Concatène tout le texte réellement rendu dans l'arbre. */
function renderedText(node: unknown): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(renderedText).join('');
  const el = node as { children?: unknown };
  return el.children ? renderedText(el.children) : '';
}

describe('MessageBubble — intégrité du texte rendu', () => {
  const noop = () => {};

  it.each([
    'Ok on reste encore',
    'Ok on reteste',
    'Connectez-vous',
    'un autre test',
  ])('rend « %s » en entier', (content) => {
    const tree = render(
      <MessageBubble message={make(content)} isMine onLongPress={noop} />,
    ).toJSON();

    expect(renderedText(tree)).toContain(content);
  });

  it('ne perd pas le dernier mot d’un message long', () => {
    const content =
      'Voici un message beaucoup plus long qui doit imperativement passer ' +
      'a la ligne plusieurs fois sans jamais perdre son dernier mot FIN';

    const tree = render(
      <MessageBubble message={make(content)} isMine onLongPress={noop} />,
    ).toJSON();

    const out = renderedText(tree);
    expect(out).toContain(content);
    expect(out).toContain('FIN');
  });

  it('préserve le texte quand il contient une URL (renderLinkified)', () => {
    // renderLinkified découpe la chaîne en tableau de fragments : c'est le
    // seul endroit du rendu qui manipule réellement le contenu.
    const content = 'Voir https://eventez.online/events et dis-moi FIN';

    const tree = render(
      <MessageBubble message={make(content)} isMine onLongPress={noop} />,
    ).toJSON();

    const out = renderedText(tree);
    expect(out).toContain('Voir ');
    expect(out).toContain('https://eventez.online/events');
    expect(out).toContain(' et dis-moi FIN');
  });
});
