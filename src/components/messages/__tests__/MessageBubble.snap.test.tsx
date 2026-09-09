/**
 * Snapshot tests pour MessageBubble.
 *
 * Couvre :
 *  - own (mine) vs other
 *  - edited / deleted placeholders
 *  - avec attachment image
 *  - avec reactions
 *  - avec reply preview
 *  - grouped (avatar masque)
 *
 * formatMessageTime mocke pour stabiliser le snapshot
 * (toLocaleTimeString depend du locale et timezone runner CI).
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

// MessageBubble utilise useAlert() depuis 2026-04 : mock pour éviter le
// throw "useAlert must be used within an AlertProvider" dans les tests.
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
  const RN = require('react-native');
  return { Image: RN.Image };
});

// Stabilise l'heure affichee pour les snapshots
jest.mock('../../../lib/utils/messagingHelpers', () => {
  const actual = jest.requireActual('../../../lib/utils/messagingHelpers');
  return {
    ...actual,
    formatMessageTime: () => '14:30',
  };
});

// MessageStatusIcon -> stub pour eviter dependance icons
jest.mock('../MessageStatusIcon', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ status }: any) =>
      React.createElement(RN.Text, { 'data-status': status }, status),
  };
});

import MessageBubble from '../MessageBubble';

const baseMessage: Message = {
  id: 1,
  conversation: 'conv-1',
  sender: 42,
  sender_name: 'Alice Doe',
  sender_avatar: undefined,
  content: 'Bonjour ! Comment ca va ?',
  message_type: 'text',
  attachments: [],
  read_by: [],
  is_starred: false,
  is_edited: false,
  is_deleted: false,
  reactions: [],
  created_at: '2026-05-04T14:30:00Z',
};

const noop = () => {};

describe('MessageBubble snapshots', () => {
  it('renders other user message (peer)', () => {
    const tree = render(
      <MessageBubble message={baseMessage} isMine={false} onLongPress={noop} />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders own message (mine)', () => {
    const tree = render(
      <MessageBubble
        message={{ ...baseMessage, sender: 7, read_by: [42] }}
        isMine={true}
        otherUserId="42"
        onLongPress={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders grouped message (avatar masque)', () => {
    const tree = render(
      <MessageBubble
        message={baseMessage}
        isMine={false}
        isGrouped
        onLongPress={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders edited message with edited label', () => {
    const tree = render(
      <MessageBubble
        message={{
          ...baseMessage,
          is_edited: true,
          edited_at: '2026-05-04T14:31:00Z',
        }}
        isMine={false}
        onLongPress={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders deleted message placeholder', () => {
    const tree = render(
      <MessageBubble
        message={{
          ...baseMessage,
          content: '',
          is_deleted: true,
        }}
        isMine={false}
        onLongPress={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders message with image attachment', () => {
    const tree = render(
      <MessageBubble
        message={{
          ...baseMessage,
          content: 'Regarde ca',
          attachments: [
            {
              id: 99,
              file: 'https://test.local/media/img.jpg',
              file_name: 'img.jpg',
              file_size: 1024,
              mime_type: 'image/jpeg',
              attachment_type: 'image',
              uploaded_at: '2026-05-04T14:30:00Z',
            },
          ],
        }}
        isMine={false}
        onLongPress={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders message with reactions', () => {
    const tree = render(
      <MessageBubble
        message={{
          ...baseMessage,
          reactions: [
            { id: 1, user: 1, user_name: 'A', emoji: '❤️', created_at: '' },
            { id: 2, user: 2, user_name: 'B', emoji: '❤️', created_at: '' },
            { id: 3, user: 3, user_name: 'C', emoji: '😂', created_at: '' },
          ],
        }}
        isMine={false}
        onLongPress={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders message with reply preview', () => {
    const replyTo: Message = {
      ...baseMessage,
      id: 99,
      content: 'Message original cite',
      sender_name: 'Bob',
    };
    const tree = render(
      <MessageBubble
        message={{ ...baseMessage, content: 'Reponse au message' }}
        isMine={false}
        replyToMessage={replyTo}
        onLongPress={noop}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

// ─── Chaine de contrainte de LARGEUR ────────────────────────────────────────
// Bug recurrent, corrige a trois reprises : un message long s'affichait
// tronque (« Voila retestons » rendu « Voila »), alors que le contenu stocke
// etait COMPLET — le copier/coller restituait tout le message.
//
// La contrainte doit descendre sur TOUTE la chaine :
//   messageRow (width 100%)  ← la base contre laquelle le % est calcule
//     bubbleContainer (maxWidth 75%, flexShrink 1)
//       bubble (flexShrink 1, minWidth 0)
//         Text (flexShrink 1)
//
// `messageRow` etait le maillon manquant : sans largeur, elle se
// dimensionnait a son contenu, et « 75 % d'une largeur indeterminee » ne
// contraignait plus rien. Les `flexShrink` poses en dessous faisaient
// retrecir vers une borne qui n'existait pas.

describe('MessageBubble — contrainte de largeur', () => {
  const flatten = (style: any): any =>
    Array.isArray(style)
      ? style.filter(Boolean).reduce((acc, s) => ({ ...acc, ...flatten(s) }), {})
      : style || {};

  const longMessage = {
    ...baseMessage,
    content: 'Voila retestons ce message volontairement assez long pour depasser la largeur de la bulle',
  };

  it.each([
    ['mine', true],
    ['peer', false],
  ])('la ligne de message impose une largeur de reference (%s)', (_label, isMine) => {
    const tree: any = render(
      <MessageBubble message={longMessage} isMine={isMine} onLongPress={noop} />,
    ).toJSON();

    // La ligne porte flexDirection row / row-reverse.
    const row = tree.children.find((c: any) => {
      const s = flatten(c.props?.style);
      return s.flexDirection === 'row' || s.flexDirection === 'row-reverse';
    });
    expect(row).toBeTruthy();
    expect(flatten(row.props.style).width).toBe('100%');
  });

  it('le conteneur de bulle reste borne a 75 % et peut retrecir', () => {
    const tree: any = render(
      <MessageBubble message={longMessage} isMine onLongPress={noop} />,
    ).toJSON();

    const row = tree.children.find((c: any) => {
      const s = flatten(c.props?.style);
      return s.flexDirection === 'row' || s.flexDirection === 'row-reverse';
    });
    const container = flatten(row.children[0].props.style);

    expect(container.maxWidth).toBe('75%');
    expect(container.flexShrink).toBe(1);
  });

  it('le texte n\'est jamais tronque par numberOfLines', () => {
    const { getByText } = render(
      <MessageBubble message={longMessage} isMine onLongPress={noop} />,
    );
    // Le contenu doit etre rendu EN ENTIER, sans limite de lignes : c'est
    // ce que le copier/coller prouvait cote utilisateur.
    const node: any = getByText(longMessage.content);
    expect(node.props.numberOfLines).toBeUndefined();
  });
});
