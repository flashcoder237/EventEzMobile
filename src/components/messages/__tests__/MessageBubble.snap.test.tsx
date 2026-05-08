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
